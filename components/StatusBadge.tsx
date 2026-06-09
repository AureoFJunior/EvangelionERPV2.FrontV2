import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

type StatusKey =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'paid'
  | 'unpaid'
  | 'overdue'
  | 'partial'
  | 'low-stock'
  | 'out-of-stock'
  | 'on-leave'
  | 'open'
  | 'delivered'
  | 'shipped'
  | 'finished'
  | 'deactivated';

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'muted';

const STATUS_TONES: Record<string, Tone> = {
  active: 'success',
  completed: 'success',
  paid: 'success',
  delivered: 'success',
  finished: 'success',
  shipped: 'success',
  pending: 'warning',
  unpaid: 'warning',
  open: 'warning',
  'on-leave': 'warning',
  'low-stock': 'warning',
  processing: 'info',
  partial: 'info',
  cancelled: 'danger',
  overdue: 'danger',
  'out-of-stock': 'danger',
  deactivated: 'danger',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const { colors } = useTheme();
  const tone = STATUS_TONES[status.toLowerCase()] ?? 'muted';
  const accent = {
    success: colors.neonGreen,
    warning: colors.accentOrange,
    info: colors.secondaryPurple,
    danger: colors.destructive,
    muted: colors.textMuted,
  }[tone];
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={[styles.badge, { backgroundColor: `${accent}1A`, borderColor: `${accent}40` }]}>
      <Text style={[styles.text, { color: accent }]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
