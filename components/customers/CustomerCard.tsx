import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { IconButton } from '../ui/Paper';
import { Avatar } from '../Avatar';
import { StatusBadge } from '../StatusBadge';
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

  const displayAddress =
    data.customer.adress && data.customer.adress.trim()
      ? data.customer.adress.trim()
      : null;

  return (
    <Pressable
      style={(state: any) => [
        styles.customerCard,
        { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
        state.hovered && { borderColor: `${colors.primaryPurple}40` },
      ]}
      testID={`customer-row-${data.key}`}
    >
      <View style={styles.cardInner}>
        <Avatar name={data.displayName} size="lg" />
        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.customerName, { color: colors.textPrimary }]}
              numberOfLines={1}
              testID={`customer-name-${data.key}`}
            >
              {data.displayName}
            </Text>
            <StatusBadge status={data.status.toLowerCase()} label={t(data.status)} />
          </View>
          {data.displayEmail !== 'No email on file' && (
            <Text style={[styles.contactName, { color: colors.textMuted }]} numberOfLines={1}>
              {data.displayEmail}
            </Text>
          )}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="mail" size={12} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                {data.displayEmail}
              </Text>
            </View>
            {data.displayPhone ? (
              <View style={styles.metaItem}>
                <Feather name="phone" size={12} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                  {data.displayPhone}
                </Text>
              </View>
            ) : null}
            {displayAddress ? (
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={12} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                  {displayAddress}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        {!isCompact && (
          <View style={styles.revenueBlock}>
            <Text style={[styles.revenueValue, { color: colors.textPrimary }]}>
              {formatCurrency(data.spentTotal, currency)}
            </Text>
            <Text style={[styles.revenueOrders, { color: colors.textMuted }]}>
              {t(data.orderCount === 1 ? '{count} order' : '{count} orders', { count: data.orderCount })}
            </Text>
          </View>
        )}
      </View>

      {isCompact && (
        <View style={styles.compactStatsRow}>
          <Text style={[styles.revenueValue, { color: colors.textPrimary, fontSize: 15 }]}>
            {formatCurrency(data.spentTotal, currency)}
          </Text>
          <Text style={[styles.revenueOrders, { color: colors.textMuted }]}>
            {t(data.orderCount === 1 ? '{count} order' : '{count} orders', { count: data.orderCount })}
          </Text>
        </View>
      )}

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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  customerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    ...Platform.select({ web: { transition: 'border-color 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  contactName: {
    fontSize: 14,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 4,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    flexShrink: 1,
  },
  revenueBlock: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  revenueValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  revenueOrders: {
    fontSize: 12,
    marginTop: 2,
  },
  compactStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'flex-end',
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
});
