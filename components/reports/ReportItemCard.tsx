import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Card, Text } from '../ui/Paper';
import { Report as ReportModel } from '../../services/erpService';
import { CustomerColors } from '../customers/types';
import { formatUsDateTime } from '../../utils/datetime';
import { useI18n } from '../../contexts/I18nContext';

interface ReportItemCardProps {
  report: ReportModel;
  colors: CustomerColors;
  isCompact: boolean;
}

export function ReportItemCard({ report, colors, isCompact }: ReportItemCardProps) {
  const { t } = useI18n();
  return (
    <Card
      mode="outlined"
      style={[styles.reportCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
    >
      <Card.Content style={styles.reportCardContent}>
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
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {formatUsDateTime(report.date, report.date)}
            </Text>
          </View>
        </View>

        <View style={[styles.reportActions, isCompact && styles.reportActionsCompact]}>
          <Button
            mode="contained"
            onPress={() => undefined}
            icon={({ size }) => <Feather name="eye" size={size} color={colors.neonGreen} />}
            buttonColor={colors.primaryPurple}
            textColor={colors.neonGreen}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            {t('View')}
          </Button>
          <Button
            mode="outlined"
            onPress={() => undefined}
            icon={({ size }) => <Feather name="download" size={size} color={colors.primaryPurple} />}
            textColor={colors.primaryPurple}
            style={[styles.actionButton, styles.actionButtonOutline, { borderColor: colors.cardBorder }]}
            contentStyle={styles.actionButtonContent}
          >
            {t('Export')}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  reportCard: {
    borderRadius: 10,
  },
  reportCardContent: {
    gap: 14,
  },
  reportHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
    gap: 4,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  reportDescription: {
    fontSize: 12,
  },
  reportMeta: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
  },
  reportActionsCompact: {
    flexDirection: 'column',
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
  actionButtonOutline: {
    borderWidth: 1.5,
  },
  actionButtonContent: {
    height: 38,
  },
});
