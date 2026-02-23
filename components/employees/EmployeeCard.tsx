import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar, Card, Chip, IconButton, Text } from '../ui/Paper';
import { CustomerColors } from '../customers/types';
import { EmployeeRecord } from '../../utils/employees/data';
import { useI18n } from '../../contexts/I18nContext';

interface EmployeeCardProps {
  employee: EmployeeRecord;
  colors: CustomerColors;
  isCompact: boolean;
}

export function EmployeeCard({ employee, colors, isCompact }: EmployeeCardProps) {
  const { t } = useI18n();
  return (
    <Card
      mode="outlined"
      style={[styles.employeeCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
    >
      <Card.Content style={styles.employeeCardContent}>
        <View style={styles.employeeHeader}>
          <Avatar.Image
            source={{ uri: employee.image }}
            size={isCompact ? 72 : 80}
            style={[styles.photo, { borderColor: colors.neonGreen }]}
          />
          <View
            style={[
              styles.statusDot,
              { backgroundColor: colors.neonGreen, borderColor: colors.cardBgFrom },
            ]}
          />
        </View>

        <View style={styles.employeeInfo}>
          <Text style={[styles.employeeName, { color: colors.textPrimary }]}>{employee.name}</Text>
          <Text style={[styles.employeeRole, { color: colors.primaryPurple }]}>{t(employee.role)}</Text>
          <Chip
            style={[styles.departmentBadge, { backgroundColor: `${colors.primaryPurple}20` }]}
            textStyle={[styles.departmentText, { color: colors.primaryPurple }]}
          >
            {t(employee.department)}
          </Chip>
        </View>

        <View style={styles.contactInfo}>
          <View style={styles.contactRow}>
            <Feather name="mail" size={12} color={colors.primaryPurple} />
            <Text style={[styles.contactText, { color: colors.textSecondary }]} numberOfLines={1}>
              {employee.email}
            </Text>
          </View>
          <View style={styles.contactRow}>
            <Feather name="phone" size={12} color={colors.primaryPurple} />
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>{employee.phone}</Text>
          </View>
          <View style={styles.contactRow}>
            <Feather name="map-pin" size={12} color={colors.primaryPurple} />
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>{employee.location}</Text>
          </View>
        </View>

        <View style={styles.employeeFooter}>
          <Chip
            compact={isCompact}
            style={[
              styles.statusBadge,
              isCompact && styles.statusBadgeCompact,
              { backgroundColor: `${colors.neonGreen}20` },
            ]}
            textStyle={[
              styles.statusText,
              isCompact && styles.statusTextCompact,
              { color: colors.neonGreen },
            ]}
          >
            {t(employee.status)}
          </Chip>
          <IconButton
            icon={() => <Feather name="briefcase" size={16} color={colors.primaryPurple} />}
            size={18}
          />
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  employeeCard: {
    borderRadius: 8,
  },
  employeeCardContent: {
    alignItems: 'center',
    padding: 20,
  },
  employeeHeader: {
    position: 'relative',
    marginBottom: 16,
  },
  photo: {
    borderWidth: 2,
  },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  employeeInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  employeeName: {
    fontSize: 18,
    marginBottom: 4,
    textAlign: 'center',
  },
  employeeRole: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  departmentBadge: {
    borderRadius: 12,
  },
  departmentText: {
    fontSize: 11,
  },
  contactInfo: {
    width: '100%',
    marginBottom: 16,
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 12,
    flex: 1,
  },
  employeeFooter: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    borderRadius: 999,
  },
  statusBadgeCompact: {
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextCompact: {
    fontSize: 10,
  },
});
