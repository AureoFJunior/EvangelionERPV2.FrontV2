import React from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Chip, HelperText, IconButton, TextInput as PaperTextInput } from '../ui/Paper';
import {
  CustomerFormErrors,
  CustomerFormValues,
  CustomerStatusOption,
  formatPhone,
  formatPostalCode,
  normalizeDigits,
  normalizeStateCode,
} from '../../utils/customers/validation';
import { CustomerColors, CustomerFormMode } from './types';
import { useI18n } from '../../contexts/I18nContext';

interface CustomerFormModalProps {
  visible: boolean;
  mode: CustomerFormMode;
  values: CustomerFormValues;
  errors: CustomerFormErrors;
  attempted: boolean;
  submitting: boolean;
  submitDisabled: boolean;
  isCompact: boolean;
  isTablet: boolean;
  colors: CustomerColors;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onFieldChange: (field: keyof CustomerFormValues, value: string | CustomerStatusOption) => void;
}

const statusOptions: CustomerStatusOption[] = ['Active', 'Inactive'];

export function CustomerFormModal({
  visible,
  mode,
  values,
  errors,
  attempted,
  submitting,
  submitDisabled,
  isCompact,
  isTablet,
  colors,
  errorMessage,
  onClose,
  onSubmit,
  onFieldChange,
}: CustomerFormModalProps) {
  const { t } = useI18n();
  const showNameError = attempted || !!values.name.trim();
  const showEmailError = attempted || !!values.email.trim();
  const showPhoneError = attempted || !!normalizeDigits(values.phone);
  const showDocumentError = attempted || !!normalizeDigits(values.document);
  const showStreetError = attempted || !!values.street.trim();
  const showCityError = attempted || !!values.city.trim();
  const showStateError = attempted || !!values.state.trim();
  const showPostalCodeError = attempted || !!normalizeDigits(values.postalCode);
  const title = mode === 'create' ? t('New Customer') : t('Edit Customer');
  const submitLabel =
    mode === 'create'
      ? submitting
        ? t('Creating...')
        : t('Create')
      : submitting
        ? t('Saving...')
        : t('Save');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
              onPress={onClose}
              disabled={submitting}
              style={[
                styles.modalCloseButton,
                { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo },
              ]}
            />
          </View>

          {!!errorMessage && (
            <View style={[styles.errorBanner, { backgroundColor: '#ff4d7d1A', borderColor: '#ff4d7d40' }]}>
              <Feather name="alert-circle" size={14} color="#ff4d7d" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                {t('Full name')} <Text style={styles.requiredMark}>*</Text>
              </Text>
              <PaperTextInput
                mode="outlined"
                style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                contentStyle={styles.modalInputContent}
                outlineStyle={styles.modalInputOutline}
                textColor={colors.textPrimary}
                outlineColor={colors.cardBorder}
                activeOutlineColor={colors.primaryPurple}
                value={values.name}
                onChangeText={(value) => onFieldChange('name', value)}
                placeholder={t('Customer full name')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                error={!!errors.name && showNameError}
                editable={!submitting}
              />
              <HelperText type="error" visible={!!errors.name && showNameError} style={styles.fieldHelper}>
                {errors.name ?? ''}
              </HelperText>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                {t('Email')} <Text style={styles.requiredMark}>*</Text>
              </Text>
              <PaperTextInput
                mode="outlined"
                style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                contentStyle={styles.modalInputContent}
                outlineStyle={styles.modalInputOutline}
                textColor={colors.textPrimary}
                outlineColor={colors.cardBorder}
                activeOutlineColor={colors.primaryPurple}
                value={values.email}
                onChangeText={(value) => onFieldChange('email', value)}
                placeholder="email@domain.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                error={!!errors.email && showEmailError}
                editable={!submitting}
              />
              <HelperText type="error" visible={!!errors.email && showEmailError} style={styles.fieldHelper}>
                {errors.email ?? ''}
              </HelperText>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                {t('Phone')} <Text style={styles.requiredMark}>*</Text>
              </Text>
              <PaperTextInput
                mode="outlined"
                style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                contentStyle={styles.modalInputContent}
                outlineStyle={styles.modalInputOutline}
                textColor={colors.textPrimary}
                outlineColor={colors.cardBorder}
                activeOutlineColor={colors.primaryPurple}
                value={values.phone}
                onChangeText={(value) => onFieldChange('phone', formatPhone(value))}
                placeholder="(11) 99999-9999"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                maxLength={15}
                error={!!errors.phone && showPhoneError}
                editable={!submitting}
              />
              <HelperText type="error" visible={!!errors.phone && showPhoneError} style={styles.fieldHelper}>
                {errors.phone ?? ''}
              </HelperText>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Document (CPF/CNPJ/NIF)')}</Text>
              <PaperTextInput
                mode="outlined"
                style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                contentStyle={styles.modalInputContent}
                outlineStyle={styles.modalInputOutline}
                textColor={colors.textPrimary}
                outlineColor={colors.cardBorder}
                activeOutlineColor={colors.primaryPurple}
                value={values.document}
                onChangeText={(value) => onFieldChange('document', value)}
                placeholder={t('CPF/CNPJ/NIF')}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                error={!!errors.document && showDocumentError}
                editable={!submitting}
              />
              <HelperText type="error" visible={!!errors.document && showDocumentError} style={styles.fieldHelper}>
                {errors.document ?? ''}
              </HelperText>
            </View>

            <View
              style={[
                styles.addressGroup,
                styles.addressGroupCard,
                { backgroundColor: colors.cardBgTo, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('Address')} <Text style={styles.requiredMark}>*</Text>
              </Text>

              <View style={[styles.fieldRow, isCompact && styles.fieldRowCompact]}>
                <View style={[styles.modalField, styles.fieldFlexWide]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                    {t('Street')} <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <PaperTextInput
                    mode="outlined"
                    style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                    contentStyle={styles.modalInputContent}
                    outlineStyle={styles.modalInputOutline}
                    textColor={colors.textPrimary}
                    outlineColor={colors.cardBorder}
                    activeOutlineColor={colors.primaryPurple}
                    value={values.street}
                    onChangeText={(value) => onFieldChange('street', value)}
                    placeholder="Av. Paulista"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    error={!!errors.street && showStreetError}
                    editable={!submitting}
                  />
                  <HelperText type="error" visible={!!errors.street && showStreetError} style={styles.fieldHelper}>
                    {errors.street ?? ''}
                  </HelperText>
                </View>

                <View style={[styles.modalField, styles.fieldFlexNarrow]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Number')}</Text>
                  <PaperTextInput
                    mode="outlined"
                    style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                    contentStyle={styles.modalInputContent}
                    outlineStyle={styles.modalInputOutline}
                    textColor={colors.textPrimary}
                    outlineColor={colors.cardBorder}
                    activeOutlineColor={colors.primaryPurple}
                    value={values.number}
                    onChangeText={(value) => onFieldChange('number', value)}
                    placeholder="1234"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="default"
                    editable={!submitting}
                  />
                </View>

                <View style={[styles.modalField, styles.fieldFlex]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('CEP')}</Text>
                  <PaperTextInput
                    mode="outlined"
                    style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                    contentStyle={styles.modalInputContent}
                    outlineStyle={styles.modalInputOutline}
                    textColor={colors.textPrimary}
                    outlineColor={colors.cardBorder}
                    activeOutlineColor={colors.primaryPurple}
                    value={values.postalCode}
                    onChangeText={(value) => onFieldChange('postalCode', formatPostalCode(value))}
                    placeholder="12345-678"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={9}
                    error={!!errors.postalCode && showPostalCodeError}
                    editable={!submitting}
                  />
                  <HelperText type="error" visible={!!errors.postalCode && showPostalCodeError} style={styles.fieldHelper}>
                    {errors.postalCode ?? ''}
                  </HelperText>
                </View>
              </View>

              <View style={[styles.fieldRow, isCompact && styles.fieldRowCompact]}>
                <View style={[styles.modalField, styles.fieldFlex]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Neighborhood')}</Text>
                  <PaperTextInput
                    mode="outlined"
                    style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                    contentStyle={styles.modalInputContent}
                    outlineStyle={styles.modalInputOutline}
                    textColor={colors.textPrimary}
                    outlineColor={colors.cardBorder}
                    activeOutlineColor={colors.primaryPurple}
                    value={values.neighborhood}
                    onChangeText={(value) => onFieldChange('neighborhood', value)}
                    placeholder="Bela Vista"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    editable={!submitting}
                  />
                </View>

                <View style={[styles.modalField, styles.fieldFlex]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('City')}</Text>
                  <PaperTextInput
                    mode="outlined"
                    style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                    contentStyle={styles.modalInputContent}
                    outlineStyle={styles.modalInputOutline}
                    textColor={colors.textPrimary}
                    outlineColor={colors.cardBorder}
                    activeOutlineColor={colors.primaryPurple}
                    value={values.city}
                    onChangeText={(value) => onFieldChange('city', value)}
                    placeholder="Sao Paulo"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    error={!!errors.city && showCityError}
                    editable={!submitting}
                  />
                  <HelperText type="error" visible={!!errors.city && showCityError} style={styles.fieldHelper}>
                    {errors.city ?? ''}
                  </HelperText>
                </View>
              </View>

              <View style={[styles.fieldRow, isCompact && styles.fieldRowCompact]}>
                <View style={[styles.modalField, styles.fieldFlexNarrow]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('State')}</Text>
                  <PaperTextInput
                    mode="outlined"
                    style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                    contentStyle={styles.modalInputContent}
                    outlineStyle={styles.modalInputOutline}
                    textColor={colors.textPrimary}
                    outlineColor={colors.cardBorder}
                    activeOutlineColor={colors.primaryPurple}
                    value={values.state}
                    onChangeText={(value) => onFieldChange('state', normalizeStateCode(value))}
                    placeholder="SP"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    maxLength={2}
                    error={!!errors.state && showStateError}
                    editable={!submitting}
                  />
                  <HelperText type="error" visible={!!errors.state && showStateError} style={styles.fieldHelper}>
                    {errors.state ?? ''}
                  </HelperText>
                </View>

                <View style={[styles.modalField, styles.fieldFlexWide]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Complement')}</Text>
                  <PaperTextInput
                    mode="outlined"
                    style={[styles.modalInput, { backgroundColor: colors.inputBgFrom }]}
                    contentStyle={styles.modalInputContent}
                    outlineStyle={styles.modalInputOutline}
                    textColor={colors.textPrimary}
                    outlineColor={colors.cardBorder}
                    activeOutlineColor={colors.primaryPurple}
                    value={values.complement}
                    onChangeText={(value) => onFieldChange('complement', value)}
                    placeholder="Apt 101"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    editable={!submitting}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('Status')}</Text>
              <View style={[styles.statusOptions, isCompact && styles.statusOptionsCompact]}>
                {statusOptions.map((status) => {
                  const isSelected = values.status === status;
                  return (
                    <Chip
                      key={status}
                      selected={isSelected}
                      onPress={() => onFieldChange('status', status)}
                      icon={isSelected ? 'check' : undefined}
                      style={[
                        styles.statusOption,
                        {
                          borderColor: isSelected ? colors.neonGreen : colors.cardBorder,
                          backgroundColor: isSelected ? `${colors.neonGreen}1A` : colors.cardBgTo,
                        },
                      ]}
                      textStyle={[
                        styles.statusOptionText,
                        { color: isSelected ? colors.neonGreen : colors.textSecondary },
                      ]}
                    >
                      {t(status)}
                    </Chip>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <Text style={[styles.requiredHint, { color: colors.textMuted }]}>
            <Text style={styles.requiredMark}>*</Text> {t('Required fields')}
          </Text>

          <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
            <Button
              mode="outlined"
              onPress={onClose}
              disabled={submitting}
              textColor={colors.textSecondary}
              style={[styles.modalButton, { borderColor: colors.cardBorder }]}
              contentStyle={styles.modalButtonContent}
              labelStyle={styles.modalButtonLabel}
            >
              {t('Cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={onSubmit}
              disabled={submitDisabled}
              buttonColor={colors.primaryPurple}
              textColor="#fff"
              style={styles.modalButton}
              contentStyle={styles.modalButtonContent}
              labelStyle={styles.modalButtonLabel}
            >
              {submitLabel}
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
    maxHeight: '95%',
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
  modalField: {
    gap: 8,
  },
  addressGroup: {
    gap: 14,
  },
  addressGroupCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 14,
  },
  fieldRowCompact: {
    flexDirection: 'column',
  },
  fieldFlex: {
    flex: 1,
  },
  fieldFlexWide: {
    flex: 2,
  },
  fieldFlexNarrow: {
    flex: 0.8,
    minWidth: 88,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
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
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOptionsCompact: {
    flexDirection: 'column',
  },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
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
  requiredMark: {
    color: '#ff4d7d',
    fontWeight: '700',
  },
  requiredHint: {
    fontSize: 11,
    marginTop: 4,
  },
});
