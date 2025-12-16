import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ErpService, Order as OrderModel } from '../services/erpService';

const statuses = ['all', 'Pending', 'Processing', 'Shipped', 'Delivered'];

export function Orders() {
  const { colors } = useTheme();
  const { client, isAuthenticated, loading: authLoading } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [orders, setOrders] = useState<OrderModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      return;
    }

    let active = true;

    const loadOrders = async () => {
      setLoading(true);
      setErrorMessage(null);

      const response = await erpService.fetchOrders();
      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        setOrders(response.data);
      } else {
        setErrorMessage(response.error ?? 'Unable to load orders');
      }

      setLoading(false);
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading]);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return colors.accentOrange;
      case 'Processing':
        return colors.primaryPurple;
      case 'Shipped':
        return '#4a9eff';
      case 'Delivered':
        return colors.neonGreen;
      default:
        return colors.textMuted;
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonGreen }]}>ORDER TRACKING</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Monitor and manage customer orders
          </Text>
          <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
        </View>

        {!isAuthenticated && !authLoading && (
          <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
              Authenticate to load live orders.
            </Text>
          </View>
        )}

        {errorMessage && (
          <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
            <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{errorMessage}</Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.neonGreen} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading orders...</Text>
          </View>
        )}

        {!loading && filteredOrders.length === 0 && (
          <View style={[styles.emptyState, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
            <Feather name="shopping-cart" size={20} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No orders yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Orders will appear here as soon as they are placed.
            </Text>
          </View>
        )}

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {statuses.map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setFilterStatus(status)}
              style={[
                styles.filterButton,
                {
                  backgroundColor: colors.cardBgFrom,
                  borderColor: filterStatus === status ? colors.neonGreen : colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filterStatus === status ? colors.neonGreen : colors.textSecondary },
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search */}
        <View style={styles.actionRow}>
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBgFrom, borderColor: colors.cardBorder }]}>
            <Feather name="search" size={20} color={colors.primaryPurple} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search orders..."
              placeholderTextColor={colors.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
        </View>

        {/* Order List */}
        <View style={styles.orderList}>
          {filteredOrders.map((order) => (
            <View
              key={order.id}
              style={[styles.orderCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderIdContainer}>
                  <Text style={[styles.orderLabel, { color: colors.textMuted }]}>Order</Text>
                  <Text style={[styles.orderId, { color: colors.neonGreen }]}>#{order.id}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{order.status}</Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Feather name="user" size={16} color={colors.primaryPurple} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>{order.customer}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Feather name="calendar" size={16} color={colors.primaryPurple} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>{order.date}</Text>
                </View>
              </View>

              <View style={styles.orderFooter}>
                <View style={styles.detailRow}>
                  <Feather name="package" size={16} color={colors.textMuted} />
                  <Text style={[styles.detailText, { color: colors.textMuted }]}>{order.items} items</Text>
                </View>
                <Text style={[styles.orderTotal, { color: colors.textPrimary }]}>${order.total.toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.viewButton, { backgroundColor: colors.primaryPurple }]}
              >
                <Text style={[styles.viewButtonText, { color: colors.neonGreen }]}>View Details</Text>
              </TouchableOpacity>
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
  banner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 12,
  },
  loadingText: {
    fontSize: 12,
    marginLeft: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
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
    marginBottom: 24,
  },
  searchContainer: {
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
  orderList: {
    gap: 16,
  },
  orderCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderLabel: {
    fontSize: 12,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
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
  orderDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(127, 63, 242, 0.2)',
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
