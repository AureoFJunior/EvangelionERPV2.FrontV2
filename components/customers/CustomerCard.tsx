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
          <View style={[styles.avatar, { backgroundColor: colors.primaryPurple }]}>
            <Text style={[styles.avatarText, { color: colors.neonGreen }]}>{data.displayName.charAt(0).toUpperCase()}</Text>
          </View>

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
              style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}
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
                  style={[styles.actionButton, { borderColor: colors.cardBorder }]}
                  testID={`customer-edit-${data.key}`}
                />

                <IconButton
                  icon={() => <Feather name="trash-2" size={14} color={colors.accentOrange} />}
                  size={18}
                  onPress={() => onDeactivate(data.customer, data.displayName)}
                  disabled={isDeactivating}
                  style={[styles.actionButton, { borderColor: colors.cardBorder }, isDeactivating && styles.actionButtonDisabled]}
                  testID={`customer-deactivate-${data.key}`}
                />
              </View>
            )}
          </View>
        </View>

        <View style={[styles.customerStats, isCompact && styles.customerStatsCompact]}>
          <View style={styles.statItem}>
            <Feather name="shopping-bag" size={16} color={colors.primaryPurple} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{t('{count} orders', { count: data.orderCount })}</Text>
          </View>
          <View style={styles.statItem}>
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
    borderRadius: 8,
  },
  customerCardContent: {
    padding: 16,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  customerHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    marginBottom: 4,
  },
  customerMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
  },
  customerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  customerActionsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  customerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  customerStatsCompact: {
    flexDirection: 'column',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
