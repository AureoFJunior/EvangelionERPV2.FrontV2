import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Chip, Searchbar, Text } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { useResponsive } from '../hooks/useResponsive';
import { useEmployees } from '../hooks/employees/useEmployees';
import { EmployeeCard } from './employees/EmployeeCard';

export function Employees() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isCompact, contentPadding } = useResponsive();
  const {
    searchTerm,
    setSearchTerm,
    filterDepartment,
    setFilterDepartment,
    departments,
    filteredEmployees,
  } = useEmployees();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={[styles.content, { padding: contentPadding }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
            {t('EMPLOYEE MANAGEMENT')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}>
            {t('Manage NERV personnel and team members')}
          </Text>
          <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {departments.map((dept) => {
            const isSelected = filterDepartment === dept;
            return (
              <Chip
                key={dept}
                selected={isSelected}
                showSelectedCheck={false}
                icon={
                  isSelected
                    ? ({ size }) => (
                        <Feather name="check" size={Math.max(12, size - 2)} color={colors.neonGreen} />
                      )
                    : undefined
                }
                onPress={() => setFilterDepartment(dept)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.primaryPurple : colors.cardBgFrom,
                    borderColor: isSelected ? colors.primaryPurple : colors.cardBorder,
                  },
                ]}
                textStyle={[
                  styles.filterText,
                  { color: isSelected ? colors.neonGreen : colors.textSecondary },
                ]}
              >
                {t(dept.charAt(0).toUpperCase() + dept.slice(1))}
              </Chip>
            );
          })}
        </ScrollView>

        <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
          <Searchbar
            placeholder={t('Search employees...')}
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={[styles.searchBar, { backgroundColor: colors.inputBgFrom }]}
            iconColor={colors.primaryPurple}
            inputStyle={[styles.searchInput, { color: colors.textPrimary }]}
            placeholderTextColor={colors.textMuted}
          />
          <Button
            mode="contained"
            icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
            buttonColor={colors.primaryPurple}
            textColor={colors.neonGreen}
            style={[styles.addButton, isCompact && styles.addButtonCompact]}
            contentStyle={[styles.addButtonContent, isCompact && styles.addButtonContentCompact]}
            labelStyle={styles.addButtonLabel}
          >
            {t('Add')}
          </Button>
        </View>

        <View style={styles.employeeList}>
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              colors={colors}
              isCompact={isCompact}
            />
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
    letterSpacing: 1,
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 22,
    letterSpacing: 1.4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  subtitleCompact: {
    fontSize: 12,
  },
  headerLine: {
    height: 4,
    width: 100,
    borderRadius: 2,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 10,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  actionRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchBar: {
    flex: 1,
    borderRadius: 12,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  addButton: {
    borderRadius: 8,
    minHeight: 48,
  },
  addButtonCompact: {
    width: '100%',
    minHeight: 44,
    borderRadius: 10,
  },
  addButtonContent: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  addButtonContentCompact: {
    paddingVertical: 6,
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  employeeList: {
    gap: 16,
  },
});
