import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card, Text } from '../ui/Paper';
import { CustomerColors } from '../customers/types';

interface ReportQuickStatCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  colors: CustomerColors;
  isCompact: boolean;
}

export function ReportQuickStatCard({
  label,
  value,
  icon,
  color,
  colors,
  isCompact,
}: ReportQuickStatCardProps) {
  return (
    <Card
      mode="outlined"
      style={[
        styles.statCard,
        { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
        isCompact && styles.statCardCompact,
      ]}
    >
      <Card.Content style={styles.statCardContent}>
        <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
          <Feather name={icon as any} size={24} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    borderRadius: 8,
  },
  statCardCompact: {
    width: '100%',
    flex: 0,
  },
  statCardContent: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  statIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});
