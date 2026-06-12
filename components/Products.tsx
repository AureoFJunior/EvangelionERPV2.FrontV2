import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBadge } from './StatusBadge';
import { SegmentedControl } from './SegmentedControl';
import { Button, Chip, IconButton, Searchbar } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { formatCurrency } from '../utils/currency';
import { ErpService, Product as ProductModel } from '../services/erpService';
import { NervLoader } from './NervLoader';
import { useResponsive } from '../hooks/useResponsive';
import {
  getStockStatus,
  getStorageQuantity,
  resolvePictureUri,
} from '../utils/products/form';
import { unitOptions } from './products/shared';
import { CreateProductModal } from './products/CreateProductModal';
import { EditProductModal } from './products/EditProductModal';
import { ProductDetailsModal } from './products/ProductDetailsModal';
import { DeactivateProductModal } from './products/DeactivateProductModal';

const statusFilters = ['active', 'deactivated', 'all'];
type ProductViewMode = 'detailed' | 'compact';
const PAGE_SIZE = 25;

const CAT_TONES: Record<string, 'primaryPurple' | 'neonGreen' | 'accentOrange'> = {
  Hardware: 'primaryPurple',
  Software: 'neonGreen',
  Services: 'accentOrange',
};

export function Products() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { client, isAuthenticated, loading: authLoading, currency } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const { width, isCompact, contentPadding, cardGap } = useResponsive();
  const productGridCols = width >= 1024 ? 4 : width >= 768 ? 3 : 2;
  const productCardGap = cardGap;
  const productCardWidth = Math.floor((width - contentPadding * 2 - productCardGap * (productGridCols - 1)) / productGridCols);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [unitFilter, setUnitFilter] = useState<string[]>([]);
  const [unitFilterOpen, setUnitFilterOpen] = useState(false);
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ProductViewMode>('detailed');
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductModel | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState<ProductModel | null>(null);
  const [confirmDeactivateProduct, setConfirmDeactivateProduct] = useState<ProductModel | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<ProductModel['id'] | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      return;
    }

    let active = true;
    const trimmedSearch = searchTerm.trim();

    const loadProducts = async () => {
      setLoading(true);
      setErrorMessage(null);

      const response = await erpService.fetchProducts(
        pageNumber,
        PAGE_SIZE,
        true,
        trimmedSearch ? { name: trimmedSearch } : { isActive: true, name: '' },
        true,
      );
      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        setProducts(response.data);
        setHasMore(response.data.length === PAGE_SIZE);
      } else {
        setErrorMessage(response.error ?? 'Unable to load products');
      }

      setLoading(false);
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading, pageNumber, searchTerm]);

  const goPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goNextPage = () => {
    if (hasMore) {
      setPageNumber((prev) => prev + 1);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = (product.name ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const isActive = product.isActive !== false;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && isActive) ||
      (filterStatus === 'deactivated' && !isActive);
    const productUnit = (product.unitOfMeasure ?? '').toUpperCase();
    const matchesUnit = unitFilter.length === 0 || unitFilter.includes(productUnit);
    return matchesSearch && matchesStatus && matchesUnit;
  });

  const toggleUnitFilter = (unit: string) => {
    setUnitFilter((current) =>
      current.includes(unit) ? current.filter((item) => item !== unit) : [...current, unit],
    );
  };

  const openEdit = (product: ProductModel) => {
    setEditingProduct(product);
  };

  const openDetails = (product: ProductModel) => {
    setDetailsProduct(product);
  };

  const requestDeactivate = (product: ProductModel) => {
    setConfirmDeactivateProduct(product);
  };

  const closeDeactivateConfirm = () => {
    setConfirmDeactivateProduct(null);
  };

  const confirmDeactivate = async () => {
    if (!confirmDeactivateProduct) return;
    setDeactivatingId(confirmDeactivateProduct.id);
    setErrorMessage(null);

    const response = await erpService.deleteProduct(confirmDeactivateProduct.id);
    if (response.ok) {
      setProducts((prev) =>
        prev.map((item) =>
          item.id === confirmDeactivateProduct.id ? { ...item, isActive: false } : item,
        ),
      );
    } else {
      setErrorMessage(response.error ?? t('Unable to deactivate product'));
    }

    setDeactivatingId(null);
    closeDeactivateConfirm();
  };

  if (loading) {
    return (
      <NervLoader
        variant="products"
        fullScreen
        label={t('Loading')}
        subtitle={t('Fetching product catalog...')}
      />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.content, { padding: contentPadding }]}>
        {/* Header */}
        <View style={[styles.header, !isCompact && styles.headerRow]}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }, isCompact && styles.titleCompact]}>
              {t('Products')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }, isCompact && styles.subtitleCompact]}>
              {`${filteredProducts.length} ${t('items in catalog')}`}
            </Text>
          </View>
          {!isCompact && (
            <View style={styles.headerActions}>
              <View style={[styles.viewToggleInline, { borderColor: colors.cardBorder, backgroundColor: colors.inputBgFrom }]}>
                <Pressable
                  onPress={() => setViewMode('detailed')}
                  style={(state: any) => [
                    styles.viewToggleBtn,
                    viewMode === 'detailed' && { backgroundColor: colors.cardBgFrom },
                    viewMode !== 'detailed' && state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
                  ]}
                >
                  {(state: any) => (
                    <Feather name="grid" size={14} color={viewMode === 'detailed' ? colors.textPrimary : (state.hovered ? colors.textPrimary : colors.textMuted)} />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setViewMode('compact')}
                  style={(state: any) => [
                    styles.viewToggleBtn,
                    viewMode === 'compact' && { backgroundColor: colors.cardBgFrom },
                    viewMode !== 'compact' && state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
                  ]}
                >
                  {(state: any) => (
                    <Feather name="list" size={14} color={viewMode === 'compact' ? colors.textPrimary : (state.hovered ? colors.textPrimary : colors.textMuted)} />
                  )}
                </Pressable>
              </View>
              <Button
                mode="outlined"
                onPress={() => setUnitFilterOpen((c) => !c)}
                icon={({ size }) => <Feather name="filter" size={size} color={colors.textSecondary} />}
                textColor={colors.textSecondary}
                style={[styles.headerBtn, { borderColor: colors.cardBorder }]}
                contentStyle={styles.headerBtnContent}
              >
                {t('Filter')}
              </Button>
              <Button
                mode="contained"
                onPress={() => setCreateVisible(true)}
                icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
                buttonColor={colors.primaryPurple}
                textColor="#fff"
                style={styles.headerBtn}
                contentStyle={styles.headerBtnContent}
              >
                {t('New Product')}
              </Button>
            </View>
          )}
        </View>

        {!isAuthenticated && !authLoading && (
          <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
              {t('Authenticate to load live products.')}
            </Text>
          </View>
        )}

        {errorMessage && (
          <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
            <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{errorMessage}</Text>
          </View>
        )}

        {!loading && filteredProducts.length === 0 && (
          <View style={[styles.emptyState, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
            <Feather name="package" size={20} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('No products yet')}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {t('Add products or adjust filters to see items here.')}
            </Text>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchRow}>
          <Searchbar
            placeholder={t('Search by name or SKU...')}
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={[styles.searchBar, { backgroundColor: colors.inputBgFrom, borderColor: colors.cardBorder }]}
            iconColor={colors.textMuted}
            inputStyle={[styles.searchInput, { color: colors.textPrimary }]}
            placeholderTextColor={colors.textMuted}
            elevation={0}
          />
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          <SegmentedControl
            options={statusFilters}
            selected={filterStatus}
            onSelect={setFilterStatus}
            labelFn={(v) => v === 'all' ? t('All') : v === 'active' ? t('Active') : t('Deactivated')}
          />
          <Pressable
            onPress={() => setUnitFilterOpen((current) => !current)}
            style={(state: any) => [
              styles.filterDropdownPressable,
              {
                backgroundColor: colors.cardBgFrom,
                borderColor: unitFilterOpen ? colors.primaryPurple : (unitFilter.length > 0 ? `${colors.primaryPurple}40` : colors.cardBorder),
              },
              state.hovered && { backgroundColor: 'rgba(255,255,255,0.04)' },
            ]}
          >
            {(state: any) => (
              <>
                <Feather name="filter" size={13} color={unitFilter.length > 0 ? colors.primaryPurple : (state.hovered ? colors.textPrimary : colors.textMuted)} />
                <Text
                  style={[
                    styles.filterDropdownText,
                    { color: unitFilter.length > 0 ? colors.primaryPurple : (state.hovered ? colors.textPrimary : colors.textSecondary) },
                  ]}
                  numberOfLines={1}
                >
                  {unitFilter.length === 0 ? t('Unit types') : unitFilter.join(', ')}
                </Text>
                <Feather
                  name={unitFilterOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={state.hovered ? colors.textPrimary : colors.textSecondary}
                />
                {unitFilter.length > 0 && (
                  <View style={[styles.filterCountBadge, { backgroundColor: colors.primaryPurple }]}>
                    <Text style={styles.filterCountText}>{unitFilter.length}</Text>
                  </View>
                )}
              </>
            )}
          </Pressable>
        </View>
        {unitFilterOpen && (
          <View style={[styles.unitDropdown, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
            <View style={styles.unitDropdownHeader}>
              <Text style={[styles.unitDropdownLabel, { color: colors.textSecondary }]}>{t('Filter by unit')}</Text>
              {unitFilter.length > 0 && (
                <Pressable
                  onPress={() => setUnitFilter([])}
                  style={(state: any) => [
                    styles.unitClearBtn,
                    state.hovered && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.unitClearText, { color: colors.textMuted }]}>{t('Clear all')}</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.unitChips}>
              {unitOptions.map((unit) => {
                const selected = unitFilter.includes(unit);
                return (
                  <Chip
                    key={unit}
                    selected={selected}
                    onPress={() => toggleUnitFilter(unit)}
                    style={[
                      styles.unitChip,
                      {
                        borderColor: selected ? colors.primaryPurple : colors.cardBorder,
                        backgroundColor: selected ? `${colors.primaryPurple}14` : colors.cardBgFrom,
                      },
                    ]}
                    textStyle={[styles.unitOptionText, { color: selected ? colors.primaryPurple : colors.textPrimary }]}
                  >
                    {unit}
                  </Chip>
                );
              })}
            </View>
          </View>
        )}

        {isCompact && (
          <Button
            mode="contained"
            onPress={() => setCreateVisible(true)}
            icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
            buttonColor={colors.primaryPurple}
            textColor="#fff"
            style={[styles.addButton, styles.addButtonCompact]}
            contentStyle={styles.addButtonContent}
          >
            {t('New Product')}
          </Button>
        )}

        <View style={[styles.paginationRow, isCompact && styles.paginationRowCompact]}>
          <Button
            mode="outlined"
            onPress={goPrevPage}
            disabled={pageNumber === 1}
            icon={({ size }) => <Feather name="chevron-left" size={size} color={colors.textSecondary} />}
            textColor={colors.textSecondary}
            style={[
              styles.paginationButton,
              { borderColor: colors.cardBorder },
              pageNumber === 1 && styles.paginationButtonDisabled,
            ]}
            contentStyle={styles.paginationButtonContent}
          >
            {t('Prev')}
          </Button>
          <Text style={[styles.pageIndicator, { color: colors.textPrimary }]}>{t('Page {page}', { page: pageNumber })}</Text>
          <Button
            mode="outlined"
            onPress={goNextPage}
            disabled={!hasMore}
            icon={({ size }) => <Feather name="chevron-right" size={size} color={colors.textSecondary} />}
            textColor={colors.textSecondary}
            style={[
              styles.paginationButton,
              { borderColor: colors.cardBorder },
              !hasMore && styles.paginationButtonDisabled,
            ]}
            contentStyle={styles.paginationButtonContent}
          >
            {t('Next')}
          </Button>
        </View>

        {/* Product List */}
        {viewMode === 'compact' && (
          <View style={styles.compactList}>
            {filteredProducts.map((product) => {
              const quantity = getStorageQuantity(product);
              const status = getStockStatus(quantity);
              const catColor = CAT_TONES[product.category ?? ''] ? colors[CAT_TONES[product.category ?? '']] : colors.textMuted;
              const unitLabel = product.unitOfMeasure ? product.unitOfMeasure.toUpperCase() : '-';
              const imageUri = resolvePictureUri(product);

              return (
                <Pressable
                  key={product.id}
                  onPress={() => openDetails(product)}
                  style={(state: any) => [
                    styles.compactRow,
                    { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
                    state.hovered && { borderColor: `${colors.primaryPurple}33` },
                  ]}
                >
                  <View style={[styles.compactIconBox, { backgroundColor: `${catColor}15`, overflow: 'hidden' }]}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.compactImage} resizeMode="cover" />
                    ) : (
                      <Feather name="package" size={16} color={catColor} />
                    )}
                  </View>
                  <View style={styles.compactInfo}>
                    <Text style={[styles.compactName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={[styles.compactSku, { color: colors.textMuted }]} numberOfLines={1}>
                      {unitLabel}
                    </Text>
                  </View>
                  {!isCompact && (
                    <Text style={[styles.compactCategory, { color: colors.textMuted }]} numberOfLines={1}>
                      {product.category ?? t('Uncategorized')}
                    </Text>
                  )}
                  <StatusBadge status={quantity <= 0 ? 'out-of-stock' : quantity <= 10 ? 'low-stock' : 'active'} label={status} />
                  <Text style={[styles.compactPrice, { color: colors.textPrimary }]}>
                    {formatCurrency((product.defaultValue ?? product.price) ?? 0, currency)}
                  </Text>
                  {!isCompact && (
                    <Text style={[styles.compactStock, { color: colors.textMuted }]}>
                      {quantity === 9999 ? t('Digital') : `${quantity} ${t('units')}`}
                    </Text>
                  )}
                  <View style={styles.compactActions}>
                    <IconButton
                      icon={() => <Feather name="info" size={14} color={colors.textSecondary} />}
                      size={18}
                      onPress={() => openDetails(product)}
                      style={[styles.compactActionButton, { borderColor: colors.cardBorder }]}
                    />
                    <IconButton
                      icon={() => <Feather name="edit-3" size={14} color={colors.primaryPurple} />}
                      size={18}
                      onPress={() => openEdit(product)}
                      style={[styles.compactActionButton, { borderColor: colors.cardBorder }]}
                    />
                    <IconButton
                      icon={() => <Feather name="trash-2" size={14} color={colors.destructive} />}
                      size={18}
                      onPress={() => requestDeactivate(product)}
                      disabled={deactivatingId === product.id}
                      style={[
                        styles.compactActionButton,
                        { borderColor: colors.cardBorder },
                        deactivatingId === product.id && styles.compactActionButtonDisabled,
                      ]}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {viewMode === 'detailed' && (
          <View style={[styles.productGrid, { gap: productCardGap }]}>
            {filteredProducts.map((product) => {
              const quantity = getStorageQuantity(product);
              const status = getStockStatus(quantity);
              const catColor = CAT_TONES[product.category ?? ''] ? colors[CAT_TONES[product.category ?? '']] : colors.textMuted;
              const imageUri = resolvePictureUri(product);

              return (
                <Pressable
                  key={product.id}
                  onPress={() => openDetails(product)}
                  style={(state: any) => [
                    styles.gridCard,
                    { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder, width: productCardWidth },
                    state.hovered && { borderColor: `${colors.primaryPurple}4D` },
                  ]}
                >
                  <View style={[styles.gridIconArea, { backgroundColor: `${catColor}12` }]}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.gridImage} resizeMode="cover" />
                    ) : (
                      <Feather name="package" size={40} color={catColor} />
                    )}
                  </View>
                  <StatusBadge status={quantity <= 0 ? 'out-of-stock' : quantity <= 10 ? 'low-stock' : 'active'} label={status} />
                  <Text style={[styles.gridName, { color: colors.textPrimary }]} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={[styles.gridCategory, { color: colors.textMuted }]}>
                    {product.unitOfMeasure?.toUpperCase() ?? '-'}
                  </Text>
                  <View style={[styles.gridFooter, { borderTopColor: colors.cardBorder }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.gridPrice, { color: colors.textPrimary }]}>
                        {formatCurrency((product.defaultValue ?? product.price) ?? 0, currency)}
                      </Text>
                      <Text style={[styles.gridStock, { color: colors.textMuted }]}>
                        {quantity === 9999 ? t('Digital') : `${quantity} ${t('units')}`}
                      </Text>
                    </View>
                    <View style={styles.gridActions}>
                      <IconButton
                        icon={() => <Feather name="edit-3" size={14} color={colors.primaryPurple} />}
                        size={16}
                        onPress={() => openEdit(product)}
                        style={[styles.gridActionBtn, { borderColor: colors.cardBorder }]}
                      />
                      <IconButton
                        icon={() => <Feather name="trash-2" size={14} color={colors.destructive} />}
                        size={16}
                        onPress={() => requestDeactivate(product)}
                        disabled={deactivatingId === product.id}
                        style={[
                          styles.gridActionBtn,
                          { borderColor: colors.cardBorder },
                          deactivatingId === product.id && { opacity: 0.4 },
                        ]}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          erpService={erpService}
          onClose={() => setEditingProduct(null)}
          onSaved={(updated) => {
            setProducts((prev) =>
              prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
            );
            setEditingProduct(null);
          }}
        />
      )}

      {createVisible && (
        <CreateProductModal
          erpService={erpService}
          onClose={() => setCreateVisible(false)}
          onCreated={(product) => {
            if (product) {
              setProducts((prev) => [product, ...prev]);
            }
            setCreateVisible(false);
          }}
        />
      )}

      {detailsProduct && (
        <ProductDetailsModal
          product={detailsProduct}
          erpService={erpService}
          onClose={() => setDetailsProduct(null)}
          onUpdated={(updated) => {
            setDetailsProduct(updated);
            setProducts((prev) =>
              prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
            );
          }}
        />
      )}

      {confirmDeactivateProduct && (
        <DeactivateProductModal
          product={confirmDeactivateProduct}
          deactivating={deactivatingId !== null}
          onCancel={closeDeactivateConfirm}
          onConfirm={confirmDeactivate}
        />
      )}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    borderRadius: 8,
  },
  headerBtnContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  viewToggleInline: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  viewToggleBtn: {
    padding: 6,
    borderRadius: 4,
    ...Platform.select({ web: { transition: 'all 0.15s ease', cursor: 'pointer' } as any, default: {} }),
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
    fontSize: 14,
    lineHeight: 20,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  searchRow: {
    marginBottom: 20,
  },
  banner: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 12,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterDropdownPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    minHeight: 40,
    ...Platform.select({ web: { transition: 'all 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  filterDropdownText: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 120,
  },
  filterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  paginationRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  paginationButton: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  paginationButtonContent: {
    paddingVertical: 4,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  pageIndicator: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchBar: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  addButton: {
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  addButtonCompact: {
    width: '100%',
  },
  compactList: {
    gap: 8,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer', transitionProperty: 'border-color', transitionDuration: '200ms' } as any }),
  },
  compactIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  compactImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  compactInfo: {
    flex: 1,
    minWidth: 0,
  },
  compactName: {
    fontSize: 14,
    fontWeight: '500',
  },
  compactSku: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  compactCategory: {
    fontSize: 12,
    flexShrink: 0,
  },
  compactPrice: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    width: 112,
    textAlign: 'right',
    flexShrink: 0,
  },
  compactStock: {
    fontSize: 12,
    width: 80,
    textAlign: 'right',
    flexShrink: 0,
  },
  compactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactActionButtonDisabled: {
    opacity: 0.5,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({ web: { cursor: 'pointer', transitionProperty: 'border-color', transitionDuration: '200ms' } as any }),
  },
  gridIconArea: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridName: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 19,
  },
  gridCategory: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  gridPrice: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  gridStock: {
    fontSize: 12,
  },
  gridActions: {
    flexDirection: 'row',
    gap: 4,
  },
  gridActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitDropdown: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  unitDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitDropdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  unitClearBtn: {
    ...Platform.select({ web: { cursor: 'pointer' } as any, default: {} }),
  },
  unitClearText: {
    fontSize: 12,
    fontWeight: '500',
  },
  unitChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  unitOptionText: {
    fontSize: 13,
  },
});
