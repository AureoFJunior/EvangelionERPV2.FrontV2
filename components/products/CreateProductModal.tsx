import React, { useState } from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
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
  parseNumber,
  sanitizeNumericInput,
  sanitizeQuantityInput,
  unitAllowsDecimal,
} from '../../utils/products/form';
import { modalStyles, unitOptions } from './shared';

type CreateProductModalProps = {
  erpService: ErpService;
  onClose: () => void;
  onCreated: (product: ProductModel | null) => void;
};

export function CreateProductModal({ erpService, onClose, onCreated }: CreateProductModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isCompact, isTablet } = useResponsive();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [picture, setPicture] = useState('');
  const [pictureFile, setPictureFile] = useState('');
  const [pictureMime, setPictureMime] = useState('image/jpeg');
  const [quantity, setQuantity] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  const [unit, setUnit] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [isService, setIsService] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [file, setFile] = useState('');
  const [fileName, setFileName] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const quantityError = getQuantityError(quantity, unit);
  const defaultValueError = getNumberError(defaultValue, { required: true, allowZero: true });
  const showQuantityError = (showErrors || quantity.trim().length > 0) && !!quantityError;
  const showDefaultValueError =
    (showErrors || defaultValue.trim().length > 0) && !!defaultValueError;
  const createDisabled = creating || !!quantityError || !!defaultValueError || !name.trim();

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
    const assetFileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'picture';
    setPicture(assetFileName);
    setPictureFile(asset.base64 ?? '');
    setPictureMime(asset.mimeType ?? 'image/jpeg');

    if (!asset.base64 && asset.uri) {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPictureFile(base64);
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
    setFileName(asset.name ?? 'file');

    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    setFile(base64);
  };

  const handleCreate = async () => {
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

    const filePayload = file || pictureFile;

    const parsedQuantity = parseNumber(quantity) ?? 0;
    const parsedDefaultValue = parseNumber(defaultValue) ?? 0;

    setCreating(true);
    setErrorMessage(null);

    const payload = {
      name: trimmedName,
      description: description.trim(),
      storageQuantity: parsedQuantity,
      defaultValue: parsedDefaultValue,
      unitOfMeasure: unit.trim().toUpperCase(),
      isExternal,
      isService,
      pictureAdress: picture.trim(),
    };

    const response = await erpService.createProduct({
      product: payload as ProductModel,
      file: filePayload,
    });
    if (response.ok) {
      onCreated(response.data ?? null);
    } else {
      setErrorMessage(response.error ?? 'Unable to create product');
      setCreating(false);
    }
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
            <Text style={[modalStyles.modalTitle, { color: colors.textPrimary }]}>{t('New Product')}</Text>
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
            <Text style={[modalStyles.modalLabel, { color: colors.textSecondary }]}>{t('Description')}</Text>
            <PaperTextInput
              mode="outlined"
              style={[modalStyles.modalInput, { backgroundColor: colors.inputBgFrom }]}
              contentStyle={modalStyles.modalInputContent}
              outlineStyle={modalStyles.modalInputOutline}
              textColor={colors.textPrimary}
              outlineColor={colors.cardBorder}
              activeOutlineColor={colors.primaryPurple}
              value={description}
              onChangeText={setDescription}
              placeholder={t('Description')}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={modalStyles.modalField}>
            <Text style={[modalStyles.modalLabel, { color: colors.textSecondary }]}>{t('Picture')}</Text>
            <View style={modalStyles.fileRow}>
              <Button
                mode="outlined"
                onPress={pickImage}
                icon={({ size }) => <Feather name="image" size={size} color={colors.primaryPurple} />}
                textColor={colors.primaryPurple}
                style={[modalStyles.fileButton, { borderColor: colors.cardBorder }]}
                contentStyle={modalStyles.fileButtonContent}
              >
                {t('Select picture')}
              </Button>
              <Text style={[modalStyles.fileName, { color: picture ? colors.textPrimary : colors.textMuted }]}>
                {picture || t('No picture selected')}
              </Text>
              {pictureFile ? (
                <Image
                  source={{ uri: `data:${pictureMime};base64,${pictureFile}` }}
                  style={[styles.picturePreview, { borderColor: colors.cardBorder }]}
                />
              ) : null}
            </View>
          </View>

          <View style={modalStyles.modalField}>
            <Text style={[modalStyles.modalLabel, { color: colors.textSecondary }]}>{t('Storage Quantity')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
            <PaperTextInput
              mode="outlined"
              style={[modalStyles.modalInput, { backgroundColor: colors.inputBgFrom }]}
              contentStyle={modalStyles.modalInputContent}
              outlineStyle={modalStyles.modalInputOutline}
              textColor={colors.textPrimary}
              outlineColor={colors.cardBorder}
              activeOutlineColor={colors.primaryPurple}
              value={quantity}
              onChangeText={(value) => setQuantity(sanitizeQuantityInput(value, unit))}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType={unitAllowsDecimal(unit) ? 'decimal-pad' : 'numeric'}
              inputMode={unitAllowsDecimal(unit) ? 'decimal' : 'numeric'}
              error={showQuantityError}
            />
            <HelperText type="error" visible={showQuantityError} style={modalStyles.fieldHelper}>
              {quantityError ?? ''}
            </HelperText>
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
            <Text style={[modalStyles.modalLabel, { color: colors.textSecondary }]}>{t('Unit of Measure')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
            <Button
              mode="outlined"
              onPress={() => setUnitOpen((current) => !current)}
              icon={({ size }) => (
                <Feather name={unitOpen ? 'chevron-up' : 'chevron-down'} size={size} color={colors.textSecondary} />
              )}
              textColor={unit ? colors.textPrimary : colors.textMuted}
              style={[modalStyles.modalInput, styles.dropdownButton, { borderColor: colors.cardBorder }]}
              contentStyle={styles.dropdownButtonContent}
            >
              {unit || t('Select unit')}
            </Button>
            {unitOpen && (
              <View style={[styles.dropdownList, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                <View style={modalStyles.unitChips}>
                  {unitOptions.map((unitOption) => (
                    <Chip
                      key={unitOption}
                      selected={unit === unitOption}
                      onPress={() => {
                        setUnit(unitOption);
                        setQuantity((current) => sanitizeQuantityInput(current, unitOption));
                        setUnitOpen(false);
                      }}
                      icon={unit === unitOption ? 'check' : undefined}
                      style={[
                        modalStyles.unitChip,
                        {
                          borderColor: unit === unitOption ? colors.neonGreen : colors.cardBorder,
                          backgroundColor: unit === unitOption ? `${colors.neonGreen}1A` : colors.cardBgTo,
                        },
                      ]}
                      textStyle={[styles.dropdownItemText, { color: colors.textPrimary }]}
                    >
                      {unitOption}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={modalStyles.modalField}>
            <Text style={[modalStyles.modalLabel, { color: colors.textSecondary }]}>{t('File')}</Text>
            <View style={modalStyles.fileRow}>
              <Button
                mode="outlined"
                onPress={pickFile}
                icon={({ size }) => <Feather name="paperclip" size={size} color={colors.primaryPurple} />}
                textColor={colors.primaryPurple}
                style={[modalStyles.fileButton, { borderColor: colors.cardBorder }]}
                contentStyle={modalStyles.fileButtonContent}
              >
                {t('Select file')}
              </Button>
              <Text style={[modalStyles.fileName, { color: fileName ? colors.textPrimary : colors.textMuted }]}>
                {fileName || t('No file selected')}
              </Text>
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
              disabled={creating}
              textColor={colors.textSecondary}
              style={[modalStyles.modalButton, { borderColor: colors.cardBorder }]}
              contentStyle={modalStyles.modalButtonContent}
              labelStyle={modalStyles.modalButtonLabel}
            >
              {t('Cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleCreate}
              disabled={createDisabled}
              buttonColor={colors.primaryPurple}
              textColor="#fff"
              style={modalStyles.modalButton}
              contentStyle={modalStyles.modalButtonContent}
              labelStyle={modalStyles.modalButtonLabel}
            >
              {creating ? t('Creating...') : t('Create')}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  picturePreview: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    marginTop: 4,
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
});
