import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  Button,
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
import { SegmentedControl } from './SegmentedControl';
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

interface ScenarioValidationPreview {
  sanitized: ForecastSimulationScenario[];
  fieldErrors: Record<number, string>;
  firstError: string | null;
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
  const [balanceInput, setBalanceInput] = useState('');
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
    const trimmed = balanceInput.trim();
    const currentBalance = trimmed ? parseNumericInput(trimmed) : null;
    if (trimmed && currentBalance === null) {
      setForecastError(t('Current balance is invalid.'));
      return;
    }

    setLoadingForecast(true);
    setForecastError(null);

    try {
      const response = await erpService.getCashFlowForecast(horizon, currentBalance);
      if (response.ok && response.data) {
        setForecast(response.data);
        setProjectionPage(1);
      } else {
        setForecastError(response.error ?? t('Unable to load cash flow forecast.'));
        setForecast(null);
        setProjectionPage(1);
      }
    } catch {
      setForecastError(t('Unable to load cash flow forecast.'));
      setForecast(null);
      setProjectionPage(1);
    } finally {
      setLoadingForecast(false);
    }
  };

  const updateScenario = (index: number, updates: Partial<ScenarioFormState>) => {
    setSimulationError(null);
    setScenarios((prev) => prev.map((scenario, i) => (i === index ? { ...scenario, ...updates } : scenario)));
  };

  const addScenario = () => {
    setSimulationError(null);
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
    setSimulationError(null);
    setScenarios((prev) => prev.filter((_, i) => i !== index));
  };

  const duplicateScenario = (index: number) => {
    setSimulationError(null);
    setScenarios((prev) => {
      const source = prev[index];
      if (!source) {
        return prev;
      }

      const nextName = source.scenarioName?.trim()
        ? `${source.scenarioName} Copy`
        : `Scenario ${prev.length + 1}`;

      const clone: ScenarioFormState = {
        ...source,
        scenarioName: nextName,
      };

      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
  };

  const appendScenarioPreset = (preset: 'optimistic' | 'delay' | 'stress') => {
    setSimulationError(null);
    setScenarios((prev) => {
      if (preset === 'optimistic') {
        return [
          ...prev,
          {
            scenarioName: `Optimistic ${prev.length + 1}`,
            receivableDelayInDays: '0',
            payableMultiplier: '0.9',
          },
        ];
      }

      if (preset === 'delay') {
        return [
          ...prev,
          {
            scenarioName: `Delay ${prev.length + 1}`,
            receivableDelayInDays: '14',
            payableMultiplier: '1',
          },
        ];
      }

      return [
        ...prev,
        {
          scenarioName: `Stress ${prev.length + 1}`,
          receivableDelayInDays: '7',
          payableMultiplier: '1.25',
        },
      ];
    });
  };

  const resetScenarios = () => {
    setSimulationError(null);
    setScenarios(createDefaultScenarios());
  };

  const simulationPreview = useMemo<ScenarioValidationPreview>(() => {
    const trimmed = balanceInput.trim();
    if (trimmed) {
      const parsed = parseNumericInput(trimmed);
      if (parsed === null) {
        return {
          sanitized: [],
          fieldErrors: {},
          firstError: t('Current balance is invalid.'),
        };
      }
    }

    const mapped: ForecastSimulationScenario[] = [];
    const fieldErrors: Record<number, string> = {};

    scenarios.forEach((scenario, index) => {
      const delay = parseNumericInput(scenario.receivableDelayInDays);
      const multiplier = parseNumericInput(scenario.payableMultiplier);

      if (delay === null || delay < 0) {
        fieldErrors[index] = t('Receivable delay must be zero or positive.');
        return;
      }

      if (multiplier === null || multiplier <= 0) {
        fieldErrors[index] = t('Payable multiplier must be greater than zero.');
        return;
      }

      mapped.push({
        scenarioName: scenario.scenarioName.trim() || `Scenario ${index + 1}`,
        receivableDelayInDays: Math.floor(delay),
        payableMultiplier: multiplier,
      });
    });

    if (Object.keys(fieldErrors).length > 0) {
      return {
        sanitized: [],
        fieldErrors,
        firstError: fieldErrors[Number(Object.keys(fieldErrors)[0])],
      };
    }

    const sanitized = sanitizeScenarios(mapped);
    if (sanitized.length < 2) {
      return {
        sanitized: [],
        fieldErrors: {},
        firstError: t('At least two scenarios are required.'),
      };
    }

    return { sanitized, fieldErrors: {}, firstError: null };
  }, [balanceInput, scenarios, t]);

  const canRunSimulation = !runningSimulation && isAuthenticated && !authLoading && !simulationPreview.firstError;

  const runSimulation = async () => {
    const trimmed = balanceInput.trim();
    const currentBalance = trimmed ? parseNumericInput(trimmed) : null;
    if (trimmed && currentBalance === null) {
      setSimulationError(t('Current balance is invalid.'));
      return;
    }

    if (simulationPreview.firstError) {
      setSimulationError(simulationPreview.firstError);
      return;
    }

    setRunningSimulation(true);
    setSimulationError(null);

    try {
      const response = await erpService.runCashFlowSimulation({
        horizonInDays: horizon,
        currentBalance: currentBalance ?? 0,
        scenarios: simulationPreview.sanitized,
      });

      if (response.ok && response.data) {
        setSimulationResults(response.data);
        setScenariosVisible(false);
      } else {
        setSimulationError(response.error ?? t('Unable to run simulation.'));
        setSimulationResults([]);
      }
    } catch {
      setSimulationError(t('Unable to run simulation.'));
      setSimulationResults([]);
    } finally {
      setRunningSimulation(false);
    }
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
  }, [projection, currentProjectionPage]);

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
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, { padding: contentPadding }]}>
          <View style={[styles.header, !isCompact && styles.headerRow]}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }, isCompact && styles.titleCompact]}>
                {t('Forecast')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }, isCompact && styles.subtitleCompact]}>
                {t('Predictive revenue outlook and trend analysis')}
              </Text>
            </View>
            <SegmentedControl
              options={horizonOptions.map(String)}
              selected={String(horizon)}
              onSelect={(value) => setHorizon(Number(value) as ForecastHorizon)}
              labelFn={(value) => t('{value} days', { value })}
            />
          </View>

          {!isAuthenticated && !authLoading && (
            <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
              <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
                {t('Authenticate to run forecasts and simulations.')}
              </Text>
            </View>
          )}

          {/* Trend Cards */}
          <View style={[styles.trendGrid, isCompact && styles.trendGridCompact]}>
            {[
              { label: t('Final Projection'), value: forecast ? formatCurrency(forecast.finalProjectedBalance ?? 0, currency) : '--', change: forecast ? `${countRiskDays(forecast)} ${t('Risk Days')}` : '--', positive: (forecast?.finalProjectedBalance ?? 0) >= 0, icon: 'trending-up' as const, accent: colors.primaryPurple },
              { label: t('Growth Rate'), value: forecast && forecast.currentBalance !== 0 ? `${(((forecast.finalProjectedBalance - forecast.currentBalance) / Math.abs(forecast.currentBalance)) * 100).toFixed(1)}%` : forecast ? '0.0%' : '--', change: forecast ? (forecast.finalProjectedBalance >= forecast.currentBalance ? t('Growing') : t('Declining')) : '--', positive: forecast ? forecast.finalProjectedBalance >= forecast.currentBalance : true, icon: 'bar-chart-2' as const, accent: colors.neonGreen },
              { label: t('Horizon'), value: `${horizon}d`, change: t('Current Balance'), positive: true, icon: 'calendar' as const, accent: colors.secondaryPurple },
              { label: t('Risk Factors'), value: String(scenarios.length), change: simulationResults.length > 0 ? t('Results ready') : t('Low impact'), positive: true, icon: 'alert-triangle' as const, accent: colors.accentOrange },
            ].map(({ label, value, change, positive, icon, accent }) => (
              <View key={label} style={[styles.trendCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
                <View style={[styles.trendIconBox, { backgroundColor: `${accent}18` }]}>
                  <Feather name={icon} size={14} color={accent} />
                </View>
                <Text style={[styles.trendLabel, { color: colors.textMuted }]}>{label}</Text>
                <Text style={[styles.trendValue, { color: colors.textPrimary }]}>{value}</Text>
                <Text style={[styles.trendChange, { color: positive ? colors.neonGreen : colors.destructive }]}>{change}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.configCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
            <View style={styles.configCardContent}>
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
                placeholder={t('Leave empty to use enterprise balance')}
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
                textColor="#fff"
                icon={({ size }) => <Feather name="activity" size={size} color={colors.neonGreen} />}
                style={styles.forecastButton}
              >
                {t('Run Forecast')}
              </Button>
              <HelperText type="error" visible={Boolean(forecastError)}>
                {forecastError}
              </HelperText>
            </View>
          </View>

          {forecast && (
            <>
              <View style={[styles.statsRow, isCompact && styles.statsRowCompact]}>
                <View style={[styles.statCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                  <View>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('Current Balance')}</Text>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {formatCurrency(forecast.currentBalance, currency)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                  <View>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('Final Projection')}</Text>
                    <Text style={[styles.statValue, { color: finalBalance < 0 ? colors.accentOrange : colors.neonGreen }]}>
                      {formatCurrency(finalBalance, currency)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                  <View>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('Risk Days')}</Text>
                    <Text style={[styles.statValue, { color: riskDays > 0 ? colors.accentOrange : colors.neonGreen }]}>
                      {riskDays}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.chartCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                <View style={styles.chartContent}>
                  <View style={styles.chartHeader}>
                    <View>
                      <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{t('Revenue Forecast')}</Text>
                      <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>{t('Actual + projected 6-month outlook')}</Text>
                    </View>
                    <View style={[styles.chartLegend, isCompact && styles.chartLegendCompact]}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendLine, { backgroundColor: colors.primaryPurple }]} />
                        <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('Actual')}</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendLineDashed, { borderBottomColor: colors.neonGreen }]} />
                        <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('Forecast')}</Text>
                      </View>
                    </View>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chartScrollContent}
                  >
                    <VictoryChart width={chartWidth} height={240} theme={VictoryTheme.material}>
                      <VictoryAxis
                        tickCount={Math.min(8, Math.max(4, Math.ceil(cashFlowSeries.length / 6)))}
                        style={{
                          axis: { stroke: 'transparent' },
                          tickLabels: { fill: colors.textMuted, fontSize: 11 },
                          grid: { stroke: colors.cardBorder },
                        }}
                      />
                      <VictoryAxis
                        dependentAxis
                        style={{
                          axis: { stroke: 'transparent' },
                          tickLabels: { fill: colors.textMuted, fontSize: 11 },
                          grid: { stroke: 'transparent' },
                        }}
                      />
                      <VictoryLine data={cashFlowSeries} x="x" y="balance" style={{ data: { stroke: colors.primaryPurple, strokeWidth: 2 } }} />
                      <VictoryLine
                        data={cashFlowSeries}
                        x="x"
                        y="receivable"
                        style={{ data: { stroke: colors.neonGreen, strokeWidth: 2, strokeDasharray: '5,5' } }}
                      />
                      <VictoryLine
                        data={cashFlowSeries}
                        x="x"
                        y="payable"
                        style={{ data: { stroke: colors.accentOrange, strokeWidth: 2, strokeDasharray: '5,5' } }}
                      />
                    </VictoryChart>
                  </ScrollView>
                </View>
              </View>

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

              <View style={[styles.projectionCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                <View style={styles.projectionContent}>
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
                </View>
              </View>
            </>
          )}

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Simulation Scenarios')}</Text>
          <View style={[styles.configCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
            <View style={styles.scenarioSummaryContent}>
              <Text style={[styles.scenarioSummaryText, { color: colors.textSecondary }]}>
                {t('{count} scenarios configured', { count: scenarios.length })}
              </Text>
              <View style={[styles.scenarioPillRow, isCompact && styles.scenarioPillRowCompact]}>
                <Chip compact style={{ backgroundColor: `${colors.primaryPurple}18` }} textStyle={{ color: colors.textSecondary }}>
                  {t('{value} days', { value: horizon })}
                </Chip>
                <Chip compact style={{ backgroundColor: `${colors.neonGreen}12` }} textStyle={{ color: colors.textSecondary }}>
                  {runningSimulation ? t('Running...') : simulationResults.length > 0 ? t('Results ready') : t('Ready')}
                </Chip>
              </View>
              <Button
                mode="outlined"
                onPress={() => {
                  setSimulationError(null);
                  setScenariosVisible(true);
                }}
                textColor={colors.textSecondary}
                icon={({ size }) => <Feather name="sliders" size={size} color={colors.textSecondary} />}
                style={[styles.actionButton, { borderColor: colors.cardBorder }]}
              >
                {t('Open Scenarios')}
              </Button>
              <HelperText type="error" visible={Boolean(simulationError)}>
                {simulationError}
              </HelperText>
            </View>
          </View>

          {simulationResults.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Simulation Results')}</Text>
              <View style={styles.resultList}>
                {simulationResults.map((result) => {
                  const isNegativeImpact = result.impact < 0;
                  const hasRisk = result.riskDays.length > 0;
                  return (
                    <View
                      key={result.scenarioName}
                      style={[styles.resultCard, { borderColor: isNegativeImpact ? `${colors.accentOrange}40` : colors.cardBorder, backgroundColor: colors.cardBgFrom }]}
                    >
                      <View style={styles.resultCardHeader}>
                        <View style={[styles.resultIconBox, { backgroundColor: isNegativeImpact ? `${colors.accentOrange}14` : `${colors.neonGreen}14` }]}>
                          <Feather name={isNegativeImpact ? 'alert-triangle' : 'check-circle'} size={14} color={isNegativeImpact ? colors.accentOrange : colors.neonGreen} />
                        </View>
                        <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{result.scenarioName}</Text>
                      </View>
                      <View style={styles.resultMetrics}>
                        <View style={styles.resultMetric}>
                          <Text style={[styles.resultMetricLabel, { color: colors.textMuted }]}>{t('Final')}</Text>
                          <Text style={[styles.resultMetricValue, { color: colors.textPrimary }]}>
                            {formatCurrency(result.finalProjectedBalance, currency)}
                          </Text>
                        </View>
                        <View style={styles.resultMetric}>
                          <Text style={[styles.resultMetricLabel, { color: colors.textMuted }]}>{t('Impact')}</Text>
                          <Text style={[styles.resultMetricValue, { color: isNegativeImpact ? colors.accentOrange : colors.neonGreen }]}>
                            {formatCurrency(result.impact, currency)}
                          </Text>
                        </View>
                        <View style={styles.resultMetric}>
                          <Text style={[styles.resultMetricLabel, { color: colors.textMuted }]}>{t('Risk Days')}</Text>
                          <Text style={[styles.resultMetricValue, { color: hasRisk ? colors.accentOrange : colors.textPrimary }]}>
                            {result.riskDays.length}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
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

            <View style={[styles.modalHintCard, { borderColor: colors.cardBorder, backgroundColor: `${colors.primaryPurple}10` }]}>
              <Text style={[styles.modalHintTitle, { color: colors.textPrimary }]}>
                {t('Configure scenarios and compare outcomes')}
              </Text>
              <Text style={[styles.modalHintText, { color: colors.textSecondary }]}>
                {t('Tip: keep one baseline and add stress/optimistic variations for comparison.')}
              </Text>
            </View>

            <View style={[styles.quickPresetRow, isCompact && styles.quickPresetRowCompact]}>
              <Chip
                compact
                onPress={() => appendScenarioPreset('optimistic')}
                style={[styles.quickPresetChip, { backgroundColor: colors.cardBgTo, borderColor: colors.cardBorder }]}
                textStyle={{ color: colors.textSecondary }}
              >
                +0d / 0.9x
              </Chip>
              <Chip
                compact
                onPress={() => appendScenarioPreset('delay')}
                style={[styles.quickPresetChip, { backgroundColor: colors.cardBgTo, borderColor: colors.cardBorder }]}
                textStyle={{ color: colors.textSecondary }}
              >
                +14d / 1.0x
              </Chip>
              <Chip
                compact
                onPress={() => appendScenarioPreset('stress')}
                style={[styles.quickPresetChip, { backgroundColor: colors.cardBgTo, borderColor: colors.cardBorder }]}
                textStyle={{ color: colors.textSecondary }}
              >
                +7d / 1.25x
              </Chip>
              <Chip
                compact
                onPress={resetScenarios}
                style={[styles.quickPresetChip, { backgroundColor: colors.cardBgTo, borderColor: colors.cardBorder }]}
                textStyle={{ color: colors.textSecondary }}
              >
                {t('Reset')}
              </Chip>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {scenarios.map((scenario, index) => (
                <View key={`${scenario.scenarioName}-${index}`} style={[styles.scenarioCard, { borderColor: colors.cardBorder }]}>
                  <View style={styles.scenarioHeader}>
                    <View style={styles.scenarioHeaderTitleWrap}>
                      <Text style={[styles.scenarioTitle, { color: colors.textPrimary }]}>{t('Scenario {value}', { value: index + 1 })}</Text>
                      {index === 0 ? (
                        <Chip compact style={{ backgroundColor: `${colors.neonGreen}12` }} textStyle={{ color: colors.neonGreen }}>
                          {t('Baseline')}
                        </Chip>
                      ) : null}
                    </View>
                    <View style={styles.scenarioHeaderActions}>
                      <IconButton
                        icon={() => <Feather name="copy" size={14} color={colors.textSecondary} />}
                        onPress={() => duplicateScenario(index)}
                        size={16}
                        style={[styles.inlineIconButton, { borderColor: colors.cardBorder }]}
                      />
                      {scenarios.length > 2 && (
                        <IconButton
                          icon={() => <Feather name="trash-2" size={14} color={colors.accentOrange} />}
                          onPress={() => removeScenario(index)}
                          size={16}
                          style={[styles.inlineIconButton, { borderColor: colors.cardBorder }]}
                        />
                      )}
                    </View>
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
                  <View style={styles.scenarioPreviewRow}>
                    <Chip compact style={{ backgroundColor: `${colors.primaryPurple}15` }} textStyle={{ color: colors.textSecondary }}>
                      {scenario.receivableDelayInDays || '0'}d
                    </Chip>
                    <Chip compact style={{ backgroundColor: `${colors.accentOrange}12` }} textStyle={{ color: colors.textSecondary }}>
                      {scenario.payableMultiplier || '0'}x
                    </Chip>
                    {simulationPreview.fieldErrors[index] ? (
                      <Text style={[styles.scenarioFieldError, { color: colors.accentOrange }]}>
                        {simulationPreview.fieldErrors[index]}
                      </Text>
                    ) : (
                      <Text style={[styles.scenarioFieldOk, { color: colors.neonGreen }]}>
                        {t('Valid')}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={[styles.scenarioActions, isCompact && styles.scenarioActionsCompact]}>
              <Button
                mode="outlined"
                onPress={resetScenarios}
                textColor={colors.textSecondary}
                icon={({ size }) => <Feather name="rotate-ccw" size={size} color={colors.textSecondary} />}
                style={[styles.actionButton, { borderColor: colors.cardBorder }]}
              >
                {t('Reset')}
              </Button>
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
                disabled={!canRunSimulation}
                buttonColor={colors.primaryPurple}
                textColor="#fff"
                icon={({ size }) => <Feather name="play" size={size} color={colors.neonGreen} />}
                style={styles.actionButton}
              >
                {t('Run Simulation')}
              </Button>
            </View>

            <HelperText type="error" visible={Boolean(simulationError)}>
              {simulationError}
            </HelperText>
            <HelperText type="info" visible={!simulationError && Boolean(simulationPreview.firstError)}>
              {simulationPreview.firstError}
            </HelperText>
          </KeyboardAvoidingView>
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
    paddingTop: 20,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
    lineHeight: 30,
  },
  titleCompact: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  trendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  trendGridCompact: {
    flexDirection: 'column',
  },
  trendCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  trendIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  trendLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  trendValue: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  trendChange: {
    fontSize: 11,
    marginTop: 4,
  },
  banner: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 12,
  },
  configCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  configCardContent: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  chartCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartContent: {
    gap: 4,
    padding: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  chartSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  chartScrollContent: {
    paddingHorizontal: 4,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  chartLegendCompact: {
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 12,
    height: 2,
    borderRadius: 999,
  },
  legendLineDashed: {
    width: 12,
    height: 0,
    borderBottomWidth: 2,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 11,
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
    borderRadius: 12,
    borderWidth: 1,
  },
  paginationButtonContent: {
    height: 36,
  },
  projectionCard: {
    borderRadius: 12,
    borderWidth: 1,
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
    fontVariant: ['tabular-nums'],
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
  scenarioPillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  scenarioPillRowCompact: {
    gap: 6,
  },
  modalHintCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    gap: 4,
  },
  modalHintTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalHintText: {
    fontSize: 12,
    lineHeight: 16,
  },
  quickPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  quickPresetRowCompact: {
    gap: 6,
  },
  quickPresetChip: {
    borderWidth: 1,
  },
  scenarioCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  scenarioHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  scenarioHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scenarioTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  inlineIconButton: {
    borderWidth: 1,
    borderRadius: 12,
    margin: 0,
  },
  input: {
    marginTop: 2,
  },
  scenarioPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  scenarioFieldError: {
    fontSize: 11,
    flexShrink: 1,
  },
  scenarioFieldOk: {
    fontSize: 11,
    fontWeight: '600',
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
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  resultMetrics: {
    flexDirection: 'row',
    gap: 0,
  },
  resultMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  resultMetricLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  resultMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
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
