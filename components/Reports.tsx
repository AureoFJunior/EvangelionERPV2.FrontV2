import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Text } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { ErpService } from '../services/erpService';
import { NervLoader } from './NervLoader';
import { useResponsive } from '../hooks/useResponsive';
import { useReportsData } from '../hooks/reports/useReportsData';
import { ReportQuickStatCard } from './reports/ReportQuickStatCard';
import { ReportItemCard } from './reports/ReportItemCard';

export function Reports() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { client, isAuthenticated, loading: authLoading } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const { isCompact, contentPadding } = useResponsive();
  const { reports, loading, errorMessage, reportsThisMonth, reportsToday } = useReportsData({
    erpService,
    isAuthenticated,
    authLoading,
  });

  const quickStats = [
    { label: t('Total Reports'), value: String(reports.length), icon: 'file-text', color: colors.primaryPurple },
    { label: t('This Month'), value: String(reportsThisMonth), icon: 'calendar', color: colors.neonGreen },
    { label: t('Generated Today'), value: String(reportsToday), icon: 'activity', color: colors.accentOrange },
  ];

  if (loading) {
    return (
      <NervLoader
        fullScreen
        label={t('Synchronizing EVA-01')}
        subtitle={t('LCL circulation nominal | Loading reports...')}
      />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={[styles.content, { padding: contentPadding }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
            {t('REPORTS & ANALYTICS')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}>
            {t('Generate and view business intelligence reports')}
          </Text>
          <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
        </View>

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
        <View style={[styles.statsContainer, isCompact && styles.statsContainerCompact]}>
          {quickStats.map((stat) => (
            <ReportQuickStatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              colors={colors}
              isCompact={isCompact}
            />
          ))}
        </View>

        {/* Generate Report Button */}
        <Button
          mode="contained"
          onPress={() => undefined}
          icon={({ size }) => <Feather name="plus-circle" size={size} color={colors.neonGreen} />}
          buttonColor={colors.primaryPurple}
          textColor={colors.neonGreen}
          style={styles.generateButton}
          contentStyle={styles.generateButtonContent}
        >
          {t('Generate New Report')}
        </Button>

        {/* Recent Reports */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Recent Reports')}</Text>

        <View style={styles.reportsList}>
          {reports.map((report) => (
            <ReportItemCard
              key={report.id}
              report={report}
              colors={colors}
              isCompact={isCompact}
            />
          ))}
        </View>
      </View>
    </ScrollView>
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
    width: 100,
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
  emptyState: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statsContainerCompact: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  statCardCompact: {
    width: '100%',
    flex: 0,
  },
  statCardContent: {
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  generateButton: {
    borderRadius: 8,
    marginBottom: 32,
  },
  generateButtonContent: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  reportsList: {
    gap: 16,
  },
  reportCard: {
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  reportCardContent: {
    padding: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  reportIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 12,
  },
  reportMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
    rowGap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  reportActionsCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  actionButton: {
    borderRadius: 8,
  },
  actionButtonContent: {
    paddingVertical: 6,
  },
  actionButtonOutline: {
    borderWidth: 2,
  },
});
