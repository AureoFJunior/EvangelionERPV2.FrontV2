import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Platform, Pressable, View, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, IconButton, Text } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { ErpService, Report, ReportDetail, ReportType } from '../services/erpService';
import { NervLoader } from './NervLoader';
import { useResponsive } from '../hooks/useResponsive';
import { useReportsData } from '../hooks/reports/useReportsData';
import { SegmentedControl } from './SegmentedControl';

const DATE_RANGES = ['All', 'This Month', 'Last 7d', 'Today'] as const;

const REPORT_TYPES: { type: ReportType; label: string; icon: string; accent: 'primaryPurple' | 'neonGreen' | 'secondaryPurple' | 'accentOrange' | 'destructive' }[] = [
  { type: 'Stock', label: 'Stock', icon: 'package', accent: 'primaryPurple' },
  { type: 'MonthlyBilling', label: 'Monthly Billing', icon: 'dollar-sign', accent: 'neonGreen' },
  { type: 'TopProductsRevenue', label: 'Top Products Revenue', icon: 'trending-up', accent: 'secondaryPurple' },
  { type: 'SalesByStatus', label: 'Sales by Status', icon: 'bar-chart-2', accent: 'accentOrange' },
  { type: 'PayablesOverview', label: 'Payables Overview', icon: 'credit-card', accent: 'destructive' },
];

