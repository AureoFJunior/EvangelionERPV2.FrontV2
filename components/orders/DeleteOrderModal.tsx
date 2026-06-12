import React from 'react';
import { Modal, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, IconButton } from '../ui/Paper';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { useResponsive } from '../../hooks/useResponsive';
import { Order as OrderModel } from '../../services/erpService';
import { modalStyles } from './shared';

type DeleteOrderModalProps = {
  order: OrderModel;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteOrderModal({ order, deleting, onCancel, onConfirm }: DeleteOrderModalProps) {
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
            <Text style={[modalStyles.modalTitle, { color: colors.textPrimary }]}>{t('Delete Order')}</Text>
            <IconButton
              icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
              size={18}
              onPress={onCancel}
              style={[modalStyles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
            />
          </View>
          <Text style={[modalStyles.confirmText, { color: colors.textSecondary }]}>
            {t('Delete order #{id}? This action cannot be undone.', { id: order.id ?? '-' })}
          </Text>
          <View style={[modalStyles.modalActions, isCompact && modalStyles.modalActionsCompact]}>
            <Button
              mode="outlined"
              onPress={onCancel}
              disabled={deleting}
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
              disabled={deleting}
              textColor={colors.accentOrange}
              style={[
                modalStyles.modalButton,
                modalStyles.deleteButton,
                { borderColor: colors.cardBorder },
                deleting && modalStyles.actionButtonDisabled,
              ]}
              contentStyle={modalStyles.modalButtonContent}
              labelStyle={modalStyles.modalButtonLabel}
            >
              {deleting ? t('Deleting...') : t('Delete')}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
