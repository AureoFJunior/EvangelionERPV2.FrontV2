import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export function Customers() {
  const { colors } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');

  const customers = [
    { id: 1, name: 'Misato Katsuragi', email: 'misato@nerv.jp', orders: 12, spent: 1250.50, status: 'Active' },
    { id: 2, name: 'Ritsuko Akagi', email: 'ritsuko@nerv.jp', orders: 8, spent: 890.25, status: 'Active' },
    { id: 3, name: 'Gendo Ikari', email: 'gendo@nerv.jp', orders: 5, spent: 2150.00, status: 'VIP' },
    { id: 4, name: 'Kaji Ryoji', email: 'kaji@nerv.jp', orders: 15, spent: 750.75, status: 'Active' },
    { id: 5, name: 'Maya Ibuki', email: 'maya@nerv.jp', orders: 3, spent: 325.50, status: 'New' },
  ];

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VIP':
        return colors.accentOrange;
      case 'Active':
        return colors.neonGreen;
      case 'New':
        return colors.primaryPurple;
      default:
        return colors.textMuted;
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonGreen }]}>CUSTOMER MANAGEMENT</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track and manage customer relationships
          </Text>
          <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{customers.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Customers</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {customers.filter(c => c.status === 'VIP').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>VIP</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {customers.filter(c => c.status === 'New').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>New</Text>
          </View>
        </View>

        {/* Search and Add */}
        <View style={styles.actionRow}>
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBgFrom, borderColor: colors.cardBorder }]}>
            <Feather name="search" size={20} color={colors.primaryPurple} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search customers..."
              placeholderTextColor={colors.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primaryPurple }]}>
            <Feather name="plus" size={20} color={colors.neonGreen} />
          </TouchableOpacity>
        </View>

        {/* Customer List */}
        <View style={styles.customerList}>
          {filteredCustomers.map((customer) => (
            <View
              key={customer.id}
              style={[styles.customerCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
            >
              <View style={styles.customerHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.primaryPurple }]}>
                  <Text style={[styles.avatarText, { color: colors.neonGreen }]}>
                    {customer.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={[styles.customerName, { color: colors.textPrimary }]}>{customer.name}</Text>
                  <View style={styles.customerEmail}>
                    <Feather name="mail" size={12} color={colors.textMuted} />
                    <Text style={[styles.emailText, { color: colors.textSecondary }]}>{customer.email}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(customer.status)}20` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(customer.status) }]}>
                    {customer.status}
                  </Text>
                </View>
              </View>

              <View style={styles.customerStats}>
                <View style={styles.statItem}>
                  <Feather name="shopping-bag" size={16} color={colors.primaryPurple} />
                  <Text style={[styles.statItemText, { color: colors.textSecondary }]}>
                    {customer.orders} orders
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Feather name="dollar-sign" size={16} color={colors.neonGreen} />
                  <Text style={[styles.statItemText, { color: colors.textSecondary }]}>
                    ${customer.spent.toFixed(2)}
                  </Text>
                </View>
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
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
  customerList: {
    gap: 16,
  },
  customerCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
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
    fontWeight: 'bold',
    marginBottom: 4,
  },
  customerEmail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emailText: {
    fontSize: 12,
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
  customerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItemText: {
    fontSize: 12,
  },
});
