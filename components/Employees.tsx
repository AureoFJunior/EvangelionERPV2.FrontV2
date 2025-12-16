import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export function Employees() {
  const { colors } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');

  const employees = [
    {
      id: 1,
      name: 'Shinji Ikari',
      role: 'EVA Pilot / Administrator',
      department: 'Operations',
      email: 'shinji@nerv.com',
      phone: '+81 3-1234-5678',
      location: 'Tokyo-3',
      status: 'Active',
      image: 'https://images.unsplash.com/photo-1655249481446-25d575f1c054?w=200',
    },
    {
      id: 2,
      name: 'Rei Ayanami',
      role: 'EVA Pilot',
      department: 'Operations',
      email: 'rei@nerv.com',
      phone: '+81 3-2345-6789',
      location: 'Tokyo-3',
      status: 'Active',
      image: 'https://images.unsplash.com/photo-1655249493799-9cee4fe983bb?w=200',
    },
    {
      id: 3,
      name: 'Asuka Langley',
      role: 'EVA Pilot',
      department: 'Operations',
      email: 'asuka@nerv.com',
      phone: '+49 30-3456-7890',
      location: 'Germany',
      status: 'Active',
      image: 'https://images.unsplash.com/photo-1615702669705-0d3002c6801c?w=200',
    },
    {
      id: 4,
      name: 'Misato Katsuragi',
      role: 'Operations Director',
      department: 'Management',
      email: 'misato@nerv.com',
      phone: '+81 3-4567-8901',
      location: 'Tokyo-3',
      status: 'Active',
      image: 'https://images.unsplash.com/photo-1752860872185-78926b52ef77?w=200',
    },
  ];

  const departments = ['all', 'Operations', 'Management', 'Research'];

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || employee.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonGreen }]}>EMPLOYEE MANAGEMENT</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage NERV personnel and team members
          </Text>
          <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
        </View>

        {/* Department Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {departments.map((dept) => (
            <TouchableOpacity
              key={dept}
              onPress={() => setFilterDepartment(dept)}
              style={[
                styles.filterButton,
                {
                  backgroundColor: colors.cardBgFrom,
                  borderColor: filterDepartment === dept ? colors.neonGreen : colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filterDepartment === dept ? colors.neonGreen : colors.textSecondary },
                ]}
              >
                {dept.charAt(0).toUpperCase() + dept.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search and Add */}
        <View style={styles.actionRow}>
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBgFrom, borderColor: colors.cardBorder }]}>
            <Feather name="search" size={20} color={colors.primaryPurple} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search employees..."
              placeholderTextColor={colors.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primaryPurple }]}>
            <Feather name="plus" size={20} color={colors.neonGreen} />
          </TouchableOpacity>
        </View>

        {/* Employee List */}
        <View style={styles.employeeList}>
          {filteredEmployees.map((employee) => (
            <View
              key={employee.id}
              style={[styles.employeeCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
            >
              <View style={styles.employeeHeader}>
                <Image source={{ uri: employee.image }} style={[styles.photo, { borderColor: colors.neonGreen }]} />
                <View style={[styles.statusDot, { backgroundColor: colors.neonGreen, borderColor: colors.cardBgFrom }]} />
              </View>

              <View style={styles.employeeInfo}>
                <Text style={[styles.employeeName, { color: colors.textPrimary }]}>{employee.name}</Text>
                <Text style={[styles.employeeRole, { color: colors.primaryPurple }]}>{employee.role}</Text>
                <View style={[styles.departmentBadge, { backgroundColor: `${colors.primaryPurple}20` }]}>
                  <Text style={[styles.departmentText, { color: colors.primaryPurple }]}>{employee.department}</Text>
                </View>
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
                <View style={[styles.statusBadge, { backgroundColor: `${colors.neonGreen}20` }]}>
                  <Text style={[styles.statusText, { color: colors.neonGreen }]}>{employee.status}</Text>
                </View>
                <TouchableOpacity>
                  <Feather name="briefcase" size={16} color={colors.primaryPurple} />
                </TouchableOpacity>
              </View>
            </View>
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
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  headerLine: {
    height: 4,
    width: 100,
    borderRadius: 2,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    marginRight: 12,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeList: {
    gap: 16,
  },
  employeeCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  employeeHeader: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 16,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  employeeInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  employeeRole: {
    fontSize: 12,
    marginBottom: 8,
  },
  departmentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  departmentText: {
    fontSize: 10,
    fontWeight: '600',
  },
  contactInfo: {
    gap: 8,
    marginBottom: 16,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(127, 63, 242, 0.2)',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
