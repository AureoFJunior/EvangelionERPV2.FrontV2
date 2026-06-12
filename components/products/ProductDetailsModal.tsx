import React, { useRef, useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { Button, IconButton } from '../ui/Paper';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { useResponsive } from '../../hooks/useResponsive';
import { formatCurrency } from '../../utils/currency';
import { ErpService, Product as ProductModel } from '../../services/erpService';
import {
  getStorageQuantity,
  resolveFileSource,
  resolvePictureUri,
} from '../../utils/products/form';
import { modalStyles } from './shared';

type ProductDetailsModalProps = {
  product: ProductModel;
  erpService: ErpService;
  onClose: () => void;
  onUpdated: (updated: ProductModel) => void;
};

export function ProductDetailsModal({ product, erpService, onClose, onUpdated }: ProductDetailsModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { currency } = useAuth();
  const { isCompact, isTablet } = useResponsive();

  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadPicture = async (base64: string) => {
    if (!product.id) return;
    const response = await erpService.uploadProductPicture(String(product.id), base64);
    if (response.ok && response.data) {
      onUpdated({ ...product, ...response.data });
    } else {
      setErrorMessage(response.error ?? 'Unable to upload picture');
    }
  };

  const handleFileChange = (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      setPicturePreview(dataUrl);
      uploadPicture(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const pickPicture = () => {
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
      setPicturePreview(asset.uri);
      uploadPicture(base64);
    })();
  };

  const fileSource = resolveFileSource(product);
  const canDownload = !!fileSource && /^https?:\/\//i.test(fileSource);
  const downloadFileName = fileSource ? fileSource.split('/').pop() ?? 'file' : null;

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
            <Text style={[modalStyles.modalTitle, { color: colors.textPrimary }]}>{t('Product Details')}</Text>
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

          <ScrollView
            style={[styles.detailsScroll, isCompact && styles.detailsScrollCompact]}
            contentContainerStyle={styles.detailsContent}
          >
            <View style={[styles.detailsMediaRow, isCompact && styles.detailsMediaRowCompact]}>
              <Pressable
                onPress={pickPicture}
                style={(state: any) => [
                  styles.detailsImageWrapper,
                  state.hovered && { opacity: 0.8 },
                ]}
              >
                {(() => {
                  const uri = picturePreview || resolvePictureUri(product);
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
                  ref={fileInputRef as any}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' } as any}
                />
              )}
              <View style={styles.detailsInfo}>
                <Text style={[styles.detailsName, { color: colors.textPrimary }]}>
                  {product.name}
                </Text>
                {!!product.description && (
                  <Text style={[styles.detailsDescription, { color: colors.textSecondary }]}>
                    {product.description}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.detailsGrid}>
              {[
                { icon: 'hash' as const, iconColor: colors.primaryPurple, label: t('Quantity'), value: String(getStorageQuantity(product)) },
                { icon: 'dollar-sign' as const, iconColor: colors.neonGreen, label: t('Default value'), value: formatCurrency((product.defaultValue ?? product.price) ?? 0, currency) },
                { icon: 'box' as const, iconColor: colors.primaryPurple, label: t('Unit'), value: product.unitOfMeasure ? product.unitOfMeasure.toUpperCase() : '-' },
                { icon: 'external-link' as const, iconColor: colors.textMuted, label: t('External'), value: product.isExternal ? t('Yes') : t('No') },
                { icon: 'tool' as const, iconColor: colors.textMuted, label: t('Service'), value: product.isService ? t('Yes') : t('No') },
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

            <View style={styles.detailsFileSection}>
              <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>File</Text>
              {fileSource ? (
                <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                  {downloadFileName ?? 'Attached'}
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  detailsImageWrapper: {
    position: 'relative',
    width: 96,
    height: 96,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'opacity 0.15s ease' } as any, default: {} }),
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
