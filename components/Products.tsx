import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import {
  Button,
  Card,
  Chip,
  HelperText,
  IconButton,
  Searchbar,
  TextInput as PaperTextInput,
  TouchableRipple,
} from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { formatCurrency } from '../utils/currency';
import { ErpService, Product as ProductModel } from '../services/erpService';
import { NervLoader } from './NervLoader';
import { useResponsive } from '../hooks/useResponsive';
import {
  getNumberError,
  getQuantityError,
  getStatusColor,
  getStockStatus,
  getStorageQuantity,
  parseNumber,
  resolveFileSource,
  resolvePictureUri,
  sanitizeNumericInput,
  sanitizeQuantityInput,
  unitAllowsDecimal,
} from '../utils/products/form';

const statusFilters = ['active', 'deactivated', 'all'];
const unitOptions = ['UN', 'KG', 'L', 'M', 'CM', 'BOX'];
type ProductViewMode = 'detailed' | 'compact';

export function Products() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { client, isAuthenticated, loading: authLoading, enterpriseId, currency } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const { isCompact, isTablet, contentPadding } = useResponsive();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [unitFilter, setUnitFilter] = useState<string[]>([]);
  const [unitFilterOpen, setUnitFilterOpen] = useState(false);
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ProductViewMode>('detailed');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(25);
  const [hasMore, setHasMore] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductModel | null>(null);
  const [editName, setEditName] = useState('');
  const [editPicture, setEditPicture] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editDefaultValue, setEditDefaultValue] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editIsExternal, setEditIsExternal] = useState(true);
  const [editIsService, setEditIsService] = useState(false);
  const [editUnitOpen, setEditUnitOpen] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [showEditErrors, setShowEditErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<ProductModel['id'] | null>(null);
  const [menuProductId, setMenuProductId] = useState<ProductModel['id'] | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPicture, setCreatePicture] = useState('');
  const [createPictureFile, setCreatePictureFile] = useState('');
  const [createPictureMime, setCreatePictureMime] = useState('image/jpeg');
  const [createQuantity, setCreateQuantity] = useState('');
  const [createDefaultValue, setCreateDefaultValue] = useState('');
  const [createUnit, setCreateUnit] = useState('');
  const [createIsExternal, setCreateIsExternal] = useState(true);
  const [createIsService, setCreateIsService] = useState(false);
  const [createUnitOpen, setCreateUnitOpen] = useState(false);
  const [createFile, setCreateFile] = useState('');
  const [createFileName, setCreateFileName] = useState('');
  const [showCreateErrors, setShowCreateErrors] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState<ProductModel | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

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
        pageSize,
        true,
        trimmedSearch ? { name: trimmedSearch } : { isActive: true, name: '' },
      );
      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        setProducts(response.data);
        setHasMore(response.data.length === pageSize);
      } else {
        setErrorMessage(response.error ?? t('Unable to load products'));
      }

      setLoading(false);
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading, pageNumber, pageSize, searchTerm]);

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

  const openEdit = (product: ProductModel) => {
    setMenuProductId(null);
    setEditingProduct(product);
    setEditName(product.name ?? '');
    setEditPicture(product.pictureAddress ?? '');
    setEditQuantity(String(getStorageQuantity(product)));
    setEditDefaultValue(String(product.defaultValue ?? product.price ?? 0));
    setEditUnit((product.unitOfMeasure ?? '').toUpperCase());
    setEditIsExternal(product.isExternal ?? true);
    setEditIsService(product.isService ?? false);
    setShowEditErrors(false);
    setEditVisible(true);
  };

  const closeEdit = () => {
    setEditVisible(false);
    setEditingProduct(null);
    setEditName('');
    setEditPicture('');
    setEditQuantity('');
    setEditDefaultValue('');
    setEditUnit('');
    setEditIsExternal(true);
    setEditIsService(false);
    setEditUnitOpen(false);
    setShowEditErrors(false);
  };

  const openCreate = () => {
    setCreateName('');
    setCreateDescription('');
    setCreatePicture('');
    setCreatePictureFile('');
    setCreatePictureMime('image/jpeg');
    setCreateQuantity('');
    setCreateDefaultValue('');
    setCreateUnit('');
    setCreateIsExternal(true);
    setCreateIsService(false);
    setCreateUnitOpen(false);
    setCreateFile('');
    setCreateFileName('');
    setShowCreateErrors(false);
    setCreateVisible(true);
  };

  const closeCreate = () => {
    setCreateVisible(false);
    setCreateName('');
    setCreateDescription('');
    setCreatePicture('');
    setCreatePictureFile('');
    setCreatePictureMime('image/jpeg');
    setCreateQuantity('');
    setCreateDefaultValue('');
    setCreateUnit('');
    setCreateIsExternal(true);
    setCreateIsService(false);
    setCreateUnitOpen(false);
    setCreateFile('');
    setCreateFileName('');
    setShowCreateErrors(false);
  };

  const editQuantityError = getQuantityError(editQuantity, editUnit);
  const editDefaultValueError = getNumberError(editDefaultValue, { required: true, allowZero: true });
  const createQuantityError = getQuantityError(createQuantity, createUnit);
  const createDefaultValueError = getNumberError(createDefaultValue, { required: true, allowZero: true });
  const showEditQuantityError = (showEditErrors || editQuantity.trim().length > 0) && !!editQuantityError;
  const showEditDefaultValueError =
    (showEditErrors || editDefaultValue.trim().length > 0) && !!editDefaultValueError;
  const showCreateQuantityError =
    (showCreateErrors || createQuantity.trim().length > 0) && !!createQuantityError;
  const showCreateDefaultValueError =
    (showCreateErrors || createDefaultValue.trim().length > 0) && !!createDefaultValueError;
  const saveDisabled =
    saving || !!editQuantityError || !!editDefaultValueError || !editName.trim();
  const createDisabled =
    creating || !!createQuantityError || !!createDefaultValueError || !createName.trim();

  const toggleUnitFilter = (unit: string) => {
    setUnitFilter((current) =>
      current.includes(unit) ? current.filter((item) => item !== unit) : [...current, unit],
    );
  };

  const handleSave = async () => {
    setShowEditErrors(true);
    if (!editingProduct) {
      return;
    }

    const name = editName.trim();
    if (!name) {
      setErrorMessage(t('Product name is required.'));
      return;
    }
    if (editQuantityError) {
      setErrorMessage(t('Storage quantity: {message}.', { message: t(editQuantityError) }));
      return;
    }
    if (editDefaultValueError) {
      setErrorMessage(t('Default value: {message}.', { message: t(editDefaultValueError) }));
      return;
    }

    const resolvedEnterpriseId = editingProduct.enterpriseId ?? enterpriseId;
    if (!resolvedEnterpriseId) {
      setErrorMessage(t('Product must have an enterprise.'));
      return;
    }

    const quantity = parseNumber(editQuantity);
    const defaultValue = parseNumber(editDefaultValue);

    setSaving(true);
    setErrorMessage(null);

    const payload: ProductModel = {
      ...editingProduct,
      name,
      pictureAddress: editPicture.trim(),
      storageQuantity: quantity ?? undefined,
      stock: quantity ?? undefined,
      defaultValue: defaultValue ?? undefined,
      price: defaultValue ?? undefined,
      unitOfMeasure: editUnit.trim().toUpperCase(),
      isExternal: editIsExternal,
      isService: editIsService,
      enterpriseId: resolvedEnterpriseId,
      isActive: editingProduct.isActive ?? true,
    };

    const response = await erpService.updateProduct(payload);
    if (response.ok) {
      setProducts((prev) =>
        prev.map((item) => (item.id === editingProduct.id ? { ...item, ...payload } : item)),
      );
      closeEdit();
    } else {
      setErrorMessage(response.error ?? t('Unable to update product'));
    }

    setSaving(false);
  };

  const handleCreate = async () => {
      setShowCreateErrors(true);
    if (!enterpriseId) {
      setErrorMessage(t('Product must have an enterprise.'));
      return;
    }

    const name = createName.trim();
    if (!name) {
      setErrorMessage(t('Product name is required.'));
      return;
    }
    if (createQuantityError) {
      setErrorMessage(t('Storage quantity: {message}.', { message: t(createQuantityError) }));
      return;
    }
    if (createDefaultValueError) {
      setErrorMessage(t('Default value: {message}.', { message: t(createDefaultValueError) }));
      return;
    }

    const filePayload = createFile || createPictureFile;
    if (!filePayload) {
      setErrorMessage(t('Product image is required.'));
      return;
    }

    const quantity = parseNumber(createQuantity);
    const defaultValue = parseNumber(createDefaultValue);

    setCreating(true);
    setErrorMessage(null);

    const now = new Date().toISOString();
    const payload = {
      name,
      description: createDescription.trim(),
      storageQuantity: quantity,
      defaultValue,
      unitOfMeasure: createUnit.trim().toUpperCase(),
      enterpriseId,
      isExternal: createIsExternal,
      isService: createIsService,
      pictureAdress: createPicture.trim(),
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    const response = await erpService.createProduct({
      product: payload as ProductModel,
      file: filePayload,
    });
    if (response.ok) {
      if (response.data) {
        setProducts((prev) => [response.data as ProductModel, ...prev]);
      }
      closeCreate();
    } else {
      setErrorMessage(response.error ?? t('Unable to create product'));
    }

    setCreating(false);
  };

  const pickImage = async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage(t('Gallery permission is required to select a picture.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      base64: true,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'picture';
    setCreatePicture(fileName);
    setCreatePictureFile(asset.base64 ?? '');
    setCreatePictureMime(asset.mimeType ?? 'image/jpeg');

    if (!asset.base64 && asset.uri) {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setCreatePictureFile(base64);
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    setCreateFileName(asset.name ?? 'file');

    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    setCreateFile(base64);
  };

  const openDetails = (product: ProductModel) => {
    setMenuProductId(null);
    setDetailsProduct(product);
    setDetailsVisible(true);
  };

  const closeDetails = () => {
    setDetailsVisible(false);
    setDetailsProduct(null);
  };

  const handleDeactivate = (product: ProductModel) => {
    Alert.alert(
      t('Deactivate product'),
      t('Deactivate {name}?', { name: product.name ?? t('this product') }),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Deactivate'),
          style: 'destructive',
          onPress: async () => {
            const resolvedEnterpriseId = product.enterpriseId ?? enterpriseId;
            if (!resolvedEnterpriseId) {
              setErrorMessage(t('Product must have an enterprise.'));
              return;
            }

            setDeactivatingId(product.id);
            setErrorMessage(null);

            const response = await erpService.deleteProduct(product.id);
            if (response.ok) {
              setProducts((prev) =>
                prev.map((item) =>
                  item.id === product.id ? { ...item, isActive: false } : item,
                ),
              );
            } else {
              setErrorMessage(response.error ?? t('Unable to deactivate product'));
            }

            setDeactivatingId(null);
          },
        },
      ],
      { cancelable: true },
    );
  };

  if (loading) {
    return (
      <NervLoader
        fullScreen
        label={t('Synchronizing EVA-01')}
        subtitle={t('LCL circulation nominal | Loading products...')}
      />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={[styles.content, { padding: contentPadding }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
            {t('PRODUCT INVENTORY')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}>
            {t('Manage and track product catalog')}
          </Text>
          <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
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

        <View style={styles.filterContainer}>
          <Button
            mode="outlined"
            onPress={() => setUnitFilterOpen((current) => !current)}
            icon={({ size }) => (
              <Feather
                name={unitFilterOpen ? 'chevron-up' : 'chevron-down'}
                size={size}
                color={colors.textSecondary}
              />
            )}
            textColor={colors.textSecondary}
            style={[
              styles.filterButton,
              styles.filterDropdownButton,
              {
                backgroundColor: colors.cardBgFrom,
                borderColor: unitFilterOpen ? colors.neonGreen : colors.cardBorder,
              },
            ]}
            contentStyle={styles.filterButtonContent}
          >
            {unitFilter.length === 0 ? t('Unit types') : unitFilter.join(', ')}
          </Button>
        </View>
        {unitFilterOpen && (
          <View style={[styles.unitDropdown, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
            <View style={styles.unitChips}>
              {unitOptions.map((unit) => {
                const selected = unitFilter.includes(unit);
                return (
                  <Chip
                    key={unit}
                    selected={selected}
                    showSelectedCheck={false}
                    icon={
                      selected
                        ? ({ size }) => <Feather name="check" size={Math.max(12, size - 2)} color={colors.neonGreen} />
                        : undefined
                    }
                    onPress={() => toggleUnitFilter(unit)}
                    style={[
                      styles.unitChip,
                      {
                        borderColor: selected ? colors.primaryPurple : colors.cardBorder,
                        backgroundColor: selected ? colors.primaryPurple : colors.cardBgFrom,
                      },
                    ]}
                    textStyle={[styles.unitOptionText, { color: selected ? colors.neonGreen : colors.textSecondary }]}
                  >
                    {unit}
                  </Chip>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.filterContainer}>
          {statusFilters.map((status) => {
            const isSelected = filterStatus === status;
            return (
              <Chip
                key={status}
                selected={isSelected}
                showSelectedCheck={false}
                icon={
                  isSelected
                    ? ({ size }) => (
                        <Feather name="check" size={Math.max(12, size - 2)} color={colors.neonGreen} />
                      )
                    : undefined
                }
                onPress={() => setFilterStatus(status)}
                style={[
                  styles.filterButton,
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
                {status === 'all' ? t('All') : status === 'active' ? t('Active') : t('Deactivated')}
              </Chip>
            );
          })}
        </View>

        {/* Search and Add */}
        <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
          <Searchbar
            placeholder={t('Search products...')}
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={[styles.searchBar, { backgroundColor: colors.inputBgFrom }]}
            iconColor={colors.primaryPurple}
            inputStyle={[styles.searchInput, { color: colors.textPrimary }]}
            placeholderTextColor={colors.textMuted}
          />
          <Button
            mode="contained"
            onPress={openCreate}
            icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
            buttonColor={colors.primaryPurple}
            textColor={colors.appBg}
            style={[styles.addButton, isCompact && styles.addButtonCompact]}
            contentStyle={[styles.addButtonContent, isCompact && styles.addButtonContentCompact]}
            labelStyle={styles.addButtonLabel}
          >
            {t('Add')}
          </Button>
        </View>

        <View style={[styles.viewRow, isCompact && styles.viewRowCompact]}>
          <Text style={[styles.viewLabel, { color: colors.textSecondary }]}>{t('View')}</Text>
          <View
            style={[
              styles.viewToggle,
              styles.segmentedControl,
              { borderColor: colors.cardBorder, backgroundColor: colors.sidebarBgTo },
            ]}
          >
              {([
              { value: 'detailed', label: t('Detailed') },
              { value: 'compact', label: t('Compact') },
            ] as const).map((option, index, array) => {
              const isActive = viewMode === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setViewMode(option.value)}
                  style={({ pressed }) => [
                    styles.segmentButton,
                    index === 0 && styles.segmentButtonFirst,
                    index === array.length - 1 && styles.segmentButtonLast,
                    index < array.length - 1 && { borderRightWidth: 1, borderRightColor: colors.cardBorder },
                    isActive && { backgroundColor: colors.primaryPurple },
                    pressed && styles.segmentButtonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentButtonLabel,
                      { color: isActive ? colors.neonGreen : colors.textSecondary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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
              const statusColor = getStatusColor(quantity, colors);
              const unitLabel = product.unitOfMeasure ? product.unitOfMeasure.toUpperCase() : '-';

                return (
                  <Card
                    key={product.id}
                    mode="outlined"
                    style={[styles.compactCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
                  >
                    <Card.Content style={styles.compactCardContent}>
                      <View style={[styles.compactTop, isCompact && styles.compactTopCompact]}>
                        <View style={styles.compactInfo}>
                          <Text style={[styles.compactName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {product.name}
                          </Text>
                          <Text style={[styles.compactMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                            {(product.category ?? t('Uncategorized'))} | {unitLabel}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            isCompact && styles.statusBadgeCompact,
                            { backgroundColor: `${statusColor}20` },
                          ]}
                        >
                          <Text style={[styles.statusText, isCompact && styles.statusTextCompact, { color: statusColor }]}>
                            {t(status)}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.compactBottom, isCompact && styles.compactBottomCompact]}>
                        <View style={styles.compactStats}>
                          <View style={styles.detailRow}>
                            <Feather name="dollar-sign" size={14} color={colors.primaryPurple} />
                            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                              {formatCurrency((product.defaultValue ?? product.price) ?? 0, currency)}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Feather name="package" size={14} color={colors.primaryPurple} />
                            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                              {t('Stock')}: {quantity}
                            </Text>
                          </View>
                        </View>
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
                            icon={() => <Feather name="trash-2" size={14} color="#f72585" />}
                            size={18}
                            onPress={() => handleDeactivate(product)}
                            disabled={deactivatingId === product.id}
                            style={[
                              styles.compactActionButton,
                              { borderColor: colors.cardBorder },
                              deactivatingId === product.id && styles.compactActionButtonDisabled,
                            ]}
                          />
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          )}

        {viewMode === 'detailed' && (
          <View style={styles.productList}>
            {filteredProducts.map((product) => {
              const quantity = getStorageQuantity(product);
              const status = getStockStatus(quantity);
              const statusColor = getStatusColor(quantity, colors);
              const isMenuOpen = menuProductId === product.id;
              const imageUri = resolvePictureUri(product);

                return (
                  <Card
                    key={product.id}
                    mode="outlined"
                    style={[styles.productCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
                  >
                    <Card.Content style={styles.productCardContent}>
                      <View style={[styles.productMedia, isCompact && styles.productMediaCompact]}>
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} style={styles.productMediaImage} />
                        ) : (
                          <View style={[styles.productMediaFallback, { borderColor: colors.cardBorder }]}>
                            <Feather name="image" size={20} color={colors.textMuted} />
                            <Text style={[styles.productMediaText, { color: colors.textMuted }]}>{t('No image')}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.productHeader}>
                        <View style={styles.productInfo}>
                          <Text style={[styles.productName, { color: colors.textPrimary }]}>{product.name}</Text>
                          <Text style={[styles.productCategory, { color: colors.textSecondary }]}>{product.category}</Text>
                        </View>
                        <IconButton
                          icon={() => <Feather name="more-vertical" size={18} color={colors.primaryPurple} />}
                          size={18}
                          onPress={() =>
                            setMenuProductId((current) => (current === product.id ? null : product.id))
                          }
                          testID={`product-menu-${product.id}`}
                        />
                      </View>

                      <View style={styles.productDetails}>
                        <View style={styles.detailRow}>
                          <Feather name="dollar-sign" size={16} color={colors.primaryPurple} />
                          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                            {formatCurrency((product.defaultValue ?? product.price) ?? 0, currency)}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Feather name="package" size={16} color={colors.primaryPurple} />
                          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                            {t('Stock')}: {quantity}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Feather name="hash" size={16} color={colors.primaryPurple} />
                          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                            {t('Unit')}: {product.unitOfMeasure ? product.unitOfMeasure.toUpperCase() : '-'}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          isCompact && styles.statusBadgeCompact,
                          { backgroundColor: `${statusColor}20` },
                        ]}
                      >
                        <Text style={[styles.statusText, isCompact && styles.statusTextCompact, { color: statusColor }]}>
                          {t(status)}
                        </Text>
                      </View>

                      {isMenuOpen && (
                        <View style={[styles.menuCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
                          <TouchableRipple style={styles.menuItem} onPress={() => openDetails(product)}>
                            <View style={styles.menuItemContent}>
                              <Feather name="info" size={14} color={colors.textSecondary} />
                              <Text style={[styles.menuLabel, { color: colors.textSecondary }]}>{t('Details')}</Text>
                            </View>
                          </TouchableRipple>
                          <TouchableRipple style={styles.menuItem} onPress={() => openEdit(product)}>
                            <View style={styles.menuItemContent}>
                              <Feather name="edit-3" size={14} color={colors.primaryPurple} />
                              <Text style={[styles.menuLabel, { color: colors.primaryPurple }]}>{t('Edit')}</Text>
                            </View>
                          </TouchableRipple>
                          <TouchableRipple
                            style={styles.menuItem}
                            onPress={() => {
                              setMenuProductId(null);
                              handleDeactivate(product);
                            }}
                            disabled={deactivatingId === product.id}
                          >
                            <View style={styles.menuItemContent}>
                              <Feather name="trash-2" size={14} color="#f72585" />
                              <Text style={[styles.menuLabel, { color: '#f72585' }]}>
                                {deactivatingId === product.id ? t('Deactivating...') : t('Deactivate')}
                              </Text>
                            </View>
                          </TouchableRipple>
                        </View>
                      )}
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          )}
      </View>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isTablet && styles.modalCardWide,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('Edit Product')}</Text>
              <IconButton
                icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
                size={18}
                onPress={closeEdit}
                style={[styles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Name')}</Text>
              <PaperTextInput
                mode="outlined"
                style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                contentStyle={styles.modalInputContent}
                outlineStyle={styles.modalInputOutline}
                textColor={colors.textPrimary}
                outlineColor={colors.cardBorder}
                activeOutlineColor={colors.primaryPurple}
                value={editName}
                onChangeText={setEditName}
                placeholder={t('Product name')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Picture URL')}</Text>
              <PaperTextInput
                mode="outlined"
                style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                contentStyle={styles.modalInputContent}
                outlineStyle={styles.modalInputOutline}
                textColor={colors.textPrimary}
                outlineColor={colors.cardBorder}
                activeOutlineColor={colors.primaryPurple}
                value={editPicture}
                onChangeText={setEditPicture}
                placeholder="https://..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Storage Quantity')}</Text>
              <PaperTextInput
                mode="outlined"
                style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                contentStyle={styles.modalInputContent}
                outlineStyle={styles.modalInputOutline}
                textColor={colors.textPrimary}
                outlineColor={colors.cardBorder}
                activeOutlineColor={colors.primaryPurple}
                value={editQuantity}
                onChangeText={(value) => setEditQuantity(sanitizeQuantityInput(value, editUnit))}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType={unitAllowsDecimal(editUnit) ? 'decimal-pad' : 'numeric'}
                inputMode={unitAllowsDecimal(editUnit) ? 'decimal' : 'numeric'}
                error={showEditQuantityError}
              />
              <HelperText type="error" visible={showEditQuantityError} style={styles.fieldHelper}>
                {editQuantityError ?? ''}
              </HelperText>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Default Value')}</Text>
              <PaperTextInput
                mode="outlined"
                style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                contentStyle={styles.modalInputContent}
                outlineStyle={styles.modalInputOutline}
                textColor={colors.textPrimary}
                outlineColor={colors.cardBorder}
                activeOutlineColor={colors.primaryPurple}
                value={editDefaultValue}
                onChangeText={(value) => setEditDefaultValue(sanitizeNumericInput(value))}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                inputMode="decimal"
                error={showEditDefaultValueError}
              />
              <HelperText type="error" visible={showEditDefaultValueError} style={styles.fieldHelper}>
                {editDefaultValueError ?? ''}
              </HelperText>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Unit of Measure')}</Text>
              <Button
                mode="outlined"
                onPress={() => setEditUnitOpen((current) => !current)}
                icon={({ size }) => (
                  <Feather name={editUnitOpen ? 'chevron-up' : 'chevron-down'} size={size} color={colors.textSecondary} />
                )}
                textColor={editUnit ? colors.textPrimary : colors.textMuted}
                style={[styles.modalInput, styles.dropdownButton, { borderColor: colors.cardBorder }]}
                contentStyle={styles.dropdownButtonContent}
              >
                {editUnit || t('Select unit')}
              </Button>
              {editUnitOpen && (
                <View style={[styles.dropdownList, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                  <View style={styles.unitChips}>
                    {unitOptions.map((unit) => (
                      <Chip
                        key={unit}
                        selected={editUnit === unit}
                        onPress={() => {
                          setEditUnit(unit);
                          setEditQuantity((current) => sanitizeQuantityInput(current, unit));
                          setEditUnitOpen(false);
                        }}
                        icon={editUnit === unit ? 'check' : undefined}
                        style={[
                          styles.unitChip,
                          {
                            borderColor: editUnit === unit ? colors.neonGreen : colors.cardBorder,
                            backgroundColor: editUnit === unit ? `${colors.neonGreen}1A` : colors.cardBgTo,
                          },
                        ]}
                        textStyle={[styles.dropdownItemText, { color: colors.textPrimary }]}
                      >
                        {unit}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.toggleRow, isCompact && styles.toggleRowCompact]}>
              <Chip
                selected={editIsExternal}
                onPress={() => setEditIsExternal((current) => !current)}
                icon={editIsExternal ? 'check' : undefined}
                style={[
                  styles.toggleButton,
                  { borderColor: colors.cardBorder },
                  editIsExternal ? { backgroundColor: `${colors.primaryPurple}1A` } : { backgroundColor: colors.cardBgTo },
                ]}
                textStyle={[styles.toggleLabel, { color: colors.textSecondary }]}
              >
                {t('External')}: {editIsExternal ? t('Yes') : t('No')}
              </Chip>
              <Chip
                selected={editIsService}
                onPress={() => setEditIsService((current) => !current)}
                icon={editIsService ? 'check' : undefined}
                style={[
                  styles.toggleButton,
                  { borderColor: colors.cardBorder },
                  editIsService ? { backgroundColor: `${colors.primaryPurple}1A` } : { backgroundColor: colors.cardBgTo },
                ]}
                textStyle={[styles.toggleLabel, { color: colors.textSecondary }]}
              >
                {t('Service')}: {editIsService ? t('Yes') : t('No')}
              </Chip>
            </View>

            <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
              <Button
                mode="outlined"
                onPress={closeEdit}
                disabled={saving}
                textColor={colors.textSecondary}
                style={[styles.modalButton, { borderColor: colors.cardBorder }]}
                contentStyle={styles.modalButtonContent}
                labelStyle={styles.modalButtonLabel}
              >
                {t('Cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                disabled={saveDisabled}
                buttonColor={colors.primaryPurple}
                textColor={colors.appBg}
                style={styles.modalButton}
                contentStyle={styles.modalButtonContent}
                labelStyle={styles.modalButtonLabel}
              >
                {saving ? t('Saving...') : t('Save')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={createVisible} transparent animationType="fade" onRequestClose={closeCreate}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isTablet && styles.modalCardWide,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('New Product')}</Text>
              <IconButton
                icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
                size={18}
                onPress={closeCreate}
                style={[styles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Name')}</Text>
              <PaperTextInput
                mode="outlined"
                style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                contentStyle={styles.modalInputContent}
                outlineStyle={styles.modalInputOutline}
                textColor={colors.textPrimary}
                outlineColor={colors.cardBorder}
                activeOutlineColor={colors.primaryPurple}
                value={createName}
                onChangeText={setCreateName}
                placeholder={t('Product name')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Description')}</Text>
              <PaperTextInput
                mode="outlined"
                style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                contentStyle={styles.modalInputContent}
                outlineStyle={styles.modalInputOutline}
                textColor={colors.textPrimary}
                outlineColor={colors.cardBorder}
                activeOutlineColor={colors.primaryPurple}
                value={createDescription}
                onChangeText={setCreateDescription}
                placeholder={t('Description')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Picture')}</Text>
              <View style={styles.fileRow}>
                <Button
                  mode="outlined"
                  onPress={pickImage}
                  icon={({ size }) => <Feather name="image" size={size} color={colors.primaryPurple} />}
                  textColor={colors.primaryPurple}
                  style={[styles.fileButton, { borderColor: colors.cardBorder }]}
                  contentStyle={styles.fileButtonContent}
                >
                  {t('Select picture')}
                </Button>
                <Text style={[styles.fileName, { color: createPicture ? colors.textPrimary : colors.textMuted }]}>
                  {createPicture || t('No picture selected')}
                </Text>
                {createPictureFile ? (
                  <Image
                    source={{ uri: `data:${createPictureMime};base64,${createPictureFile}` }}
                    style={[styles.picturePreview, { borderColor: colors.cardBorder }]}
                  />
                ) : null}
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Storage Quantity')}</Text>
              <PaperTextInput
                mode="outlined"
                style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                contentStyle={styles.modalInputContent}
                outlineStyle={styles.modalInputOutline}
                textColor={colors.textPrimary}
                outlineColor={colors.cardBorder}
                activeOutlineColor={colors.primaryPurple}
                value={createQuantity}
                onChangeText={(value) => setCreateQuantity(sanitizeQuantityInput(value, createUnit))}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType={unitAllowsDecimal(createUnit) ? 'decimal-pad' : 'numeric'}
                inputMode={unitAllowsDecimal(createUnit) ? 'decimal' : 'numeric'}
                error={showCreateQuantityError}
              />
              <HelperText type="error" visible={showCreateQuantityError} style={styles.fieldHelper}>
                {createQuantityError ?? ''}
              </HelperText>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Default Value')}</Text>
              <PaperTextInput
                mode="outlined"
                style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                contentStyle={styles.modalInputContent}
                outlineStyle={styles.modalInputOutline}
                textColor={colors.textPrimary}
                outlineColor={colors.cardBorder}
                activeOutlineColor={colors.primaryPurple}
                value={createDefaultValue}
                onChangeText={(value) => setCreateDefaultValue(sanitizeNumericInput(value))}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                inputMode="decimal"
                error={showCreateDefaultValueError}
              />
              <HelperText type="error" visible={showCreateDefaultValueError} style={styles.fieldHelper}>
                {createDefaultValueError ?? ''}
              </HelperText>
            </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Unit of Measure')}</Text>
                <Button
                  mode="outlined"
                  onPress={() => setCreateUnitOpen((current) => !current)}
                  icon={({ size }) => (
                    <Feather name={createUnitOpen ? 'chevron-up' : 'chevron-down'} size={size} color={colors.textSecondary} />
                  )}
                  textColor={createUnit ? colors.textPrimary : colors.textMuted}
                  style={[styles.modalInput, styles.dropdownButton, { borderColor: colors.cardBorder }]}
                  contentStyle={styles.dropdownButtonContent}
                >
                  {createUnit || t('Select unit')}
                </Button>
                {createUnitOpen && (
                  <View style={[styles.dropdownList, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                    <View style={styles.unitChips}>
                      {unitOptions.map((unit) => (
                    <Chip
                      key={unit}
                      selected={createUnit === unit}
                      onPress={() => {
                        setCreateUnit(unit);
                        setCreateQuantity((current) => sanitizeQuantityInput(current, unit));
                        setCreateUnitOpen(false);
                      }}
                      icon={createUnit === unit ? 'check' : undefined}
                      style={[
                        styles.unitChip,
                        {
                          borderColor: createUnit === unit ? colors.neonGreen : colors.cardBorder,
                          backgroundColor: createUnit === unit ? `${colors.neonGreen}1A` : colors.cardBgTo,
                        },
                      ]}
                      textStyle={[styles.dropdownItemText, { color: colors.textPrimary }]}
                    >
                          {unit}
                        </Chip>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('File')}</Text>
                <View style={styles.fileRow}>
                  <Button
                    mode="outlined"
                    onPress={pickFile}
                    icon={({ size }) => <Feather name="paperclip" size={size} color={colors.primaryPurple} />}
                    textColor={colors.primaryPurple}
                    style={[styles.fileButton, { borderColor: colors.cardBorder }]}
                    contentStyle={styles.fileButtonContent}
                  >
                    {t('Select file')}
                  </Button>
                  <Text style={[styles.fileName, { color: createFileName ? colors.textPrimary : colors.textMuted }]}>
                    {createFileName || t('No file selected')}
                  </Text>
                </View>
              </View>

              <View style={[styles.toggleRow, isCompact && styles.toggleRowCompact]}>
                <Chip
                  selected={createIsExternal}
                  onPress={() => setCreateIsExternal((current) => !current)}
                  icon={createIsExternal ? 'check' : undefined}
                  style={[
                    styles.toggleButton,
                    { borderColor: colors.cardBorder },
                    createIsExternal ? { backgroundColor: `${colors.primaryPurple}1A` } : { backgroundColor: colors.cardBgTo },
                  ]}
                  textStyle={[styles.toggleLabel, { color: colors.textSecondary }]}
                >
                  {t('External')}: {createIsExternal ? t('Yes') : t('No')}
                </Chip>
                <Chip
                  selected={createIsService}
                  onPress={() => setCreateIsService((current) => !current)}
                  icon={createIsService ? 'check' : undefined}
                  style={[
                    styles.toggleButton,
                    { borderColor: colors.cardBorder },
                    createIsService ? { backgroundColor: `${colors.primaryPurple}1A` } : { backgroundColor: colors.cardBgTo },
                  ]}
                  textStyle={[styles.toggleLabel, { color: colors.textSecondary }]}
                >
                  {t('Service')}: {createIsService ? t('Yes') : t('No')}
                </Chip>
              </View>

              <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
                <Button
                  mode="outlined"
                  onPress={closeCreate}
                  disabled={creating}
                  textColor={colors.textSecondary}
                  style={[styles.modalButton, { borderColor: colors.cardBorder }]}
                  contentStyle={styles.modalButtonContent}
                  labelStyle={styles.modalButtonLabel}
                >
                  {t('Cancel')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCreate}
                  disabled={createDisabled}
                  buttonColor={colors.primaryPurple}
                  textColor={colors.appBg}
                  style={styles.modalButton}
                  contentStyle={styles.modalButtonContent}
                  labelStyle={styles.modalButtonLabel}
                >
                  {creating ? t('Creating...') : t('Create')}
                </Button>
              </View>
          </View>
        </View>
      </Modal>

      <Modal visible={detailsVisible} transparent animationType="fade" onRequestClose={closeDetails}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isTablet && styles.modalCardWide,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('Product Details')}</Text>
              <IconButton
                icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
                size={18}
                onPress={closeDetails}
                style={[styles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
              />
            </View>

            {detailsProduct ? (
              <ScrollView
                style={[styles.detailsScroll, isCompact && styles.detailsScrollCompact]}
                contentContainerStyle={styles.detailsContent}
              >
                <View style={[styles.detailsMediaRow, isCompact && styles.detailsMediaRowCompact]}>
                  {(() => {
                    const uri = resolvePictureUri(detailsProduct);
                    if (uri) {
                      return (
                        <Image
                          source={{ uri }}
                          style={[styles.detailsImage, { borderColor: colors.cardBorder }]}
                        />
                      );
                    }
                    return (
                      <View style={[styles.detailsPlaceholder, { borderColor: colors.cardBorder }]}>
                        <Feather name="image" size={20} color={colors.textMuted} />
                        <Text style={[styles.detailsPlaceholderText, { color: colors.textMuted }]}>
                          {t('No preview')}
                        </Text>
                      </View>
                    );
                  })()}
                  <View style={styles.detailsInfo}>
                    <Text style={[styles.detailsName, { color: colors.textPrimary }]}>
                      {detailsProduct.name}
                    </Text>
                    {!!detailsProduct.description && (
                      <Text style={[styles.detailsDescription, { color: colors.textSecondary }]}>
                        {detailsProduct.description}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.detailsGrid}>
                  <View style={[styles.detailsRow, isCompact && styles.detailsRowCompact]}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Quantity')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {getStorageQuantity(detailsProduct)}
                    </Text>
                  </View>
                  <View style={[styles.detailsRow, isCompact && styles.detailsRowCompact]}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Default value')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {formatCurrency((detailsProduct.defaultValue ?? detailsProduct.price) ?? 0, currency)}
                    </Text>
                  </View>
                  <View style={[styles.detailsRow, isCompact && styles.detailsRowCompact]}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Unit')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {detailsProduct.unitOfMeasure ? detailsProduct.unitOfMeasure.toUpperCase() : '-'}
                    </Text>
                  </View>
                  <View style={[styles.detailsRow, isCompact && styles.detailsRowCompact]}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('External')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {detailsProduct.isExternal ? t('Yes') : t('No')}
                    </Text>
                  </View>
                  <View style={[styles.detailsRow, isCompact && styles.detailsRowCompact]}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Service')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {detailsProduct.isService ? t('Yes') : t('No')}
                    </Text>
                  </View>
                </View>

                {(() => {
                  const fileSource = resolveFileSource(detailsProduct);
                  const canDownload = !!fileSource && /^https?:\/\//i.test(fileSource);
                  const fileName = fileSource ? fileSource.split('/').pop() ?? 'file' : null;
                  return (
                    <View style={styles.detailsFileSection}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('File')}</Text>
                      {fileSource ? (
                        <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                          {fileName ?? t('Attached')}
                        </Text>
                      ) : (
                        <Text style={[styles.detailsValue, { color: colors.textSecondary }]}>
                          {t('No file available')}
                        </Text>
                      )}
                      {canDownload && (
                        <Button
                          mode="contained"
                          onPress={() => Linking.openURL(fileSource)}
                          icon={({ size }) => <Feather name="download" size={size} color={colors.neonGreen} />}
                          buttonColor={colors.primaryPurple}
                          textColor={colors.appBg}
                          style={styles.downloadButton}
                          contentStyle={styles.downloadButtonContent}
                        >
                          {t('Download file')}
                        </Button>
                      )}
                    </View>
                  );
                })()}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
  banner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 12,
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
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  filterDropdownButton: {
    alignItems: 'center',
  },
  filterButtonContent: {
    paddingVertical: 6,
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
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  viewRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  viewLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  viewToggle: {
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  segmentButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 18,
  },
  segmentButtonFirst: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  segmentButtonLast: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  segmentButtonPressed: {
    opacity: 0.9,
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
    borderRadius: 8,
    borderWidth: 2,
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
  addButtonContent: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonContentCompact: {
    paddingVertical: 6,
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonCompact: {
    width: '100%',
    minHeight: 44,
    borderRadius: 10,
  },
  compactList: {
    gap: 12,
  },
  compactCard: {
    borderRadius: 8,
  },
  compactCardContent: {
    padding: 12,
  },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  compactTopCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  compactMeta: {
    fontSize: 11,
  },
  compactBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  compactBottomCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  compactStats: {
    gap: 6,
  },
  compactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  productList: {
    gap: 16,
  },
  productCard: {
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  productCardContent: {
    padding: 16,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productMedia: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  productMediaCompact: {
    height: 140,
  },
  productMediaImage: {
    width: '100%',
    height: '100%',
  },
  productMediaFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  productMediaText: {
    fontSize: 12,
    fontWeight: '600',
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
    flexWrap: 'wrap',
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
    paddingVertical: 4,
    borderRadius: 999,
    minHeight: 24,
    justifyContent: 'center',
  },
  statusBadgeCompact: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    minHeight: 22,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextCompact: {
    fontSize: 10,
  },
  menuCard: {
    position: 'absolute',
    top: 14,
    right: 14,
    borderRadius: 10,
    borderWidth: 2,
    paddingVertical: 6,
    minWidth: 140,
    zIndex: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 10, 18, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
    gap: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#1c140d',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.22,
        shadowRadius: 30,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalCardWide: {
    maxWidth: 540,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalField: {
    gap: 8,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  modalInput: {
    borderRadius: 16,
    minHeight: 52,
  },
  modalInputContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 20,
  },
  modalInputOutline: {
    borderRadius: 16,
  },
  fieldHelper: {
    marginTop: -2,
    marginBottom: -4,
    fontSize: 11,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonContent: {
    height: 44,
    paddingHorizontal: 16,
  },
  dropdownList: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownItemText: {
    fontSize: 14,
  },
  unitDropdown: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  unitChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitChip: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  unitOptionText: {
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  modalActionsCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  modalButton: {
    minWidth: 120,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalButtonContent: {
    height: 44,
    paddingHorizontal: 18,
  },
  modalButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleRowCompact: {
    flexDirection: 'column',
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 12,
  },
  fileRow: {
    gap: 8,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  fileButtonContent: {
    paddingVertical: 2,
  },
  fileName: {
    fontSize: 12,
  },
  picturePreview: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    marginTop: 4,
  },
  detailsScroll: {
    maxHeight: 420,
  },
  detailsScrollCompact: {
    maxHeight: 360,
  },
  detailsContent: {
    gap: 16,
  },
  detailsMediaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsMediaRowCompact: {
    flexDirection: 'column',
  },
  detailsImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 2,
  },
  detailsPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  detailsPlaceholderText: {
    fontSize: 11,
  },
  detailsInfo: {
    flex: 1,
    gap: 6,
  },
  detailsName: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailsDescription: {
    fontSize: 12,
  },
  detailsGrid: {
    gap: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailsRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  detailsLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailsValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsFileSection: {
    gap: 8,
  },
  downloadButton: {
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  downloadButtonContent: {
    paddingVertical: 6,
  },
});
