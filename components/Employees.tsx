import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Searchbar, Text } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { useResponsive } from '../hooks/useResponsive';
import { useEmployees } from '../hooks/employees/useEmployees';
import { EmployeeCard } from './employees/EmployeeCard';

const DEPT_TONES: Record<string, 'primaryPurple' | 'neonGreen' | 'accentOrange' | 'secondaryPurple' | 'destructive'> = {
  Engineering: 'primaryPurple',
  Operations: 'primaryPurple',
  Finance: 'neonGreen',
  Sales: 'accentOrange',
  Design: 'secondaryPurple',
  HR: 'destructive',
  Science: 'neonGreen',
  Command: 'accentOrange',
};

export function Employees() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isCompact, isTablet, contentPadding, width } = useResponsive();
  const {
    searchTerm,
    setSearchTerm,
    filteredEmployees,
  } = useEmployees();

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filteredEmployees> = {};
    filteredEmployees.forEach((emp) => {
      const dept = emp.department || 'Other';
      (groups[dept] ??= []).push(emp);
    });
    return groups;
  }, [filteredEmployees]);

  const subtitle = `${filteredEmployees.length} ${t('staff members across')} ${Object.keys(grouped).length} ${t('departments')}`;

  // Determine number of columns based on width
  const numColumns = width >= 1024 ? 3 : width >= 640 ? 2 : 1;

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.content, { padding: contentPadding }]}>
        {/* Page Header */}
        <View style={[styles.header, !isCompact && styles.headerRow]}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }, isCompact && styles.titleCompact]}>
              {t('Employees')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {subtitle}
            </Text>
          </View>
          {!isCompact && (
            <Button
              mode="contained"
              icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
              buttonColor={colors.primaryPurple}
              textColor="#fff"
              style={styles.addButton}
              contentStyle={styles.addButtonContent}
            >
              {t('Add Employee')}
            </Button>
          )}
        </View>

        <View style={styles.searchRow}>
          <Searchbar
            placeholder={t('Search employees...')}
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={[styles.searchBar, { backgroundColor: colors.inputBgFrom }]}
            iconColor={colors.primaryPurple}
            inputStyle={[styles.searchInput, { color: colors.textPrimary }]}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Department groups */}
        <View style={styles.departmentList}>
          {Object.entries(grouped).map(([dept, members]) => {
            const deptColor = DEPT_TONES[dept] ? colors[DEPT_TONES[dept]] : colors.textMuted;
            return (
              <View key={dept} style={styles.deptSection}>
                {/* Department separator */}
                <View style={styles.deptHeader}>
                  <Text style={[styles.deptLabel, { color: deptColor }]}>
                    {t(dept.toUpperCase())}
                  </Text>
                  <View style={[styles.deptCount, { borderColor: colors.cardBorder }]}>
                    <Text style={[styles.deptCountText, { color: colors.textMuted }]}>
                      {members.length}
                    </Text>
                  </View>
                  <View style={[styles.deptLine, { backgroundColor: colors.cardBorder }]} />
                </View>

                {/* Employee cards grid */}
                <View style={[
                  styles.employeeGrid,
                  numColumns > 1 && styles.employeeGridMultiCol,
                ]}>
                  {members.map((employee) => (
                    <View
                      key={employee.id}
                      style={[
                        numColumns > 1 && {
                          width: `${(100 / numColumns) - 1}%` as any,
                        },
                      ]}
                    >
                      <EmployeeCard
                        employee={employee}
                        colors={colors}
                        isCompact={isCompact}
                      />
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
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
    paddingTop: 20,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
    lineHeight: 30,
  },
  titleCompact: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  searchRow: {
    marginBottom: 24,
  },
  searchBar: {
    borderRadius: 12,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  addButton: {
    borderRadius: 8,
  },
  addButtonContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  departmentList: {
    gap: 24,
  },
  deptSection: {},
  deptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  deptLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  deptCount: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  deptCountText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  deptLine: {
    flex: 1,
    height: 1,
  },
  employeeGrid: {
    gap: 12,
  },
  employeeGridMultiCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
