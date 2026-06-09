import React, { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { StatusBadge } from './StatusBadge';
import { SegmentedControl } from './SegmentedControl';
import {
  Button,
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
  const { width, isCompact, isTablet, contentPadding, cardGap } = useResponsive();
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
  const [pageSize] = useState(25);
  const [hasMore, setHasMore] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductModel | null>(null);
  const [editName, setEditName] = useState('');
  const [editPicture, setEditPicture] = useState('');
  const [editPictureFile, setEditPictureFile] = useState('');
  const [editPictureMime, setEditPictureMime] = useState('image/jpeg');
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
  const [createIsExternal, setCreateIsExternal] = useState(false);
  const [createIsService, setCreateIsService] = useState(false);
  const [createUnitOpen, setCreateUnitOpen] = useState(false);
  const [createFile, setCreateFile] = useState('');
  const [createFileName, setCreateFileName] = useState('');
  const [showCreateErrors, setShowCreateErrors] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState<ProductModel | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsPicturePreview, setDetailsPicturePreview] = useState<string | null>(null);
  const [uploadingDetailsPicture, setUploadingDetailsPicture] = useState(false);
  const [confirmDeactivateProduct, setConfirmDeactivateProduct] = useState<ProductModel | null>(null);

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
        true,
      );
      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        setProducts(response.data);
        setHasMore(response.data.length === pageSize);
      } else {
        setErrorMessage(response.error ?? 'Unable to load products');
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
    setEditPictureFile('');
    setEditPictureMime('image/jpeg');
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
    setEditPictureFile('');
    setEditPictureMime('image/jpeg');
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
    setCreateIsExternal(false);
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
    setCreateIsExternal(false);
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
      setErrorMessage('Product name is required.');
      return;
    }
    if (editQuantityError) {
      setErrorMessage(`Storage quantity: ${editQuantityError}.`);
      return;
    }
    if (editDefaultValueError) {
      setErrorMessage(`Default value: ${editDefaultValueError}.`);
      return;
    }

    const quantity = parseNumber(editQuantity) ?? 0;
    const defaultValue = parseNumber(editDefaultValue) ?? 0;

    setSaving(true);
    setErrorMessage(null);

    const payload: ProductModel = {
      ...editingProduct,
      name,
      pictureAddress: editPicture.trim(),
      storageQuantity: quantity,
      stock: quantity,
      defaultValue,
      price: defaultValue,
      unitOfMeasure: editUnit.trim().toUpperCase(),
      isExternal: editIsExternal,
      isService: editIsService,
      isActive: editingProduct.isActive ?? true,
    };

    const response = await erpService.updateProduct(payload);
    if (!response.ok) {
      setErrorMessage(response.error ?? 'Unable to update product');
      setSaving(false);
      return;
    }

    let updatedProduct = { ...payload };

    if (editPictureFile && editingProduct.id) {
      const picResponse = await erpService.uploadProductPicture(
        String(editingProduct.id),
        editPictureFile,
      );
      if (picResponse.ok && picResponse.data) {
        updatedProduct = { ...updatedProduct, ...picResponse.data };
      }
    }

    setProducts((prev) =>
      prev.map((item) => (item.id === editingProduct.id ? { ...item, ...updatedProduct } : item)),
    );
    closeEdit();
    setSaving(false);
  };

  const handleCreate = async () => {
    setShowCreateErrors(true);

    const name = createName.trim();
    if (!name) {
      setErrorMessage('Product name is required.');
      return;
    }
    if (createQuantityError) {
      setErrorMessage(`Storage quantity: ${createQuantityError}.`);
      return;
    }
    if (createDefaultValueError) {
      setErrorMessage(`Default value: ${createDefaultValueError}.`);
      return;
    }

    const filePayload = createFile || createPictureFile;

    const quantity = parseNumber(createQuantity) ?? 0;
    const defaultValue = parseNumber(createDefaultValue) ?? 0;

    setCreating(true);
    setErrorMessage(null);

    const payload = {
      name,
      description: createDescription.trim(),
      storageQuantity: quantity,
      defaultValue,
      unitOfMeasure: createUnit.trim().toUpperCase(),
      isExternal: createIsExternal,
      isService: createIsService,
      pictureAdress: createPicture.trim(),
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
      setErrorMessage(response.error ?? 'Unable to create product');
    }

    setCreating(false);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Gallery permission is required to select a picture.');
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

  const editFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const detailsFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const uploadDetailsPicture = async (base64: string) => {
    if (!detailsProduct?.id) return;
    setUploadingDetailsPicture(true);
    const response = await erpService.uploadProductPicture(String(detailsProduct.id), base64);
    if (response.ok && response.data) {
      const updated = { ...detailsProduct, ...response.data };
      setDetailsProduct(updated);
      setProducts((prev) =>
        prev.map((p) => (p.id === detailsProduct.id ? { ...p, ...response.data! } : p)),
      );
    } else {
      setErrorMessage(response.error ?? 'Unable to upload picture');
    }
    setUploadingDetailsPicture(false);
  };

  const handleDetailsFileChange = (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      setDetailsPicturePreview(dataUrl);
      uploadDetailsPicture(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const pickDetailsPicture = () => {
    if (Platform.OS === 'web') {
      detailsFileInputRef.current?.click();
      return;
    }
    (async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Gallery permission is required to select a picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        base64: true,
      });
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      let base64 = asset.base64 ?? '';
      if (!base64 && asset.uri) {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      setDetailsPicturePreview(asset.uri);
      uploadDetailsPicture(base64);
    })();
  };

  const handleEditFileChange = (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      setEditPictureFile(base64);
      setEditPictureMime(file.type || 'image/jpeg');
      setEditPicture(file.name || 'picture');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const pickEditImage = () => {
    if (Platform.OS === 'web') {
      editFileInputRef.current?.click();
      return;
    }
    (async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Gallery permission is required to select a picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        base64: true,
      });
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      let base64 = asset.base64 ?? '';
      if (!base64 && asset.uri) {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      setEditPictureFile(base64);
      setEditPictureMime(asset.mimeType ?? 'image/jpeg');
      setEditPicture(asset.fileName ?? asset.uri.split('/').pop() ?? 'picture');
    })();
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
    setDetailsPicturePreview(null);
    setDetailsVisible(true);
  };

  const closeDetails = () => {
    setDetailsVisible(false);
    setDetailsProduct(null);
    setDetailsPicturePreview(null);
  };

  const requestDeactivate = (product: ProductModel) => {
    setMenuProductId(null);
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
                onPress={openCreate}
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
            onPress={openCreate}
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

            {errorMessage && (
              <View style={[styles.errorBanner, { backgroundColor: '#ff4d7d1A', borderColor: '#ff4d7d40' }]}>
                <Feather name="alert-circle" size={14} color="#ff4d7d" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Name')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
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
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Picture')}</Text>
              <Pressable
                onPress={pickEditImage}
                disabled={saving}
                style={(state: any) => [
                  styles.picturePickerArea,
                  { borderColor: state.hovered ? colors.primaryPurple : colors.cardBorder, backgroundColor: colors.inputBgFrom },
                ]}
              >
                {editPictureFile ? (
                  <Image
                    source={{ uri: `data:${editPictureMime};base64,${editPictureFile}` }}
                    style={styles.picturePickerImage}
                    resizeMode="cover"
                  />
                ) : editingProduct && editPicture && resolvePictureUri(editingProduct) ? (
                  <Image
                    source={{ uri: resolvePictureUri(editingProduct)! }}
                    style={styles.picturePickerImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.picturePickerPlaceholder}>
                    <Feather name="image" size={28} color={colors.textMuted} />
                    <Text style={[styles.picturePickerText, { color: colors.textMuted }]}>{t('Tap to select picture')}</Text>
                  </View>
                )}
                <View style={[styles.picturePickerOverlay, { backgroundColor: `${colors.appBg}99` }]}>
                  <Feather name="camera" size={16} color={colors.textPrimary} />
                </View>
              </Pressable>
              {Platform.OS === 'web' && (
                <input
                  ref={editFileInputRef as any}
                  type="file"
                  accept="image/*"
                  onChange={handleEditFileChange}
                  style={{ display: 'none' } as any}
                />
              )}
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Storage Quantity')}</Text>
              <View style={[styles.readOnlyField, { backgroundColor: colors.inputBgFrom, borderColor: colors.cardBorder }]}>
                <Text style={[styles.readOnlyValue, { color: colors.textMuted }]}>{editQuantity || '0'}</Text>
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Default Value')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
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
              <View style={[styles.readOnlyField, { backgroundColor: colors.inputBgFrom, borderColor: colors.cardBorder }]}>
                <Text style={[styles.readOnlyValue, { color: colors.textMuted }]}>{editUnit || '-'}</Text>
              </View>
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
                textColor="#fff"
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

            {errorMessage && (
              <View style={[styles.errorBanner, { backgroundColor: '#ff4d7d1A', borderColor: '#ff4d7d40' }]}>
                <Feather name="alert-circle" size={14} color="#ff4d7d" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Name')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
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
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Storage Quantity')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
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
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Default Value')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
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
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Unit of Measure')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
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
                  textColor="#fff"
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
                  <Pressable
                    onPress={pickDetailsPicture}
                    style={(state: any) => [
                      styles.detailsImageWrapper,
                      state.hovered && { opacity: 0.8 },
                    ]}
                  >
                    {(() => {
                      const uri = detailsPicturePreview || resolvePictureUri(detailsProduct);
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
                            No preview
                          </Text>
                        </View>
                      );
                    })()}
                    <View style={[styles.detailsCameraIcon, { backgroundColor: `${colors.appBg}CC` }]}>
                      <Feather name="camera" size={12} color={colors.textPrimary} />
                    </View>
                  </Pressable>
                  {Platform.OS === 'web' && (
                    <input
                      ref={detailsFileInputRef as any}
                      type="file"
                      accept="image/*"
                      onChange={handleDetailsFileChange}
                      style={{ display: 'none' } as any}
                    />
                  )}
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
                  {[
                    { icon: 'hash' as const, iconColor: colors.primaryPurple, label: t('Quantity'), value: String(getStorageQuantity(detailsProduct)) },
                    { icon: 'dollar-sign' as const, iconColor: colors.neonGreen, label: t('Default value'), value: formatCurrency((detailsProduct.defaultValue ?? detailsProduct.price) ?? 0, currency) },
                    { icon: 'box' as const, iconColor: colors.primaryPurple, label: t('Unit'), value: detailsProduct.unitOfMeasure ? detailsProduct.unitOfMeasure.toUpperCase() : '-' },
                    { icon: 'external-link' as const, iconColor: colors.textMuted, label: t('External'), value: detailsProduct.isExternal ? t('Yes') : t('No') },
                    { icon: 'tool' as const, iconColor: colors.textMuted, label: t('Service'), value: detailsProduct.isService ? t('Yes') : t('No') },
                  ].map(({ icon, iconColor, label, value }) => (
                    <View key={label} style={styles.detailsIconRow}>
                      <View style={[styles.detailsIconBox, { backgroundColor: `${iconColor}14` }]}>
                        <Feather name={icon} size={13} color={iconColor} />
                      </View>
                      <View style={styles.detailsIconRowInfo}>
                        <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{label}</Text>
                        <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>{value}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {(() => {
                  const fileSource = resolveFileSource(detailsProduct);
                  const canDownload = !!fileSource && /^https?:\/\//i.test(fileSource);
                  const fileName = fileSource ? fileSource.split('/').pop() ?? 'file' : null;
                  return (
                    <View style={styles.detailsFileSection}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>File</Text>
                      {fileSource ? (
                        <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                          {fileName ?? 'Attached'}
                        </Text>
                      ) : (
                        <Text style={[styles.detailsValue, { color: colors.textSecondary }]}>
                          No file available
                        </Text>
                      )}
                      {canDownload && (
                        <Button
                          mode="contained"
                          onPress={() => Linking.openURL(fileSource)}
                          icon={({ size }) => <Feather name="download" size={size} color={colors.neonGreen} />}
                          buttonColor={colors.primaryPurple}
                          textColor="#fff"
                          style={styles.downloadButton}
                          contentStyle={styles.downloadButtonContent}
                        >
                          Download file
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorBannerText: {
    color: '#ff4d7d',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
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
  menuCard: {
    position: 'absolute',
    top: 14,
    right: 14,
    borderRadius: 12,
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
        shadowColor: '#000000',
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
  readOnlyField: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    opacity: 0.6,
  },
  readOnlyValue: {
    fontSize: 15,
    lineHeight: 20,
  },
  modalInput: {
    borderRadius: 12,
    minHeight: 52,
  },
  modalInputContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 20,
  },
  modalInputOutline: {
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
  picturePickerArea: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer', transition: 'border-color 0.15s ease' } as any, default: {} }),
  },
  picturePickerImage: {
    width: '100%',
    height: '100%',
  },
  picturePickerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  picturePickerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  picturePickerOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsImageWrapper: {
    position: 'relative',
    width: 96,
    height: 96,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'opacity 0.15s ease' } as any, default: {} }),
  },
  detailsCameraIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 12,
  },
  detailsIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailsIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  detailsIconRowInfo: {
    flex: 1,
    gap: 1,
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
    fontSize: 11,
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
