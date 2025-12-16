import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ErpService, Report as ReportModel } from '../services/erpService';

export function Reports() {
  const { colors } = useTheme();
  const { client, isAuthenticated, loading: authLoading } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const [reports, setReports] = useState<ReportModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      return;
    }

    let active = true;

    const loadReports = async () => {
      setLoading(true);
      setErrorMessage(null);

      const response = await erpService.fetchReports();
      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        setReports(response.data);
      } else {
        setErrorMessage(response.error ?? 'Unable to load reports');
      }

      setLoading(false);
    };

    loadReports();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading]);

  const reportsThisMonth = useMemo(() => {
    const now = new Date();
    return reports.filter((report) => {
      const reportDate = new Date(report.date);
      return reportDate.getFullYear() === now.getFullYear() && reportDate.getMonth() === now.getMonth();
    }).length;
  }, [reports]);

  const reportsToday = useMemo(() => {
    const today = new Date();
    return reports.filter((report) => {
      const reportDate = new Date(report.date);
      return (
        reportDate.getFullYear() === today.getFullYear() &&
        reportDate.getMonth() === today.getMonth() &&
        reportDate.getDate() === today.getDate()
      );
    }).length;
  }, [reports]);

  const quickStats = [
    { label: 'Total Reports', value: String(reports.length), icon: 'file-text', color: colors.primaryPurple },
    { label: 'This Month', value: String(reportsThisMonth), icon: 'calendar', color: colors.neonGreen },
    { label: 'Generated Today', value: String(reportsToday), icon: 'activity', color: colors.accentOrange },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonGreen }]}>REPORTS & ANALYTICS</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Generate and view business intelligence reports
          </Text>
          <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
        </View>

        {!isAuthenticated && !authLoading && (
          <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
              Authenticate to load live reports.
            </Text>
          </View>
        )}

        {errorMessage && (
          <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
            <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{errorMessage}</Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.neonGreen} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading reports...</Text>
          </View>
        )}

        {!loading && reports.length === 0 && (
          <View style={[styles.emptyState, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
            <Feather name="file-text" size={20} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No reports yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Generate or fetch reports to see them listed here.
            </Text>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          {quickStats.map((stat, index) => (
            <View
              key={index}
              style={[styles.statCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
            >
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                <Feather name={stat.icon as any} size={24} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Generate Report Button */}
        <TouchableOpacity style={[styles.generateButton, { backgroundColor: colors.primaryPurple }]}>
          <Feather name="plus-circle" size={20} color={colors.neonGreen} />
          <Text style={[styles.generateButtonText, { color: colors.neonGreen }]}>Generate New Report</Text>
        </TouchableOpacity>

        {/* Recent Reports */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Reports</Text>

        <View style={styles.reportsList}>
          {reports.map((report) => (
            <View
              key={report.id}
              style={[styles.reportCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
            >
              <View style={styles.reportHeader}>
                <View style={[styles.reportIcon, { backgroundColor: `${colors.primaryPurple}20` }]}>
                  <Feather name={report.icon as any} size={24} color={colors.primaryPurple} />
                </View>
                <View style={styles.reportInfo}>
                  <Text style={[styles.reportTitle, { color: colors.textPrimary }]}>{report.title}</Text>
                  <Text style={[styles.reportDescription, { color: colors.textSecondary }]}>
                    {report.description}
                  </Text>
                </View>
              </View>

              <View style={styles.reportMeta}>
                <View style={styles.metaItem}>
                  <Feather name="tag" size={14} color={colors.primaryPurple} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>{report.type}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Feather name="calendar" size={14} color={colors.primaryPurple} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>{report.date}</Text>
                </View>
              </View>

              <View style={styles.reportActions}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primaryPurple }]}>
                  <Feather name="eye" size={16} color={colors.neonGreen} />
                  <Text style={[styles.actionButtonText, { color: colors.neonGreen }]}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.cardBorder }]}
                >
                  <Feather name="download" size={16} color={colors.primaryPurple} />
                  <Text style={[styles.actionButtonText, { color: colors.primaryPurple }]}>Export</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
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
  loadingText: {
    fontSize: 12,
    marginLeft: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
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
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
