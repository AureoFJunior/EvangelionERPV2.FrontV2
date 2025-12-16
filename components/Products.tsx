import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ErpService, Product as ProductModel } from '../services/erpService';

const categories = ['all', 'Electronics', 'Accessories', 'Clothing'];

export function Products() {
  const { colors } = useTheme();
  const { client, isAuthenticated, loading: authLoading } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      return;
    }

    let active = true;

    const loadProducts = async () => {
      setLoading(true);
      setErrorMessage(null);

      const response = await erpService.fetchProducts();
      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        setProducts(response.data);
      } else {
        setErrorMessage(response.error ?? 'Unable to load products');
      }

      setLoading(false);
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = (product.name ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock':
        return colors.neonGreen;
      case 'Low Stock':
        return colors.accentOrange;
      case 'Out of Stock':
        return '#f72585';
      default:
        return colors.textMuted;
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonGreen }]}>PRODUCT INVENTORY</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage and track product catalog
          </Text>
          <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
        </View>

        {!isAuthenticated && !authLoading && (
          <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
              Authenticate to load live products.
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
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading products...</Text>
          </View>
        )}

        {!loading && filteredProducts.length === 0 && (
          <View style={[styles.emptyState, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
            <Feather name="package" size={20} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No products yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Add products or adjust filters to see items here.
            </Text>
          </View>
        )}

        {/* Category Filters */}
        <View style={styles.filterContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setFilterCategory(cat)}
              style={[
                styles.filterButton,
                { backgroundColor: colors.cardBgFrom, borderColor: filterCategory === cat ? colors.neonGreen : colors.cardBorder },
              ]}
            >
              <Text style={[styles.filterText, { color: filterCategory === cat ? colors.neonGreen : colors.textSecondary }]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search and Add */}
        <View style={styles.actionRow}>
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBgFrom, borderColor: colors.cardBorder }]}>
            <Feather name="search" size={20} color={colors.primaryPurple} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search products..."
              placeholderTextColor={colors.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primaryPurple }]}>
            <Feather name="plus" size={20} color={colors.neonGreen} />
          </TouchableOpacity>
        </View>

        {/* Product List */}
        <View style={styles.productList}>
          {filteredProducts.map((product) => (
            <View
              key={product.id}
              style={[styles.productCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
            >
              <View style={styles.productHeader}>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: colors.textPrimary }]}>{product.name}</Text>
                  <Text style={[styles.productCategory, { color: colors.textSecondary }]}>{product.category}</Text>
                </View>
                <TouchableOpacity>
                  <Feather name="more-vertical" size={20} color={colors.primaryPurple} />
                </TouchableOpacity>
              </View>

              <View style={styles.productDetails}>
                <View style={styles.detailRow}>
                  <Feather name="dollar-sign" size={16} color={colors.primaryPurple} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    ${((product.defaultValue ?? product.price) ?? 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Feather name="package" size={16} color={colors.primaryPurple} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    Stock: {product.storageQuantity ?? product.stock ?? 0}
                  </Text>
                </View>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(product.status)}20` }]}>
                <Text style={[styles.statusText, { color: getStatusColor(product.status) }]}>{product.status}</Text>
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
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
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
  productList: {
    gap: 16,
  },
  productCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
  },
  productDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
