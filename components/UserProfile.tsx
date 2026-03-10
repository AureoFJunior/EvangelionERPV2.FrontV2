import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, TouchableRipple } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useResponsive } from '../hooks/useResponsive';
import { AppLanguage, normalizeLanguageCode } from '../utils/language';

const languageOrder: AppLanguage[] = ['en', 'pt', 'es', 'ja'];

const languageMeta: Record<AppLanguage, { key: string; short: string }> = {
  en: { key: 'English', short: 'EN' },
  pt: { key: 'Portuguese', short: 'PT' },
  es: { key: 'Spanish', short: 'ES' },
  ja: { key: 'Japanese', short: 'JA' },
};

export function UserProfile() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user, setUserLanguage, setUserProfilePicture } = useAuth();
  const { isCompact, contentPadding } = useResponsive();
  const [updatingLanguage, setUpdatingLanguage] = useState<AppLanguage | null>(null);
  const [updatingPicture, setUpdatingPicture] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.content, { padding: contentPadding }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
            {t('USER PROFILE')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}>
            {t('Manage your account preferences')}
          </Text>
          <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
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

        <Card mode="outlined" style={[styles.profileCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
          <Card.Content style={styles.profileCardContent}>
            <View style={[styles.avatarPanel, isCompact && styles.avatarPanelCompact]}>
              <View style={[styles.avatarBadge, { borderColor: colors.neonGreen, backgroundColor: `${colors.primaryPurple}20` }]}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Feather name="user" size={32} color={colors.neonGreen} />
                )}
              </View>
              <Button
                mode="outlined"
                onPress={handleProfilePictureChange}
                loading={updatingPicture}
                disabled={updatingPicture}
                textColor={colors.textSecondary}
                icon={({ size }) => <Feather name="image" size={size} color={colors.textSecondary} />}
                style={[styles.pictureButton, { borderColor: colors.cardBorder }]}
                compact
              >
                {t('Change Picture')}
              </Button>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileMetaLabel, { color: colors.textMuted }]}>
                {t('Profile Picture')}
              </Text>
              <Text style={[styles.profileName, { color: colors.textPrimary }]}>
                {user?.name ?? t('User')}
              </Text>
              <Text style={[styles.profileMeta, { color: colors.textSecondary }]}>
                {user?.email ?? '-'}
              </Text>
              <Text style={[styles.profileMeta, { color: colors.primaryPurple }]}>
                {user?.role ?? t('Operator')}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={[styles.languageCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
          <Card.Content style={styles.languageCardContent}>
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
                        backgroundColor: isSelected ? colors.primaryPurple : colors.inputBgTo,
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
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                {t('Currency settings are unchanged.')}
              </Text>
            </View>
          </Card.Content>
        </Card>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 6,
    lineHeight: 36,
  },
  titleCompact: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 10,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  headerLine: {
    height: 6,
    width: 132,
    borderRadius: 999,
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
  profileCard: {
    borderRadius: 10,
    marginBottom: 14,
  },
  profileCardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  avatarPanel: {
    alignItems: 'center',
    gap: 8,
  },
  avatarPanelCompact: {
    alignItems: 'flex-start',
  },
  avatarBadge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  pictureButton: {
    borderWidth: 1,
    borderRadius: 999,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileMetaLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileMeta: {
    fontSize: 12,
  },
  languageCard: {
    borderRadius: 10,
  },
  languageCardContent: {
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
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
    marginTop: 8,
    gap: 4,
  },
  infoText: {
    fontSize: 11,
  },
});
