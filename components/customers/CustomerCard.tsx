import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card, Chip, IconButton } from '../ui/Paper';
import { formatCurrency } from '../../utils/currency';
import { CustomerCardData } from '../../utils/customers/presentation';
import { CustomerColors } from './types';
import { useI18n } from '../../contexts/I18nContext';

interface CustomerCardProps {
  data: CustomerCardData;
  colors: CustomerColors;
  currency: string | null;
  isCompact: boolean;
  canManage: boolean;
  isDeactivating: boolean;
  onEdit: (customer: CustomerCardData['customer']) => void;
  onDeactivate: (customer: CustomerCardData['customer'], displayName: string) => void;
}

const getStatusColor = (status: string, colors: CustomerColors) => {
  switch (status.trim().toLowerCase()) {
    case 'active':
      return colors.neonGreen;
    case 'inactive':
    case 'disabled':
    case 'blocked':
      return colors.textMuted;
    default:
      return colors.textMuted;
  }
};

export function CustomerCard({
  data,
  colors,
  currency,
  isCompact,
  canManage,
  isDeactivating,
  onEdit,
  onDeactivate,
}: CustomerCardProps) {
  const { t } = useI18n();
  const statusColor = getStatusColor(data.status, colors);

  return (
    <Card
      key={data.key}
      mode="outlined"
      style={[styles.customerCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
      testID={`customer-row-${data.key}`}
    >
      <Card.Content style={styles.customerCardContent}>
        <View style={[styles.customerHeader, isCompact && styles.customerHeaderCompact]}>
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: colors.textPrimary }]} testID={`customer-name-${data.key}`}>
              {data.displayName}
            </Text>
            <View style={styles.customerMetaLine}>
              <Feather name="mail" size={12} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{data.displayEmail}</Text>
            </View>
            {data.displayPhone && (
              <View style={styles.customerMetaLine}>
                <Feather name="phone" size={12} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{data.displayPhone}</Text>
              </View>
            )}
            {data.displayDocument && (
              <View style={styles.customerMetaLine}>
                <Feather name="file-text" size={12} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{data.displayDocument}</Text>
              </View>
            )}
          </View>

          <View style={[styles.customerActions, isCompact && styles.customerActionsCompact]}>
            <Chip
              compact={isCompact}
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}45` },
              ]}
              textStyle={[styles.statusText, { color: statusColor }]}
            >
              {t(data.status)}
            </Chip>

            {canManage && (
              <View style={styles.actionButtons}>
                <IconButton
                  icon={() => <Feather name="edit-2" size={14} color={colors.primaryPurple} />}
                  size={18}
                  onPress={() => onEdit(data.customer)}
                  style={[
                    styles.actionButton,
                    { borderColor: colors.cardBorder, backgroundColor: `${colors.appBg}55` },
                  ]}
                  testID={`customer-edit-${data.key}`}
                />

                <IconButton
                  icon={() => <Feather name="trash-2" size={14} color={colors.accentOrange} />}
                  size={18}
                  onPress={() => onDeactivate(data.customer, data.displayName)}
                  disabled={isDeactivating}
                  style={[
                    styles.actionButton,
                    { borderColor: colors.cardBorder, backgroundColor: `${colors.appBg}55` },
                    isDeactivating && styles.actionButtonDisabled,
                  ]}
                  testID={`customer-deactivate-${data.key}`}
                />
              </View>
            )}
          </View>
        </View>

        <View
          style={[
            styles.customerStats,
            isCompact && styles.customerStatsCompact,
            { borderColor: colors.cardBorder, backgroundColor: `${colors.primaryPurple}12` },
          ]}
        >
          <View style={[styles.statItem, isCompact && styles.statItemCompact, { backgroundColor: `${colors.appBg}45` }]}>
            <Feather name="shopping-bag" size={16} color={colors.primaryPurple} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{t('{count} orders', { count: data.orderCount })}</Text>
          </View>
          <View style={[styles.statItem, isCompact && styles.statItemCompact, { backgroundColor: `${colors.appBg}45` }]}>
            <Feather name="dollar-sign" size={16} color={colors.neonGreen} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{formatCurrency(data.spentTotal, currency)}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  customerCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  customerCardContent: {
    padding: 18,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 14,
  },
  customerHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  customerInfo: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  customerMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12.5,
    flexShrink: 1,
  },
  customerActions: {
    alignItems: 'flex-end',
    gap: 10,
  },
  customerActionsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  statusBadge: {
    alignSelf: 'flex-end',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  customerStats: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
  },
  customerStatsCompact: {
    flexDirection: 'column',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flex: 1,
  },
  statItemCompact: {
    flex: 0,
    alignSelf: 'flex-start',
  },
});
