import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  Button,
  Card,
  Chip,
  HelperText,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput,
} from './ui/Paper';
import {
  VictoryAxis,
  VictoryChart,
  VictoryLine,
  VictoryScatter,
  VictoryTheme,
} from 'victory-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import {
  CashFlowForecast,
  CashFlowSimulationResult,
  ErpService,
  ForecastSimulationScenario,
} from '../services/erpService';
import { formatCurrency } from '../utils/currency';
import { useResponsive } from '../hooks/useResponsive';
import {
  countRiskDays,
  ForecastHorizon,
  formatForecastDateLabel,
  parseNumericInput,
  sanitizeScenarios,
} from '../utils/forecast/helpers';

interface ScenarioFormState {
  scenarioName: string;
  receivableDelayInDays: string;
  payableMultiplier: string;
}

const horizonOptions: ForecastHorizon[] = [30, 60, 90];
const PROJECTION_DAYS_PER_PAGE = 10;

const createDefaultScenarios = (): ScenarioFormState[] => [
  {
    scenarioName: 'Baseline',
    receivableDelayInDays: '0',
    payableMultiplier: '1',
  },
  {
    scenarioName: 'Stress Test',
    receivableDelayInDays: '7',
    payableMultiplier: '1.2',
  },
];

export function Forecast() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { client, isAuthenticated, loading: authLoading, currency } = useAuth();
  const { width, isCompact, isTablet, contentPadding } = useResponsive();
  const erpService = useMemo(() => new ErpService(client), [client]);

  const [horizon, setHorizon] = useState<ForecastHorizon>(30);
  const [balanceInput, setBalanceInput] = useState('0');
  const [forecast, setForecast] = useState<CashFlowForecast | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [projectionPage, setProjectionPage] = useState(1);

  const [scenarios, setScenarios] = useState<ScenarioFormState[]>(createDefaultScenarios);
  const [simulationResults, setSimulationResults] = useState<CashFlowSimulationResult[]>([]);
  const [runningSimulation, setRunningSimulation] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [scenariosVisible, setScenariosVisible] = useState(false);

  const runForecast = async () => {
    const currentBalance = parseNumericInput(balanceInput);
    if (currentBalance === null) {
      setForecastError(t('Current balance is invalid.'));
      return;
    }

    setLoadingForecast(true);
    setForecastError(null);

    const response = await erpService.getCashFlowForecast(horizon, currentBalance);
    if (response.ok && response.data) {
      setForecast(response.data);
      setProjectionPage(1);
    } else {
      setForecastError(response.error ?? t('Unable to load cash flow forecast.'));
      setForecast(null);
      setProjectionPage(1);
    }

    setLoadingForecast(false);
  };

  const updateScenario = (index: number, updates: Partial<ScenarioFormState>) => {
    setScenarios((prev) => prev.map((scenario, i) => (i === index ? { ...scenario, ...updates } : scenario)));
  };

  const addScenario = () => {
    setScenarios((prev) => [
      ...prev,
      {
        scenarioName: `Scenario ${prev.length + 1}`,
        receivableDelayInDays: '0',
        payableMultiplier: '1',
      },
    ]);
  };

  const removeScenario = (index: number) => {
    setScenarios((prev) => prev.filter((_, i) => i !== index));
  };

  const runSimulation = async () => {
    const currentBalance = parseNumericInput(balanceInput);
    if (currentBalance === null) {
      setSimulationError(t('Current balance is invalid.'));
      return;
    }

    const mappedScenarios: ForecastSimulationScenario[] = [];
    for (const scenario of scenarios) {
      const delay = parseNumericInput(scenario.receivableDelayInDays);
      const multiplier = parseNumericInput(scenario.payableMultiplier);
      if (delay === null || delay < 0) {
        setSimulationError(t('Receivable delay must be zero or positive.'));
        return;
      }
      if (multiplier === null || multiplier <= 0) {
        setSimulationError(t('Payable multiplier must be greater than zero.'));
        return;
      }
      mappedScenarios.push({
        scenarioName: scenario.scenarioName,
        receivableDelayInDays: Math.floor(delay),
        payableMultiplier: multiplier,
      });
    }

    const sanitized = sanitizeScenarios(mappedScenarios);
    if (sanitized.length < 2) {
      setSimulationError(t('At least two scenarios are required.'));
      return;
    }

    setRunningSimulation(true);
    setSimulationError(null);

    const response = await erpService.runCashFlowSimulation({
      horizonInDays: horizon,
      currentBalance,
      scenarios: sanitized,
    });

    if (response.ok && response.data) {
      setSimulationResults(response.data);
      setScenariosVisible(false);
    } else {
      setSimulationError(response.error ?? t('Unable to run simulation.'));
      setSimulationResults([]);
    }

    setRunningSimulation(false);
  };

  const riskDays = countRiskDays(forecast);
  const finalBalance = forecast?.finalProjectedBalance ?? 0;
  const projection = forecast?.dailyProjection ?? [];
  const projectionPageCount = Math.max(1, Math.ceil(projection.length / PROJECTION_DAYS_PER_PAGE));
  const currentProjectionPage = Math.min(projectionPage, projectionPageCount);
  const projectionStart = (currentProjectionPage - 1) * PROJECTION_DAYS_PER_PAGE;
  const pagedProjection = projection.slice(projectionStart, projectionStart + PROJECTION_DAYS_PER_PAGE);
  const projectionRows = useMemo(() => {
    const rows: Array<typeof pagedProjection> = [];
    for (let i = 0; i < pagedProjection.length; i += 2) {
      rows.push(pagedProjection.slice(i, i + 2));
    }
    return rows;
  }, [pagedProjection]);

  const chartWidth = Math.min(Math.max(width - contentPadding * 2 - 28, 280), isTablet ? 720 : 460);
  const cashFlowSeries = useMemo(
    () =>
      projection.map((day, index) => ({
        x: index + 1,
        balance: day.projectedBalance,
        receivable: day.accountsReceivable,
        payable: day.accountsPayable,
      })),
    [projection],
  );

  const canPrevPage = currentProjectionPage > 1;
  const canNextPage = currentProjectionPage < projectionPageCount;

  useEffect(() => {
    if (projectionPage > projectionPageCount) {
      setProjectionPage(projectionPageCount);
    }
  }, [projectionPage, projectionPageCount]);

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
        <View style={[styles.content, { padding: contentPadding }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
              {t('CASHFLOW FORECAST')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}>
              {t('Project receivables, payables and balance risk days')}
            </Text>
            <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
          </View>

          {!isAuthenticated && !authLoading && (
            <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
              <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
                {t('Authenticate to run forecasts and simulations.')}
              </Text>
            </View>
          )}

          <Card mode="outlined" style={[styles.configCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
            <Card.Content style={styles.configCardContent}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Forecast Configuration')}</Text>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Horizon')}</Text>
              <View style={[styles.horizonRow, isCompact && styles.horizonRowCompact]}>
                {horizonOptions.map((option) => {
                  const isSelected = horizon === option;
                  return (
                    <Chip
                      key={option}
                      selected={isSelected}
                      showSelectedCheck={false}
                      icon={
                        isSelected
                          ? ({ size }) => (
                              <Feather name="check" size={Math.max(12, size - 2)} color={colors.neonGreen} />
                            )
                          : undefined
                      }
                      onPress={() => setHorizon(option)}
                      style={[
                        styles.horizonChip,
                        {
                          backgroundColor: isSelected ? colors.primaryPurple : colors.cardBgTo,
                          borderColor: isSelected ? colors.primaryPurple : colors.cardBorder,
                        },
                      ]}
                      textStyle={{ color: isSelected ? colors.neonGreen : colors.textSecondary }}
                    >
                      {t('{value} days', { value: option })}
                    </Chip>
                  );
                })}
              </View>

              <TextInput
                mode="outlined"
                label={t('Current Balance')}
                value={balanceInput}
                onChangeText={setBalanceInput}
                keyboardType="numeric"
                style={[styles.balanceInput, { backgroundColor: colors.inputBgFrom }]}
              />

              <Button
                mode="contained"
                onPress={runForecast}
                loading={loadingForecast}
                disabled={loadingForecast || !isAuthenticated || authLoading}
                buttonColor={colors.primaryPurple}
                textColor={colors.neonGreen}
                icon={({ size }) => <Feather name="activity" size={size} color={colors.neonGreen} />}
                style={styles.forecastButton}
              >
                {t('Run Forecast')}
              </Button>
              <HelperText type="error" visible={Boolean(forecastError)}>
                {forecastError}
              </HelperText>
            </Card.Content>
          </Card>

          {forecast && (
            <>
              <View style={[styles.statsRow, isCompact && styles.statsRowCompact]}>
                <Card mode="outlined" style={[styles.statCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                  <Card.Content>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('Current Balance')}</Text>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {formatCurrency(forecast.currentBalance, currency)}
                    </Text>
                  </Card.Content>
                </Card>
                <Card mode="outlined" style={[styles.statCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                  <Card.Content>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('Final Projection')}</Text>
                    <Text style={[styles.statValue, { color: finalBalance < 0 ? colors.accentOrange : colors.neonGreen }]}>
                      {formatCurrency(finalBalance, currency)}
                    </Text>
                  </Card.Content>
                </Card>
                <Card mode="outlined" style={[styles.statCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                  <Card.Content>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('Risk Days')}</Text>
                    <Text style={[styles.statValue, { color: riskDays > 0 ? colors.accentOrange : colors.neonGreen }]}>
                      {riskDays}
                    </Text>
                  </Card.Content>
                </Card>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Cash Flow Graph')}</Text>
              <Card mode="outlined" style={[styles.chartCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                <Card.Content style={styles.chartContent}>
                  <VictoryChart width={chartWidth} height={250} theme={VictoryTheme.material}>
                    <VictoryAxis
                      style={{
                        axis: { stroke: colors.cardBorder },
                        tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                        grid: { stroke: `${colors.cardBorder}35` },
                      }}
                    />
                    <VictoryAxis
                      dependentAxis
                      style={{
                        axis: { stroke: colors.cardBorder },
                        tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                        grid: { stroke: `${colors.cardBorder}35` },
                      }}
                    />
                    <VictoryLine data={cashFlowSeries} x="x" y="balance" style={{ data: { stroke: colors.neonGreen, strokeWidth: 2.8 } }} />
                    <VictoryLine
                      data={cashFlowSeries}
                      x="x"
                      y="receivable"
                      style={{ data: { stroke: colors.primaryPurple, strokeWidth: 2, strokeDasharray: '5,4' } }}
                    />
                    <VictoryLine
                      data={cashFlowSeries}
                      x="x"
                      y="payable"
                      style={{ data: { stroke: colors.accentOrange, strokeWidth: 2, strokeDasharray: '5,4' } }}
                    />
                    <VictoryScatter data={cashFlowSeries} x="x" y="balance" size={2} style={{ data: { fill: colors.neonGreen } }} />
                  </VictoryChart>
                  <View style={[styles.chartLegend, isCompact && styles.chartLegendCompact]}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.neonGreen }]} />
                      <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('Bal')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.primaryPurple }]} />
                      <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('Rec')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.accentOrange }]} />
                      <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('Pay')}</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>

              <View style={[styles.projectionHeader, isCompact && styles.projectionHeaderCompact]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Daily Projection')}</Text>
                <View style={styles.paginationMeta}>
                  <Text style={[styles.pageLabel, { color: colors.textSecondary }]}>
                    {t('Page {page}', { page: `${currentProjectionPage}/${projectionPageCount}` })}
                  </Text>
                  <View style={styles.paginationActions}>
                    <Button
                      mode="outlined"
                      onPress={() => setProjectionPage((prev) => Math.max(1, prev - 1))}
                      disabled={!canPrevPage}
                      textColor={colors.textSecondary}
                      style={[styles.paginationButton, { borderColor: colors.cardBorder }]}
                      contentStyle={styles.paginationButtonContent}
                    >
                      {t('Prev')}
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => setProjectionPage((prev) => Math.min(projectionPageCount, prev + 1))}
                      disabled={!canNextPage}
                      textColor={colors.textSecondary}
                      style={[styles.paginationButton, { borderColor: colors.cardBorder }]}
                      contentStyle={styles.paginationButtonContent}
                    >
                      {t('Next')}
                    </Button>
                  </View>
                </View>
              </View>

              <Card mode="outlined" style={[styles.projectionCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                <Card.Content style={styles.projectionContent}>
                  {projectionRows.length > 0 ? (
                    projectionRows.map((row, rowIndex) => (
                      <View key={`projection-row-${rowIndex}`} style={styles.dayRowPair}>
                        {row.map((day) => (
                          <View
                            key={`${day.date}-${day.projectedBalance}`}
                            style={[
                              styles.dayRowCard,
                              {
                                borderColor: colors.cardBorder,
                                backgroundColor: day.isRiskDay ? `${colors.accentOrange}10` : colors.cardBgTo,
                              },
                            ]}
                          >
                            <View style={styles.dayRowHeader}>
                              <Text style={[styles.dayDate, { color: colors.textPrimary }]}>
                                {formatForecastDateLabel(day.date)}
                              </Text>
                              {day.isRiskDay && (
                                <Chip compact style={{ backgroundColor: `${colors.accentOrange}20` }} textStyle={{ color: colors.accentOrange }}>
                                  {t('Risk')}
                                </Chip>
                              )}
                            </View>
                            <View style={styles.dayAmounts}>
                              <Text style={[styles.dayMeta, { color: colors.textSecondary }]}>
                                {t('Rec')}: {formatCurrency(day.accountsReceivable, currency)}
                              </Text>
                              <Text style={[styles.dayMeta, { color: colors.textSecondary }]}>
                                {t('Pay')}: {formatCurrency(day.accountsPayable, currency)}
                              </Text>
                              <Text style={[styles.dayMeta, { color: day.projectedBalance < 0 ? colors.accentOrange : colors.neonGreen }]}>
                                {t('Bal')}: {formatCurrency(day.projectedBalance, currency)}
                              </Text>
                            </View>
                          </View>
                        ))}
                        {row.length === 1 ? <View style={styles.dayRowSpacer} /> : null}
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.dayMeta, { color: colors.textSecondary }]}>
                      {t('No projection data available.')}
                    </Text>
                  )}
                </Card.Content>
              </Card>
            </>
          )}

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Simulation Scenarios')}</Text>
          <Card mode="outlined" style={[styles.configCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
            <Card.Content style={styles.scenarioSummaryContent}>
              <Text style={[styles.scenarioSummaryText, { color: colors.textSecondary }]}>
                {t('{count} scenarios configured', { count: scenarios.length })}
              </Text>
              <Button
                mode="outlined"
                onPress={() => setScenariosVisible(true)}
                textColor={colors.textSecondary}
                icon={({ size }) => <Feather name="sliders" size={size} color={colors.textSecondary} />}
                style={[styles.actionButton, { borderColor: colors.cardBorder }]}
              >
                {t('Open Scenarios')}
              </Button>
              <HelperText type="error" visible={Boolean(simulationError)}>
                {simulationError}
              </HelperText>
            </Card.Content>
          </Card>

          {simulationResults.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Simulation Results')}</Text>
              <View style={styles.resultList}>
                {simulationResults.map((result) => (
                  <Card
                    key={result.scenarioName}
                    mode="outlined"
                    style={[styles.resultCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}
                  >
                    <Card.Content style={styles.resultCardContent}>
                      <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{result.scenarioName}</Text>
                      <Text style={[styles.resultMeta, { color: colors.textSecondary }]}>
                        {t('Final')}: {formatCurrency(result.finalProjectedBalance, currency)}
                      </Text>
                      <Text style={[styles.resultMeta, { color: result.impact < 0 ? colors.accentOrange : colors.neonGreen }]}>
                        {t('Impact')}: {formatCurrency(result.impact, currency)}
                      </Text>
                      <Text style={[styles.resultMeta, { color: colors.textSecondary }]}>
                        {t('Risk Days')}: {result.riskDays.length}
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={scenariosVisible}
          onDismiss={() => setScenariosVisible(false)}
          contentContainerStyle={[
            styles.modalCard,
            { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('Simulation Scenarios')}</Text>
            <IconButton
              icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
              onPress={() => setScenariosVisible(false)}
              size={18}
              style={[styles.modalClose, { borderColor: colors.cardBorder }]}
            />
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            {scenarios.map((scenario, index) => (
              <View key={`${scenario.scenarioName}-${index}`} style={[styles.scenarioCard, { borderColor: colors.cardBorder }]}>
                <View style={styles.scenarioHeader}>
                  <Text style={[styles.scenarioTitle, { color: colors.textPrimary }]}>{t('Scenario {value}', { value: index + 1 })}</Text>
                  {scenarios.length > 2 && (
                    <Button mode="text" onPress={() => removeScenario(index)} textColor={colors.accentOrange}>
                      {t('Remove')}
                    </Button>
                  )}
                </View>
                <TextInput
                  mode="outlined"
                  label={t('Scenario Name')}
                  value={scenario.scenarioName}
                  onChangeText={(value) => updateScenario(index, { scenarioName: value })}
                  style={[styles.input, { backgroundColor: colors.inputBgFrom }]}
                />
                <TextInput
                  mode="outlined"
                  label={t('Receivable Delay (days)')}
                  value={scenario.receivableDelayInDays}
                  onChangeText={(value) => updateScenario(index, { receivableDelayInDays: value })}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: colors.inputBgFrom }]}
                />
                <TextInput
                  mode="outlined"
                  label={t('Payable Multiplier')}
                  value={scenario.payableMultiplier}
                  onChangeText={(value) => updateScenario(index, { payableMultiplier: value })}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: colors.inputBgFrom }]}
                />
              </View>
            ))}
          </ScrollView>

          <View style={[styles.scenarioActions, isCompact && styles.scenarioActionsCompact]}>
            <Button
              mode="outlined"
              onPress={addScenario}
              textColor={colors.textSecondary}
              icon={({ size }) => <Feather name="plus-circle" size={size} color={colors.textSecondary} />}
              style={[styles.actionButton, { borderColor: colors.cardBorder }]}
            >
              {t('Add Scenario')}
            </Button>
            <Button
              mode="contained"
              onPress={runSimulation}
              loading={runningSimulation}
              disabled={runningSimulation || !isAuthenticated || authLoading}
              buttonColor={colors.primaryPurple}
              textColor={colors.neonGreen}
              icon={({ size }) => <Feather name="play" size={size} color={colors.neonGreen} />}
              style={styles.actionButton}
            >
              {t('Run Simulation')}
            </Button>
          </View>

          <HelperText type="error" visible={Boolean(simulationError)}>
            {simulationError}
          </HelperText>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    letterSpacing: 1,
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 22,
    letterSpacing: 1.4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  subtitleCompact: {
    fontSize: 12,
  },
  headerLine: {
    height: 4,
    width: 140,
    borderRadius: 2,
  },
  banner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 12,
  },
  configCard: {
    borderRadius: 10,
    marginBottom: 16,
  },
  configCardContent: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  horizonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  horizonRowCompact: {
    gap: 10,
  },
  horizonChip: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  balanceInput: {
    marginTop: 8,
  },
  forecastButton: {
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  statsRowCompact: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    minWidth: 170,
    borderRadius: 10,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  chartCard: {
    borderRadius: 10,
    marginBottom: 12,
  },
  chartContent: {
    alignItems: 'center',
    gap: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  chartLegendCompact: {
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  projectionHeader: {
    marginTop: 4,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  projectionHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  paginationMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  pageLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  paginationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paginationButton: {
    borderRadius: 10,
    borderWidth: 1,
  },
  paginationButtonContent: {
    height: 36,
  },
  projectionCard: {
    borderRadius: 10,
    marginBottom: 18,
  },
  projectionContent: {
    gap: 8,
  },
  dayRowPair: {
    flexDirection: 'row',
    gap: 8,
  },
  dayRowCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  dayRowSpacer: {
    flex: 1,
  },
  dayRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayAmounts: {
    gap: 2,
  },
  dayMeta: {
    fontSize: 12,
  },
  scenarioSummaryContent: {
    gap: 6,
  },
  scenarioSummaryText: {
    fontSize: 12,
  },
  scenarioCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scenarioTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    marginTop: 2,
  },
  scenarioActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  scenarioActionsCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  actionButton: {
    borderRadius: 8,
  },
  resultList: {
    gap: 10,
    marginBottom: 24,
  },
  resultCard: {
    borderRadius: 10,
  },
  resultCardContent: {
    gap: 2,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  resultMeta: {
    fontSize: 12,
  },
  modalCard: {
    width: '92%',
    maxWidth: 760,
    maxHeight: '88%',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  modalClose: {
    borderWidth: 1,
    borderRadius: 12,
  },
  modalScroll: {
    flexGrow: 0,
    maxHeight: 420,
  },
  modalScrollContent: {
    gap: 8,
    paddingBottom: 6,
  },
});
