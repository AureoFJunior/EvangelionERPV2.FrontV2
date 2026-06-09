import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Button, TouchableRipple } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useResponsive } from '../hooks/useResponsive';
import { AppLanguage, normalizeLanguageCode } from '../utils/language';
import { StatusBadge } from './StatusBadge';

const languageOrder: AppLanguage[] = ['en', 'pt', 'es', 'ja'];

const languageMeta: Record<AppLanguage, { key: string; short: string }> = {
  en: { key: 'English', short: 'EN' },
  pt: { key: 'Portuguese', short: 'PT' },
  es: { key: 'Spanish', short: 'ES' },
  ja: { key: 'Japanese', short: 'JA' },
};

export function UserProfile() {
  const { colors, theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const { user, setUserLanguage, setUserProfilePicture } = useAuth();
  const { isCompact, contentPadding, width } = useResponsive();
  const [updatingLanguage, setUpdatingLanguage] = useState<AppLanguage | null>(null);
  const [updatingPicture, setUpdatingPicture] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);

  const currentLanguage = normalizeLanguageCode(user?.language) ?? 'en';

  const currentLanguageLabel = useMemo(() => t(languageMeta[currentLanguage].key), [currentLanguage, t]);

  const handleLanguageChange = async (nextLanguage: AppLanguage) => {
    if (updatingLanguage || nextLanguage === currentLanguage) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setUpdatingLanguage(nextLanguage);

    try {
      await setUserLanguage(nextLanguage);
      setSuccessMessage(t('Language updated.'));
    } catch {
      setErrorMessage(t('Unable to update language.'));
    } finally {
      setUpdatingLanguage(null);
    }
  };

  const handleProfilePictureChange = async () => {
    if (updatingPicture) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setUpdatingPicture(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage(t('Gallery permission is required to select a picture.'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      let base64 = asset.base64 ?? '';
      if (!base64 && asset.uri) {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      if (!base64) {
        throw new Error('Missing image payload');
      }

      const mimeType = asset.mimeType ?? 'image/jpeg';
      const dataUri = `data:${mimeType};base64,${base64}`;

      await setUserProfilePicture(dataUri);
      setSuccessMessage(t('Profile picture updated.'));
    } catch {
      setErrorMessage(t('Unable to update profile picture.'));
    } finally {
      setUpdatingPicture(false);
    }
  };

  const useWideForm = !isCompact && width >= 640;
  const userInitials = (user?.name ?? 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.content, { padding: contentPadding, maxWidth: 680 }]}>
        {/* Page Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }, isCompact && styles.titleCompact]}>
            {t('Profile')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t('Account settings and preferences')}
          </Text>
        </View>

        {errorMessage && (
          <View
            style={[
              styles.banner,
              { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange },
            ]}
          >
            <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{errorMessage}</Text>
          </View>
        )}

        {successMessage && (
          <View style={[styles.banner, { backgroundColor: `${colors.neonGreen}12`, borderColor: colors.neonGreen }]}>
            <Text style={[styles.bannerText, { color: colors.neonGreen }]}>{successMessage}</Text>
          </View>
        )}

        {/* Avatar + Form Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
          {/* Avatar + Info Row */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarCircle, { backgroundColor: `${colors.primaryPurple}20`, borderColor: `${colors.primaryPurple}66` }]}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={[styles.avatarInitials, { color: colors.primaryPurple }]}>{userInitials}</Text>
                )}
              </View>
              <Pressable
                onPress={handleProfilePictureChange}
                style={[styles.cameraButton, { backgroundColor: colors.primaryPurple }]}
              >
                <Feather name="camera" size={12} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={[styles.profileName, { color: colors.textPrimary }]}>
                {user?.name ?? t('User')}
              </Text>
              <Text style={[styles.profileRole, { color: colors.textMuted }]}>
                {user?.role ?? t('Operator')}
              </Text>
              <Text style={[styles.profileSince, { color: colors.textMuted }]}>
                {t('Member since')} 2024
              </Text>
            </View>
          </View>

          {/* Form Grid */}
          <View style={[styles.formGrid, useWideForm && styles.formGridWide]}>
            {[
              { label: t('Full Name'), value: user?.name ?? '' },
              { label: t('Email'), value: user?.email ?? '' },
              { label: t('Phone'), value: '' },
              { label: t('Department'), value: user?.role ?? '' },
            ].map(({ label, value }) => (
              <View key={label} style={[styles.formField, useWideForm && styles.formFieldHalf]}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>{label}</Text>
                <TextInput
                  defaultValue={value}
                  style={[
                    styles.formInput,
                    {
                      color: colors.textPrimary,
                      backgroundColor: `${colors.cardBorder}30`,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  placeholderTextColor={colors.textMuted}
                  editable={false}
                />
              </View>
            ))}
          </View>

          <View style={styles.saveRow}>
            <Button
              mode="contained"
              buttonColor={colors.primaryPurple}
              textColor="#fff"
              style={styles.saveButton}
              contentStyle={styles.saveButtonContent}
            >
              {t('Save Changes')}
            </Button>
          </View>
        </View>

        {/* Preferences Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Preferences')}</Text>
          <View style={styles.prefList}>
            {/* Email Notifications Toggle */}
            <View style={styles.prefRow}>
              <View style={[styles.prefIconBox, { backgroundColor: `${colors.cardBorder}40` }]}>
                <Feather name="bell" size={16} color={colors.textMuted} />
              </View>
              <View style={styles.prefInfo}>
                <Text style={[styles.prefLabel, { color: colors.textPrimary }]}>{t('Email Notifications')}</Text>
                <Text style={[styles.prefDesc, { color: colors.textMuted }]}>
                  {t('Receive alerts for new orders and overdue invoices')}
                </Text>
              </View>
              <Pressable
                onPress={() => setNotifications(!notifications)}
                style={[styles.toggleTrack, { backgroundColor: notifications ? colors.primaryPurple : `${colors.cardBorder}60` }]}
              >
                <View style={[styles.toggleThumb, notifications && styles.toggleThumbActive]} />
              </Pressable>
            </View>

            {/* Dark Mode Toggle */}
            <View style={styles.prefRow}>
              <View style={[styles.prefIconBox, { backgroundColor: `${colors.cardBorder}40` }]}>
                <Feather name="moon" size={16} color={colors.textMuted} />
              </View>
              <View style={styles.prefInfo}>
                <Text style={[styles.prefLabel, { color: colors.textPrimary }]}>{t('Dark Mode')}</Text>
                <Text style={[styles.prefDesc, { color: colors.textMuted }]}>
                  {t('Use the dark color theme across the application')}
                </Text>
              </View>
              <Pressable
                onPress={toggleTheme}
                style={[styles.toggleTrack, { backgroundColor: theme === 'dark' ? colors.primaryPurple : `${colors.cardBorder}60` }]}
              >
                <View style={[styles.toggleThumb, theme === 'dark' && styles.toggleThumbActive]} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Language Selection */}
        <View style={[styles.card, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Language Preferences')}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            {t('Select the system language for your account.')}
          </Text>

          <View style={[styles.languageOptions, isCompact && styles.languageOptionsCompact]}>
            {languageOrder.map((language) => {
              const isSelected = language === currentLanguage;
              const isUpdating = updatingLanguage === language;

              return (
                <TouchableRipple
                  key={language}
                  onPress={() => handleLanguageChange(language)}
                  disabled={Boolean(updatingLanguage)}
                  rippleColor={`${colors.primaryPurple}22`}
                  style={[
                    styles.languageOption,
                    {
                      borderColor: isSelected ? colors.primaryPurple : colors.cardBorder,
                      backgroundColor: isSelected ? colors.primaryPurple : `${colors.cardBorder}30`,
                    },
                    isCompact && styles.languageOptionCompact,
                  ]}
                >
                  <View style={styles.languageOptionContent}>
                    <View style={styles.languageLabelRow}>
                      {isSelected && !isUpdating ? <Feather name="check" size={14} color={colors.neonGreen} /> : null}
                      <Text
                        style={[
                          styles.languageOptionText,
                          { color: isSelected ? colors.neonGreen : colors.textSecondary },
                        ]}
                      >
                        {t(languageMeta[language].key)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.languageOptionShort,
                        { color: isSelected ? colors.textPrimary : colors.textMuted },
                      ]}
                    >
                      {languageMeta[language].short}
                    </Text>
                  </View>
                </TouchableRipple>
              );
            })}
          </View>

          <View style={styles.languageInfo}>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              {t('Current language')}: {currentLanguageLabel}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
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
  banner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  bannerText: {
    fontSize: 12,
  },
  // Shared card style
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    marginBottom: 16,
  },
  cardLast: {
    marginBottom: 16,
  },
  // Avatar section
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '700',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatarInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileRole: {
    fontSize: 14,
    marginTop: 2,
  },
  profileSince: {
    fontSize: 12,
    marginTop: 2,
  },
  // Form grid
  formGrid: {
    gap: 16,
  },
  formGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  formField: {},
  formFieldHalf: {
    width: '48%',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  formInput: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  saveRow: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  saveButton: {
    borderRadius: 8,
  },
  saveButtonContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  // Section titles
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  // Preferences
  prefList: {
    gap: 16,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prefIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefInfo: {
    flex: 1,
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  prefDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  toggleTrack: {
    width: 40,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  // Language
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  languageOptionsCompact: {
    flexDirection: 'column',
  },
  languageOption: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    minWidth: 150,
  },
  languageOptionCompact: {
    width: '100%',
  },
  languageOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  languageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  languageOptionShort: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  languageInfo: {
    marginTop: 12,
    gap: 4,
  },
  infoText: {
    fontSize: 11,
  },
  // Security
  securityList: {
    gap: 12,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  securityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  securityInfo: {
    flex: 1,
  },
  changeButton: {
    borderRadius: 8,
  },
  changeButtonContent: {
    paddingHorizontal: 12,
    height: 32,
  },
});
