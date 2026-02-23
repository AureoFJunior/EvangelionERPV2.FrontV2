import React from 'react';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, IconButton } from '../ui/Paper';
import { CustomerColors } from './types';
import { useI18n } from '../../contexts/I18nContext';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy: boolean;
  isCompact: boolean;
  isTablet: boolean;
  colors: CustomerColors;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  busy,
  isCompact,
  isTablet,
  colors,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
            isTablet && styles.modalCardWide,
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{title}</Text>
            <IconButton
              icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
              size={18}
              onPress={onCancel}
              disabled={busy}
              style={[
                styles.modalCloseButton,
                { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo },
              ]}
            />
          </View>

          <Text style={[styles.confirmText, { color: colors.textSecondary }]}>{message}</Text>

          <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
            <Button
              mode="outlined"
              onPress={onCancel}
              disabled={busy}
              textColor={colors.textSecondary}
              style={[styles.modalButton, { borderColor: colors.cardBorder }]}
              contentStyle={styles.modalButtonContent}
              labelStyle={styles.modalButtonLabel}
            >
              {t(cancelLabel)}
            </Button>
            <Button
              mode="contained"
              onPress={onConfirm}
              disabled={busy}
              buttonColor={colors.primaryPurple}
              textColor={colors.appBg}
              style={styles.modalButton}
              contentStyle={styles.modalButtonContent}
              labelStyle={styles.modalButtonLabel}
            >
              {busy ? t('Deactivating...') : t(confirmLabel)}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxWidth: 520,
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
  confirmText: {
    fontSize: 13,
    lineHeight: 18,
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
});
