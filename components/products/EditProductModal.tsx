import React, { useRef, useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import {
  Button,
  Chip,
  HelperText,
  IconButton,
  TextInput as PaperTextInput,
} from '../ui/Paper';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { useResponsive } from '../../hooks/useResponsive';
import { ErpService, Product as ProductModel } from '../../services/erpService';
import {
  getNumberError,
  getQuantityError,
  getStorageQuantity,
  parseNumber,
  resolvePictureUri,
  sanitizeNumericInput,
} from '../../utils/products/form';
import { modalStyles } from './shared';

type EditProductModalProps = {
  product: ProductModel;
  erpService: ErpService;
  onClose: () => void;
  onSaved: (updated: ProductModel) => void;
};

export function EditProductModal({ product, erpService, onClose, onSaved }: EditProductModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isCompact, isTablet } = useResponsive();

  const [name, setName] = useState(product.name ?? '');
  const [picture, setPicture] = useState(product.pictureAddress ?? '');
  const [pictureFile, setPictureFile] = useState('');
  const [pictureMime, setPictureMime] = useState('image/jpeg');
  const [defaultValue, setDefaultValue] = useState(String(product.defaultValue ?? product.price ?? 0));
  const [isExternal, setIsExternal] = useState(product.isExternal ?? true);
  const [isService, setIsService] = useState(product.isService ?? false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const quantity = String(getStorageQuantity(product));
  const unit = (product.unitOfMeasure ?? '').toUpperCase();

  const quantityError = getQuantityError(quantity, unit);
  const defaultValueError = getNumberError(defaultValue, { required: true, allowZero: true });
  const showDefaultValueError =
    (showErrors || defaultValue.trim().length > 0) && !!defaultValueError;
  const saveDisabled = saving || !!quantityError || !!defaultValueError || !name.trim();

  const handleFileChange = (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      setPictureFile(base64);
      setPictureMime(file.type || 'image/jpeg');
      setPicture(file.name || 'picture');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const pickImage = () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
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
      setPictureFile(base64);
      setPictureMime(asset.mimeType ?? 'image/jpeg');
      setPicture(asset.fileName ?? asset.uri.split('/').pop() ?? 'picture');
    })();
  };

  const handleSave = async () => {
    setShowErrors(true);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Product name is required.');
      return;
    }
    if (quantityError) {
      setErrorMessage(`Storage quantity: ${quantityError}.`);
      return;
    }
    if (defaultValueError) {
      setErrorMessage(`Default value: ${defaultValueError}.`);
      return;
    }

    const parsedQuantity = parseNumber(quantity) ?? 0;
    const parsedDefaultValue = parseNumber(defaultValue) ?? 0;

    setSaving(true);
    setErrorMessage(null);

    const payload: ProductModel = {
      ...product,
      name: trimmedName,
      pictureAddress: picture.trim(),
      storageQuantity: parsedQuantity,
      stock: parsedQuantity,
      defaultValue: parsedDefaultValue,
      price: parsedDefaultValue,
      unitOfMeasure: unit.trim(),
      isExternal,
      isService,
      isActive: product.isActive ?? true,
    };

    const response = await erpService.updateProduct(payload);
    if (!response.ok) {
      setErrorMessage(response.error ?? 'Unable to update product');
      setSaving(false);
      return;
    }

    let updatedProduct = { ...payload };

    if (pictureFile && product.id) {
      const picResponse = await erpService.uploadProductPicture(
        String(product.id),
        pictureFile,
      );
      if (picResponse.ok && picResponse.data) {
        updatedProduct = { ...updatedProduct, ...picResponse.data };
      }
    }

    onSaved(updatedProduct);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.modalBackdrop}>
        <View
          style={[
            modalStyles.modalCard,
            { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
            isTablet && modalStyles.modalCardWide,
          ]}
        >
          <View style={modalStyles.modalHeader}>
            <Text style={[modalStyles.modalTitle, { color: colors.textPrimary }]}>{t('Edit Product')}</Text>
            <IconButton
              icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
              size={18}
              onPress={onClose}
              style={[modalStyles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
            />
          </View>

          {errorMessage && (
            <View style={[modalStyles.errorBanner, { backgroundColor: '#ff4d7d1A', borderColor: '#ff4d7d40' }]}>
              <Feather name="alert-circle" size={14} color="#ff4d7d" />
              <Text style={modalStyles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          <View style={modalStyles.modalField}>
            <Text style={[modalStyles.modalLabel, { color: colors.textSecondary }]}>{t('Name')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
            <PaperTextInput
              mode="outlined"
              style={[modalStyles.modalInput, { backgroundColor: colors.inputBgFrom }]}
              contentStyle={modalStyles.modalInputContent}
              outlineStyle={modalStyles.modalInputOutline}
              textColor={colors.textPrimary}
              outlineColor={colors.cardBorder}
              activeOutlineColor={colors.primaryPurple}
              value={name}
              onChangeText={setName}
              placeholder={t('Product name')}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={modalStyles.modalField}>
            <Text style={[modalStyles.modalLabel, { color: colors.textSecondary }]}>{t('Picture')}</Text>
            <Pressable
              onPress={pickImage}
              disabled={saving}
              style={(state: any) => [
                styles.picturePickerArea,
                { borderColor: state.hovered ? colors.primaryPurple : colors.cardBorder, backgroundColor: colors.inputBgFrom },
              ]}
            >
              {pictureFile ? (
                <Image
                  source={{ uri: `data:${pictureMime};base64,${pictureFile}` }}
                  style={styles.picturePickerImage}
                  resizeMode="cover"
                />
              ) : picture && resolvePictureUri(product) ? (
                <Image
                  source={{ uri: resolvePictureUri(product)! }}
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
                ref={fileInputRef as any}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' } as any}
              />
            )}
          </View>

          <View style={modalStyles.modalField}>
            <Text style={[modalStyles.modalLabel, { color: colors.textSecondary }]}>{t('Storage Quantity')}</Text>
            <View style={[styles.readOnlyField, { backgroundColor: colors.inputBgFrom, borderColor: colors.cardBorder }]}>
              <Text style={[styles.readOnlyValue, { color: colors.textMuted }]}>{quantity || '0'}</Text>
            </View>
          </View>

          <View style={modalStyles.modalField}>
            <Text style={[modalStyles.modalLabel, { color: colors.textSecondary }]}>{t('Default Value')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
            <PaperTextInput
              mode="outlined"
              style={[modalStyles.modalInput, { backgroundColor: colors.inputBgFrom }]}
              contentStyle={modalStyles.modalInputContent}
              outlineStyle={modalStyles.modalInputOutline}
              textColor={colors.textPrimary}
              outlineColor={colors.cardBorder}
              activeOutlineColor={colors.primaryPurple}
              value={defaultValue}
              onChangeText={(value) => setDefaultValue(sanitizeNumericInput(value))}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              inputMode="decimal"
              error={showDefaultValueError}
            />
            <HelperText type="error" visible={showDefaultValueError} style={modalStyles.fieldHelper}>
              {defaultValueError ?? ''}
            </HelperText>
          </View>

          <View style={modalStyles.modalField}>
            <Text style={[modalStyles.modalLabel, { color: colors.textSecondary }]}>{t('Unit of Measure')}</Text>
            <View style={[styles.readOnlyField, { backgroundColor: colors.inputBgFrom, borderColor: colors.cardBorder }]}>
              <Text style={[styles.readOnlyValue, { color: colors.textMuted }]}>{unit || '-'}</Text>
            </View>
          </View>

          <View style={[modalStyles.toggleRow, isCompact && modalStyles.toggleRowCompact]}>
            <Chip
              selected={isExternal}
              onPress={() => setIsExternal((current) => !current)}
              icon={isExternal ? 'check' : undefined}
              style={[
                modalStyles.toggleButton,
                { borderColor: colors.cardBorder },
                isExternal ? { backgroundColor: `${colors.primaryPurple}1A` } : { backgroundColor: colors.cardBgTo },
              ]}
              textStyle={[modalStyles.toggleLabel, { color: colors.textSecondary }]}
            >
              {t('External')}: {isExternal ? t('Yes') : t('No')}
            </Chip>
            <Chip
              selected={isService}
              onPress={() => setIsService((current) => !current)}
              icon={isService ? 'check' : undefined}
              style={[
                modalStyles.toggleButton,
                { borderColor: colors.cardBorder },
                isService ? { backgroundColor: `${colors.primaryPurple}1A` } : { backgroundColor: colors.cardBgTo },
              ]}
              textStyle={[modalStyles.toggleLabel, { color: colors.textSecondary }]}
            >
              {t('Service')}: {isService ? t('Yes') : t('No')}
            </Chip>
          </View>

          <View style={[modalStyles.modalActions, isCompact && modalStyles.modalActionsCompact]}>
            <Button
              mode="outlined"
              onPress={onClose}
              disabled={saving}
              textColor={colors.textSecondary}
              style={[modalStyles.modalButton, { borderColor: colors.cardBorder }]}
              contentStyle={modalStyles.modalButtonContent}
              labelStyle={modalStyles.modalButtonLabel}
            >
              {t('Cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              disabled={saveDisabled}
              buttonColor={colors.primaryPurple}
              textColor="#fff"
              style={modalStyles.modalButton}
              contentStyle={modalStyles.modalButtonContent}
              labelStyle={modalStyles.modalButtonLabel}
            >
              {saving ? t('Saving...') : t('Save')}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
});
