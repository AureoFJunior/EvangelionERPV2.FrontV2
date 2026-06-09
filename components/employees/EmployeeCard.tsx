import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../ui/Paper';
import { CustomerColors } from '../customers/types';
import { EmployeeRecord } from '../../utils/employees/data';
import { useI18n } from '../../contexts/I18nContext';
import { Avatar } from '../Avatar';
import { StatusBadge } from '../StatusBadge';

interface EmployeeCardProps {
  employee: EmployeeRecord;
  colors: CustomerColors;
  isCompact: boolean;
}

export function EmployeeCard({ employee, colors, isCompact }: EmployeeCardProps) {
  const { t } = useI18n();
  return (
    <Pressable
      style={(state: any) => [
        styles.card,
        {
          backgroundColor: colors.cardBgFrom,
          borderColor: colors.cardBorder,
        },
        !isCompact && styles.cardTablet,
        state.hovered && { borderColor: `${colors.primaryPurple}33` },
      ]}
    >
      <Avatar name={employee.name} imageUri={employee.image} size="md" />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {employee.name}
          </Text>
          {employee.status.toLowerCase() !== 'active' && <StatusBadge status={employee.status} />}
        </View>
        <Text style={[styles.role, { color: colors.textMuted }]} numberOfLines={1}>
          {t(employee.role)}
        </Text>
        <View style={styles.emailRow}>
          <Feather name="mail" size={10} color={colors.textMuted} />
          <Text style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>
            {employee.email}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    ...Platform.select({ web: { transition: 'border-color 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  cardTablet: {
    flex: 1,
    minWidth: 240,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  role: {
    fontSize: 12,
    marginTop: 2,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  email: {
    fontSize: 12,
    flex: 1,
  },
});
