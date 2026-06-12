import React from 'react';
import { Modal, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, IconButton } from '../ui/Paper';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { useResponsive } from '../../hooks/useResponsive';
import { Product as ProductModel } from '../../services/erpService';
import { modalStyles } from './shared';

type DeactivateProductModalProps = {
  product: ProductModel;
  deactivating: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeactivateProductModal({
  product,
  deactivating,
  onCancel,
  onConfirm,
}: DeactivateProductModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isCompact, isTablet } = useResponsive();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={modalStyles.modalBackdrop}>
        <View
          style={[
            modalStyles.modalCard,
            { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
            isTablet && modalStyles.modalCardWide,
          ]}
        >
          <View style={modalStyles.modalHeader}>
            <Text style={[modalStyles.modalTitle, { color: colors.textPrimary }]}>{t('Deactivate Product')}</Text>
            <IconButton
              icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
              size={18}
              onPress={onCancel}
              style={[modalStyles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
            />
          </View>
          <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
            {t('Deactivate {name}? It will no longer appear in the active catalog.', {
              name: product.name ?? t('this product'),
            })}
          </Text>
          <View style={[modalStyles.modalActions, isCompact && modalStyles.modalActionsCompact]}>
            <Button
              mode="outlined"
              onPress={onCancel}
              disabled={deactivating}
              textColor={colors.textSecondary}
              style={[modalStyles.modalButton, { borderColor: colors.cardBorder }]}
              contentStyle={modalStyles.modalButtonContent}
              labelStyle={modalStyles.modalButtonLabel}
            >
              {t('Cancel')}
            </Button>
            <Button
              mode="outlined"
              onPress={onConfirm}
              disabled={deactivating}
              textColor={colors.destructive}
              style={[
                modalStyles.modalButton,
                { borderColor: colors.cardBorder, borderWidth: 1.5 },
                deactivating && { opacity: 0.6 },
              ]}
              contentStyle={modalStyles.modalButtonContent}
              labelStyle={modalStyles.modalButtonLabel}
            >
              {deactivating ? t('Deactivating...') : t('Deactivate')}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  confirmText: {
    fontSize: 13,
    lineHeight: 18,
  } as const,
};
