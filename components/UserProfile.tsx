import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card, TouchableRipple } from './ui/Paper';
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
  const { user, setUserLanguage } = useAuth();
  const { isCompact, contentPadding } = useResponsive();
  const [updatingLanguage, setUpdatingLanguage] = useState<AppLanguage | null>(null);
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
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
            <View style={[styles.avatarBadge, { borderColor: colors.neonGreen, backgroundColor: `${colors.primaryPurple}20` }]}>
              <Feather name="user" size={20} color={colors.neonGreen} />
            </View>
            <View style={styles.profileInfo}>
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
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    letterSpacing: 1,
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
    alignItems: 'center',
    gap: 14,
  },
  avatarBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
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
