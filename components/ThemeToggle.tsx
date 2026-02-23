import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

export function ThemeToggle() {
  const { theme, toggleTheme, colors } = useTheme();
  const { t } = useI18n();

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      testID="theme-toggle"
      style={[styles.container, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('Theme')}</Text>
      <View style={styles.toggleContainer}>
        <Feather
          name={theme === 'light' ? 'sun' : 'moon'}
          size={20}
          color={colors.neonGreen}
        />
        <View style={[styles.switch, { backgroundColor: `${colors.cardBorder}50` }]}
        >
          <View
            style={[
              styles.switchThumb,
              { backgroundColor: colors.primaryPurple },
              theme === 'dark' ? styles.switchThumbLeft : styles.switchThumbRight,
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  label: {
    fontSize: 14,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switch: {
    width: 48,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  switchThumbLeft: {
    alignSelf: 'flex-start',
  },
  switchThumbRight: {
    alignSelf: 'flex-end',
  },
});
