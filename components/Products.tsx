import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ErpService, Product as ProductModel } from '../services/erpService';
import { NervLoader } from './NervLoader';
import { useResponsive } from '../hooks/useResponsive';

const statusFilters = ['active', 'deactivated', 'all'];
const unitOptions = ['UN', 'KG', 'L', 'M', 'CM', 'BOX'];

export function Products() {
  const { colors } = useTheme();
  const { client, isAuthenticated, loading: authLoading, enterpriseId } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const { isCompact, isTablet, contentPadding } = useResponsive();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [unitFilter, setUnitFilter] = useState<string[]>([]);
  const [unitFilterOpen, setUnitFilterOpen] = useState(false);
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
  const [detailsProduct, setDetailsProduct] = useState<ProductModel | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

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
    const isActive = product.isActive !== false;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && isActive) ||
      (filterStatus === 'deactivated' && !isActive);
    const productUnit = (product.unitOfMeasure ?? '').toUpperCase();
    const matchesUnit = unitFilter.length === 0 || unitFilter.includes(productUnit);
    return matchesSearch && matchesStatus && matchesUnit;
  });

  const getStorageQuantity = (product: ProductModel) =>
    product.storageQuantity ?? product.stock ?? 0;

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) {
      return 'Out of Stock';
    }
    if (quantity <= 10) {
      return 'Low Stock';
    }
    return 'In Stock';
  };

  const getStatusColor = (quantity: number) => {
    if (quantity <= 0) {
      return '#f72585';
    }
    if (quantity <= 10) {
      return colors.accentOrange;
    }
    return colors.neonGreen;
  };

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
  };

  const parseNumber = (value: string) => {
    const normalized = value.replace(',', '.').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const sanitizeNumericInput = (value: string) => {
    const normalized = value.replace(',', '.');
    let result = '';
    let hasDot = false;

    for (const char of normalized) {
      if (char >= '0' && char <= '9') {
        result += char;
      } else if (char === '.' && !hasDot) {
        result += char;
        hasDot = true;
      }
    }

    return result;
  };

  const toggleUnitFilter = (unit: string) => {
    setUnitFilter((current) =>
      current.includes(unit) ? current.filter((item) => item !== unit) : [...current, unit],
    );
  };

  const handleSave = async () => {
    if (!editingProduct) {
      return;
    }

    const name = editName.trim();
    if (!name) {
      setErrorMessage('Product name is required.');
      return;
    }

    const resolvedEnterpriseId = editingProduct.enterpriseId ?? enterpriseId;
    if (!resolvedEnterpriseId) {
      setErrorMessage('Product must have an enterprise.');
      return;
    }

    const quantity = parseNumber(editQuantity);
    if (quantity === null) {
      setErrorMessage('Storage quantity must be a number.');
      return;
    }

    const defaultValue = parseNumber(editDefaultValue);
    if (defaultValue === null) {
      setErrorMessage('Default value must be a number.');
      return;
    }

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
      setErrorMessage(response.error ?? 'Unable to update product');
    }

    setSaving(false);
  };

  const handleCreate = async () => {
    if (!enterpriseId) {
      setErrorMessage('Product must have an enterprise.');
      return;
    }

    const name = createName.trim();
    if (!name) {
      setErrorMessage('Product name is required.');
      return;
    }

    const quantity = parseNumber(createQuantity);
    if (quantity === null) {
      setErrorMessage('Storage quantity must be a number.');
      return;
    }

    const defaultValue = parseNumber(createDefaultValue);
    if (defaultValue === null) {
      setErrorMessage('Default value must be a number.');
      return;
    }

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
      file: createFile || createPictureFile || '',
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

  const resolvePictureUri = (product: ProductModel) => {
    const uri = product.pictureAddress ?? product.pictureAdress ?? '';
    if (!uri) {
      return null;
    }
    if (uri.startsWith('http') || uri.startsWith('data:')) {
      return uri;
    }
    return null;
  };

  const resolveFileSource = (product: ProductModel) => {
    const candidate =
      (product as any).fileUrl ??
      (product as any).fileAddress ??
      (product as any).fileAdress ??
      (product as any).file ??
      '';
    return typeof candidate === 'string' && candidate ? candidate : null;
  };

  const handleDeactivate = (product: ProductModel) => {
    Alert.alert(
      'Deactivate product',
      `Deactivate ${product.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            const resolvedEnterpriseId = product.enterpriseId ?? enterpriseId;
            if (!resolvedEnterpriseId) {
              setErrorMessage('Product must have an enterprise.');
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
              setErrorMessage(response.error ?? 'Unable to deactivate product');
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
        label="Synchronizing EVA-01"
        subtitle="LCL circulation nominal | Loading products..."
      />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={[styles.content, { padding: contentPadding }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
            PRODUCT INVENTORY
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}>
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

        {!loading && filteredProducts.length === 0 && (
          <View style={[styles.emptyState, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
            <Feather name="package" size={20} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No products yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Add products or adjust filters to see items here.
            </Text>
          </View>
        )}

        <View style={styles.filterContainer}>
          <TouchableOpacity
            onPress={() => setUnitFilterOpen((current) => !current)}
            style={[
              styles.filterButton,
              styles.filterDropdownButton,
              {
                backgroundColor: colors.cardBgFrom,
                borderColor: unitFilterOpen ? colors.neonGreen : colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.filterText, { color: colors.textSecondary }]}>
              {unitFilter.length === 0 ? 'Unit types' : unitFilter.join(', ')}
            </Text>
            <Feather
              name={unitFilterOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {unitFilterOpen && (
          <View style={[styles.unitDropdown, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
            {unitOptions.map((unit) => {
              const selected = unitFilter.includes(unit);
              return (
                <TouchableOpacity
                  key={unit}
                  style={styles.unitOption}
                  onPress={() => toggleUnitFilter(unit)}
                >
                  <Feather
                    name={selected ? 'check-square' : 'square'}
                    size={16}
                    color={selected ? colors.neonGreen : colors.textMuted}
                  />
                  <Text style={[styles.unitOptionText, { color: colors.textPrimary }]}>{unit}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.filterContainer}>
          {statusFilters.map((status) => (
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
                {status === 'all' ? 'All' : status === 'active' ? 'Active' : 'Deactivated'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search and Add */}
        <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
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
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primaryPurple }, isCompact && styles.addButtonCompact]}
            onPress={openCreate}
          >
            <Feather name="plus" size={20} color={colors.neonGreen} />
          </TouchableOpacity>
        </View>

        {/* Product List */}
        <View style={styles.productList}>
          {filteredProducts.map((product) => {
            const quantity = getStorageQuantity(product);
            const status = getStockStatus(quantity);
            const statusColor = getStatusColor(quantity);
            const isMenuOpen = menuProductId === product.id;
            const imageUri = resolvePictureUri(product);

            return (
              <View
                key={product.id}
                style={[styles.productCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
              >
                <View style={[styles.productMedia, isCompact && styles.productMediaCompact]}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.productMediaImage} />
                  ) : (
                    <View style={[styles.productMediaFallback, { borderColor: colors.cardBorder }]}>
                      <Feather name="image" size={20} color={colors.textMuted} />
                      <Text style={[styles.productMediaText, { color: colors.textMuted }]}>No image</Text>
                    </View>
                  )}
                </View>

                <View style={styles.productHeader}>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: colors.textPrimary }]}>{product.name}</Text>
                    <Text style={[styles.productCategory, { color: colors.textSecondary }]}>{product.category}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      setMenuProductId((current) => (current === product.id ? null : product.id))
                    }
                  >
                    <Feather name="more-vertical" size={18} color={colors.primaryPurple} />
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
                      Stock: {quantity}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Feather name="hash" size={16} color={colors.primaryPurple} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Unit: {product.unitOfMeasure ? product.unitOfMeasure.toUpperCase() : '-'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
                </View>

                {isMenuOpen && (
                  <View style={[styles.menuCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => openDetails(product)}
                    >
                      <Feather name="info" size={14} color={colors.textSecondary} />
                      <Text style={[styles.menuLabel, { color: colors.textSecondary }]}>Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => openEdit(product)}
                    >
                      <Feather name="edit-3" size={14} color={colors.primaryPurple} />
                      <Text style={[styles.menuLabel, { color: colors.primaryPurple }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuProductId(null);
                        handleDeactivate(product);
                      }}
                      disabled={deactivatingId === product.id}
                    >
                      <Feather name="trash-2" size={14} color="#f72585" />
                      <Text style={[styles.menuLabel, { color: '#f72585' }]}>
                        {deactivatingId === product.id ? 'Deactivating...' : 'Deactivate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
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
              <Text style={[styles.modalTitle, { color: colors.neonGreen }]}>Edit Product</Text>
              <TouchableOpacity onPress={closeEdit}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Product name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Picture URL</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={editPicture}
                onChangeText={setEditPicture}
                placeholder="https://..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Storage Quantity</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={editQuantity}
                onChangeText={(value) => setEditQuantity(sanitizeNumericInput(value))}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Default Value</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={editDefaultValue}
                onChangeText={(value) => setEditDefaultValue(sanitizeNumericInput(value))}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Unit of Measure</Text>
              <TouchableOpacity
                style={[styles.modalInput, styles.dropdownButton, { borderColor: colors.cardBorder }]}
                onPress={() => setEditUnitOpen((current) => !current)}
              >
                <Text style={[styles.dropdownText, { color: editUnit ? colors.textPrimary : colors.textMuted }]}>
                  {editUnit || 'Select unit'}
                </Text>
                <Feather name={editUnitOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              {editUnitOpen && (
                <View style={[styles.dropdownList, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                  {unitOptions.map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setEditUnit(unit);
                        setEditUnitOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: colors.textPrimary }]}>{unit}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.toggleRow, isCompact && styles.toggleRowCompact]}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { borderColor: colors.cardBorder },
                  editIsExternal && { backgroundColor: `${colors.primaryPurple}25` },
                ]}
                onPress={() => setEditIsExternal((current) => !current)}
              >
                <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                  External: {editIsExternal ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { borderColor: colors.cardBorder },
                  editIsService && { backgroundColor: `${colors.primaryPurple}25` },
                ]}
                onPress={() => setEditIsService((current) => !current)}
              >
                <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                  Service: {editIsService ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.cardBorder }]}
                onPress={closeEdit}
                disabled={saving}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primaryPurple }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={[styles.modalButtonText, { color: colors.neonGreen }]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
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
              <Text style={[styles.modalTitle, { color: colors.neonGreen }]}>New Product</Text>
              <TouchableOpacity onPress={closeCreate}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={createName}
                onChangeText={setCreateName}
                placeholder="Product name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={createDescription}
                onChangeText={setCreateDescription}
                placeholder="Description"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Picture</Text>
              <View style={styles.fileRow}>
                <TouchableOpacity
                  style={[styles.fileButton, { borderColor: colors.cardBorder }]}
                  onPress={pickImage}
                >
                  <Feather name="image" size={14} color={colors.primaryPurple} />
                  <Text style={[styles.fileButtonText, { color: colors.primaryPurple }]}>Select picture</Text>
                </TouchableOpacity>
                <Text style={[styles.fileName, { color: createPicture ? colors.textPrimary : colors.textMuted }]}>
                  {createPicture || 'No picture selected'}
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
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Storage Quantity</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={createQuantity}
                onChangeText={(value) => setCreateQuantity(sanitizeNumericInput(value))}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Default Value</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={createDefaultValue}
                onChangeText={(value) => setCreateDefaultValue(sanitizeNumericInput(value))}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Unit of Measure</Text>
              <TouchableOpacity
                style={[styles.modalInput, styles.dropdownButton, { borderColor: colors.cardBorder }]}
                onPress={() => setCreateUnitOpen((current) => !current)}
              >
                <Text style={[styles.dropdownText, { color: createUnit ? colors.textPrimary : colors.textMuted }]}>
                  {createUnit || 'Select unit'}
                </Text>
                <Feather name={createUnitOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              {createUnitOpen && (
                <View style={[styles.dropdownList, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                  {unitOptions.map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setCreateUnit(unit);
                        setCreateUnitOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: colors.textPrimary }]}>{unit}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>File</Text>
              <View style={styles.fileRow}>
                <TouchableOpacity
                  style={[styles.fileButton, { borderColor: colors.cardBorder }]}
                  onPress={pickFile}
                >
                  <Feather name="paperclip" size={14} color={colors.primaryPurple} />
                  <Text style={[styles.fileButtonText, { color: colors.primaryPurple }]}>Select file</Text>
                </TouchableOpacity>
                <Text style={[styles.fileName, { color: createFileName ? colors.textPrimary : colors.textMuted }]}>
                  {createFileName || 'No file selected'}
                </Text>
              </View>
            </View>

            <View style={[styles.toggleRow, isCompact && styles.toggleRowCompact]}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { borderColor: colors.cardBorder },
                  createIsExternal && { backgroundColor: `${colors.primaryPurple}25` },
                ]}
                onPress={() => setCreateIsExternal((current) => !current)}
              >
                <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                  External: {createIsExternal ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { borderColor: colors.cardBorder },
                  createIsService && { backgroundColor: `${colors.primaryPurple}25` },
                ]}
                onPress={() => setCreateIsService((current) => !current)}
              >
                <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                  Service: {createIsService ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.cardBorder }]}
                onPress={closeCreate}
                disabled={creating}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primaryPurple }]}
                onPress={handleCreate}
                disabled={creating}
              >
                <Text style={[styles.modalButtonText, { color: colors.neonGreen }]}>
                  {creating ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
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
              <Text style={[styles.modalTitle, { color: colors.neonGreen }]}>Product Details</Text>
              <TouchableOpacity onPress={closeDetails}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
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
                          No preview
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
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>Quantity</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {getStorageQuantity(detailsProduct)}
                    </Text>
                  </View>
                  <View style={[styles.detailsRow, isCompact && styles.detailsRowCompact]}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>Default value</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      ${((detailsProduct.defaultValue ?? detailsProduct.price) ?? 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.detailsRow, isCompact && styles.detailsRowCompact]}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>Unit</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {detailsProduct.unitOfMeasure ? detailsProduct.unitOfMeasure.toUpperCase() : '-'}
                    </Text>
                  </View>
                  <View style={[styles.detailsRow, isCompact && styles.detailsRowCompact]}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>External</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {detailsProduct.isExternal ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  <View style={[styles.detailsRow, isCompact && styles.detailsRowCompact]}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>Service</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {detailsProduct.isService ? 'Yes' : 'No'}
                    </Text>
                  </View>
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
                        <TouchableOpacity
                          style={[styles.downloadButton, { backgroundColor: colors.primaryPurple }]}
                          onPress={() => Linking.openURL(fileSource)}
                        >
                          <Feather name="download" size={14} color={colors.neonGreen} />
                          <Text style={[styles.downloadText, { color: colors.neonGreen }]}>Download file</Text>
                        </TouchableOpacity>
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
    fontWeight: 'bold',
    letterSpacing: 2,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
  },
  filterDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  actionRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
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
  addButtonCompact: {
    width: '100%',
    height: 44,
    borderRadius: 10,
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
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
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
  menuLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 8, 18, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    gap: 12,
  },
  modalCardWide: {
    maxWidth: 540,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalField: {
    gap: 6,
  },
  modalLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  modalInput: {
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 14,
  },
  dropdownList: {
    marginTop: 6,
    borderWidth: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 14,
  },
  unitDropdown: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  unitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unitOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  modalActionsCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
  },
  modalButtonText: {
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
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  fileRow: {
    gap: 8,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  fileButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  downloadText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