export function Reports() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { client, isAuthenticated, loading: authLoading } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const { isCompact, isTablet, contentPadding } = useResponsive();
  const [dateRange, setDateRange] = useState<(typeof DATE_RANGES)[number]>('All');
  const { reports, loading, errorMessage, setReports } = useReportsData({
    erpService,
    isAuthenticated,
    authLoading,
  });

  const [generateVisible, setGenerateVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailReport, setDetailReport] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const quickStats = [
    { label: t('Reports Generated'), value: String(reports.length || 0), accent: colors.primaryPurple, icon: 'file-text' as const },
    { label: t('Data Exported'), value: '142 GB', accent: colors.neonGreen, icon: 'download' as const },
    { label: t('Scheduled'), value: '12', accent: colors.accentOrange, icon: 'clock' as const },
    { label: t('Compliance Score'), value: '98.4%', accent: colors.secondaryPurple, icon: 'shield' as const },
  ];

  const handleGenerate = async (type: ReportType) => {
    setGenerating(true);
    setGenerateError(null);

    const response = await erpService.generateReport(type);
    if (response.ok && response.data) {
      setReports((prev: Report[]) => [response.data as Report, ...prev]);
      setGenerateVisible(false);
    } else {
      setGenerateError(response.error ?? t('Unable to generate report.'));
    }

    setGenerating(false);
  };

  const openDetail = async (report: Report) => {
    setDetailReport(null);
    setDetailError(null);
    setDetailLoading(true);
    setDetailVisible(true);

    const response = await erpService.fetchReportById(report.id);
    if (response.ok && response.data) {
      setDetailReport(response.data);
    } else {
      setDetailError(response.error ?? t('Unable to load report details.'));
    }

    setDetailLoading(false);
  };

  const iframeRef = useRef<any>(null);

  const closeDetail = () => {
    setDetailVisible(false);
    setDetailReport(null);
    setDetailError(null);
  };

  const downloadReport = useCallback(() => {
    if (!detailReport?.htmlContent) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const styledHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${detailReport.title || 'Report'}</title>
            <style>
              @media print {
                body { margin: 0; }
                @page { margin: 1cm; }
              }
            </style>
          </head>
          <body>${detailReport.htmlContent}</body>
        </html>
      `;

      printWindow.document.write(styledHtml);
      printWindow.document.close();

      printWindow.onafterprint = () => printWindow.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    }
  }, [detailReport]);

  const printReport = useCallback(() => {
    if (!detailReport?.htmlContent) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const styledHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${detailReport.title || 'Report'}</title>
            <style>
              @media print {
                body { margin: 0; }
                @page { margin: 1cm; }
              }
            </style>
          </head>
          <body>${detailReport.htmlContent}</body>
        </html>
      `;

      printWindow.document.write(styledHtml);
      printWindow.document.close();
      printWindow.onafterprint = () => printWindow.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    }
  }, [detailReport]);

  if (loading) {
    return (
      <NervLoader
        variant="reports"
        fullScreen
        label={t('Loading')}
        subtitle={t('Fetching report data...')}
      />
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={[styles.content, { padding: contentPadding }]}>
          {/* Header */}
          <View style={[styles.header, !isCompact && styles.headerRow]}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }, isCompact && styles.titleCompact]}>
                {t('Reports')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {t('Generate and export business intelligence data')}
              </Text>
            </View>
            {!isCompact && (
              <View style={styles.headerActions}>
                <SegmentedControl
                  options={[...DATE_RANGES]}
                  selected={dateRange}
                  onSelect={(v) => setDateRange(v as typeof dateRange)}
                  labelFn={(v) => t(v)}
                />
                <Button
                  mode="contained"
                  onPress={() => setGenerateVisible(true)}
                  disabled={!isAuthenticated || authLoading}
                  icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
                  buttonColor={colors.primaryPurple}
                  textColor="#fff"
                  style={styles.generateBtn}
                  contentStyle={styles.generateBtnContent}
                >
                  {t('Generate')}
                </Button>
              </View>
            )}
          </View>

          {isCompact && (
            <View style={styles.compactActions}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compactDateRow}>
                <View style={styles.compactDatePills}>
                  {DATE_RANGES.map((range) => {
                    const isActive = dateRange === range;
                    return (
                      <Pressable
                        key={range}
                        onPress={() => setDateRange(range)}
                        style={[
                          styles.compactDatePill,
                          {
                            backgroundColor: isActive ? colors.cardBgFrom : 'transparent',
                            borderColor: isActive ? colors.primaryPurple : colors.cardBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.compactDatePillText, { color: isActive ? colors.textPrimary : colors.textMuted }]}>
                          {t(range)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <Button
                mode="contained"
                onPress={() => setGenerateVisible(true)}
                disabled={!isAuthenticated || authLoading}
                icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
                buttonColor={colors.primaryPurple}
                textColor="#fff"
                style={styles.generateBtnCompact}
                contentStyle={styles.generateBtnContent}
              >
                {t('Generate Report')}
              </Button>
            </View>
          )}

          {!isAuthenticated && !authLoading && (
            <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
              <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
                {t('Authenticate to load live reports.')}
              </Text>
            </View>
          )}

          {errorMessage && (
            <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
              <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{errorMessage}</Text>
            </View>
          )}

          {!loading && reports.length === 0 && (
            <View style={[styles.emptyState, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
              <Feather name="file-text" size={20} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('No reports yet')}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {t('Generate or fetch reports to see them listed here.')}
              </Text>
            </View>
          )}

          {/* Quick Stats */}
          <View style={[styles.statsGrid, isCompact && styles.statsGridCompact]}>
            {quickStats.map((stat) => (
              <Pressable
                key={stat.label}
                style={(state: any) => [
                  styles.statCard,
                  { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
                  isCompact && styles.statCardCompact,
                  state.hovered && { borderColor: `${stat.accent}40` },
                ]}
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconBox, { backgroundColor: `${stat.accent}18` }]}>
                    <Feather name={stat.icon} size={14} color={stat.accent} />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: stat.accent }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  {stat.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Report Table */}
          {reports.length > 0 && (
            <View style={[styles.tableCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
              <View style={[styles.tableHeaderRow, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.tableHeaderCell, styles.tableHeaderReport, { color: colors.textMuted }]}>
                  {t('Report')}
                </Text>
                <Text style={[styles.tableHeaderCell, styles.tableHeaderType, { color: colors.textMuted }]}>
                  {t('Type')}
                </Text>
                {!isCompact && (
                  <>
                    <Text style={[styles.tableHeaderCell, styles.tableHeaderPeriod, { color: colors.textMuted }]}>
                      {t('Date')}
                    </Text>
                  </>
                )}
                <View style={styles.tableHeaderAction} />
              </View>

              {reports.map((report, index) => (
                <Pressable
                  key={report.id}
                  onPress={() => openDetail(report)}
                  style={(state: any) => [
                    styles.tableRow,
                    index < reports.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
                    state.hovered && { backgroundColor: 'rgba(255,255,255,0.02)' },
                  ]}
                >
                  <View style={styles.tableRowReport}>
                    <Text style={[styles.reportName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {report.title}
                    </Text>
                    {!!report.description && (
                      <Text style={[styles.reportDesc, { color: colors.textMuted }]} numberOfLines={1}>
                        {report.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.tableRowType}>
                    <View style={[styles.typeBadge, { backgroundColor: colors.inputBgFrom }]}>
                      <Text style={[styles.typeBadgeText, { color: colors.textMuted }]}>
                        {report.type}
                      </Text>
                    </View>
                  </View>
                  {!isCompact && (
                    <View style={styles.tableRowPeriod}>
                      <Text style={[styles.periodText, { color: colors.textMuted }]}>
                        {report.date}
                      </Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => openDetail(report)}
                    style={(state: any) => [
                      styles.viewBtn,
                      { borderColor: `${colors.primaryPurple}30` },
                      state.hovered && { backgroundColor: `${colors.primaryPurple}12` },
                    ]}
                  >
                    <Feather name="eye" size={12} color={colors.primaryPurple} />
                    <Text style={[styles.viewBtnText, { color: colors.primaryPurple }]}>{t('View')}</Text>
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Generate Report Modal */}
      <Modal visible={generateVisible} transparent animationType="fade" onRequestClose={() => setGenerateVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isTablet && styles.modalCardWide,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('Generate Report')}</Text>
              <IconButton
                icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
                size={18}
                onPress={() => setGenerateVisible(false)}
                disabled={generating}
                style={[styles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
              />
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              {t('Select the type of report to generate.')}
            </Text>

            {generateError && (
              <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
                <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{generateError}</Text>
              </View>
            )}

            <View style={styles.reportTypeList}>
              {REPORT_TYPES.map(({ type, label, icon, accent: accentKey }) => {
                const accent = colors[accentKey];
                return (
                <Pressable
                  key={type}
                  onPress={() => handleGenerate(type)}
                  disabled={generating}
                  style={(state: any) => [
                    styles.reportTypeCard,
                    { borderColor: colors.cardBorder, backgroundColor: colors.inputBgFrom },
                    state.hovered && { borderColor: `${accent}40` },
                    generating && { opacity: 0.5 },
                  ]}
                >
                  <View style={[styles.reportTypeIcon, { backgroundColor: `${accent}18` }]}>
                    <Feather name={icon as any} size={16} color={accent} />
                  </View>
                  <View style={styles.reportTypeInfo}>
                    <Text style={[styles.reportTypeName, { color: colors.textPrimary }]}>{t(label)}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textMuted} />
                </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Detail Modal */}
      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={closeDetail}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              styles.detailModalCard,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isTablet && styles.modalCardWide,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('Report Details')}</Text>
              <IconButton
                icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
                size={18}
                onPress={closeDetail}
                style={[styles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
              />
            </View>

            {detailLoading ? (
              <View style={styles.detailLoading}>
                <NervLoader label={t('Loading report...')} />
              </View>
            ) : detailError ? (
              <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
                <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{detailError}</Text>
              </View>
            ) : detailReport ? (
              <>
                <View style={[styles.detailHeader, { borderColor: colors.cardBorder }]}>
                  <View style={styles.detailHeaderTop}>
                    <View style={styles.detailHeaderInfo}>
                      <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>{detailReport.title}</Text>
                      {!!detailReport.description && (
                        <Text style={[styles.detailDesc, { color: colors.textMuted }]}>{detailReport.description}</Text>
                      )}
                      <View style={styles.detailMeta}>
                        <View style={[styles.typeBadge, { backgroundColor: colors.inputBgFrom }]}>
                          <Text style={[styles.typeBadgeText, { color: colors.textMuted }]}>{detailReport.type}</Text>
                        </View>
                        <Text style={[styles.detailDate, { color: colors.textMuted }]}>{detailReport.date}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.detailActions}>
                    <Pressable
                      onPress={downloadReport}
                      style={(state: any) => [
                        styles.detailActionBtn,
                        { borderColor: `${colors.primaryPurple}40` },
                        state.hovered && { backgroundColor: `${colors.primaryPurple}12` },
                      ]}
                    >
                      <Feather name="download" size={14} color={colors.primaryPurple} />
                      <Text style={[styles.detailActionText, { color: colors.primaryPurple }]}>{t('Download PDF')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={printReport}
                      style={(state: any) => [
                        styles.detailActionBtn,
                        { borderColor: colors.cardBorder },
                        state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
                      ]}
                    >
                      <Feather name="printer" size={14} color={colors.textSecondary} />
                      <Text style={[styles.detailActionText, { color: colors.textSecondary }]}>{t('Print')}</Text>
                    </Pressable>
                  </View>
                </View>

                {!!detailReport.htmlContent && Platform.OS === 'web' ? (
                  <View style={[styles.htmlFrame, { borderColor: colors.cardBorder }]}>
                    {React.createElement('iframe', {
                      ref: iframeRef,
                      srcDoc: detailReport.htmlContent,
                      style: {
                        width: '100%',
                        height: 400,
                        border: 'none',
                        borderRadius: 8,
                        backgroundColor: '#fff',
                      },
                      sandbox: 'allow-same-origin',
                    })}
                  </View>
                ) : !!detailReport.htmlContent ? (
                  <ScrollView style={styles.htmlScrollFallback}>
                    <View style={[styles.htmlContainer, { borderColor: colors.cardBorder, backgroundColor: colors.inputBgFrom }]}>
                      <Text style={[styles.htmlContent, { color: colors.textPrimary }]} selectable>
                        {detailReport.htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
                      </Text>
                    </View>
                  </ScrollView>
                ) : (
                  <View style={[styles.emptyState, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                    <Feather name="file-text" size={20} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('No content')}</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                      {t('This report has no HTML content to display.')}
                    </Text>
                  </View>
                )}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generateBtn: {
    borderRadius: 8,
  },
  generateBtnContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  generateBtnCompact: {
    borderRadius: 8,
    marginBottom: 16,
  },
  compactActions: {
    gap: 12,
    marginBottom: 8,
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
  emptyState: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  compactDateRow: {
    marginBottom: 0,
  },
  compactDatePills: {
    flexDirection: 'row',
    gap: 8,
  },
  compactDatePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  compactDatePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statsGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({ web: { transition: 'border-color 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  statCardCompact: {
    minWidth: '46%' as any,
    flex: 0,
  },
  statCardTop: {
    marginBottom: 12,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  tableCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableHeaderReport: {
    flex: 1.5,
    minWidth: 90,
  },
  tableHeaderType: {
    width: 80,
  },
  tableHeaderPeriod: {
    width: 90,
  },
  tableHeaderAction: {
    width: 60,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...Platform.select({ web: { transition: 'background-color 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  tableRowReport: {
    flex: 1.5,
    minWidth: 90,
  },
  reportName: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  tableRowType: {
    width: 80,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  tableRowPeriod: {
    width: 90,
  },
  periodText: {
    fontSize: 12,
  },
  viewBtn: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    ...Platform.select({ web: { transition: 'background-color 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 10, 18, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.22, shadowRadius: 30 },
      android: { elevation: 8 },
    }),
  },
  detailModalCard: {
    maxHeight: '85%',
  },
  modalCardWide: {
    maxWidth: 800,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: -8,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTypeList: {
    gap: 8,
  },
  reportTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'border-color 0.15s ease' } as any, default: {} }),
  },
  reportTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTypeInfo: {
    flex: 1,
  },
  reportTypeName: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  detailHeader: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailDesc: {
    fontSize: 13,
  },
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  detailDate: {
    fontSize: 12,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(47,47,74,0.5)',
    paddingTop: 10,
  },
  detailActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'background-color 0.15s ease' } as any, default: {} }),
  },
  detailActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  htmlFrame: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  htmlScrollFallback: {
    maxHeight: 400,
  },
  htmlContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  htmlContent: {
    fontSize: 13,
    lineHeight: 20,
  },
});
