import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Button, Divider, Surface, TextInput as PaperTextInput, TouchableRipple } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useLoginController } from '../hooks/auth/useLoginController';
import { useI18n } from '../contexts/I18nContext';

WebBrowser.maybeCompleteAuthSession();

export function Login() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { login, loginWithGoogle, loginWithGoogleCode } = useAuth();
  const { isCompact } = useResponsive();

  const {
    username,
    setUsername,
    password,
    setPassword,
    submitting,
    error,
    submittingMode,
    showPassword,
    setShowPassword,
    missingWebClientId,
    googleRequest,
    isLoginDisabled,
    handleLogin,
    startGoogleLogin,
  } = useLoginController({
    login,
    loginWithGoogle,
    loginWithGoogleCode,
  });
  const glassBorder = `${colors.cardBorder}cc`;
  const glassBg = `${colors.cardBgFrom}f2`;
  const inputBg = `${colors.inputBgFrom}f5`;
  const googleBg = `${colors.neonGreen}14`;

  return (
    <View style={styles.background}>
      <LinearGradient
        colors={[colors.appBg, colors.cardBgTo]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow, styles.glowTop, { backgroundColor: `${colors.secondaryPurple}40` }]} />
      <View style={[styles.glow, styles.glowBottom, { backgroundColor: `${colors.neonGreen}2d` }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, isCompact && styles.scrollContentCompact]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Card */}
          <Surface
            style={[
              styles.glassCard,
              { borderColor: glassBorder, backgroundColor: glassBg },
              isCompact && styles.glassCardCompact,
            ]}
            elevation={0}
          >
            <BlurView
              intensity={12}
              tint="light"
              style={[styles.blurContainer, isCompact && styles.blurContainerCompact]}
            >
              <View style={[styles.logoContainer, isCompact && styles.logoContainerCompact]}>
                <View style={[styles.logoBox, { backgroundColor: colors.primaryPurple }, isCompact && styles.logoBoxCompact]}>
                  <Text style={[styles.logoText, { color: colors.neonGreen }]}>N</Text>
                </View>
                <View style={styles.logoTextContainer}>
                  <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
                    NERV ERP
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {t('Secure Access Protocol')}
                  </Text>
                </View>
              </View>
            </BlurView>
          </Surface>

          {/* Login Form Card */}
          <Surface
            style={[
              styles.glassCard,
              { borderColor: glassBorder, backgroundColor: glassBg },
              isCompact && styles.glassCardCompact,
            ]}
            elevation={0}
          >
            <BlurView
              intensity={12}
              tint="light"
              style={[styles.blurContainer, isCompact && styles.blurContainerCompact]}
            >
              <View style={styles.formContainer}>
                <Text style={[styles.formTitle, { color: colors.textPrimary }, isCompact && styles.formTitleCompact]}>
                  {t('Login')}
                </Text>
                <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                  {t('Authenticate to synchronize live data with System.')}
                </Text>

                {error && (
                  <View
                    testID="login-error"
                    style={[styles.errorBanner, { backgroundColor: `${colors.accentOrange}1a`, borderColor: colors.accentOrange }]}
                  >
                    <Text style={[styles.errorText, { color: colors.accentOrange }]}>{error}</Text>
                  </View>
                )}

                {/* Username Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Username')}</Text>
                  <PaperTextInput
                    testID="login-username"
                    mode="outlined"
                    placeholder={t('Commander')}
                    placeholderTextColor={colors.textMuted}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    outlineColor={colors.cardBorder}
                    activeOutlineColor={colors.primaryPurple}
                    textColor={colors.textPrimary}
                    style={[
                      styles.paperInput,
                      { backgroundColor: inputBg },
                      isCompact && styles.paperInputCompact,
                    ]}
                    left={
                      <PaperTextInput.Icon
                        icon={() => <Feather name="user" size={18} color={colors.primaryPurple} />}
                      />
                    }
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Password')}</Text>
                  <PaperTextInput
                    testID="login-password"
                    mode="outlined"
                    placeholder="********"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    outlineColor={colors.cardBorder}
                    activeOutlineColor={colors.primaryPurple}
                    textColor={colors.textPrimary}
                    style={[
                      styles.paperInput,
                      { backgroundColor: inputBg },
                      isCompact && styles.paperInputCompact,
                    ]}
                    left={
                      <PaperTextInput.Icon
                        icon={() => <Feather name="lock" size={18} color={colors.primaryPurple} />}
                      />
                    }
                    right={
                      <PaperTextInput.Icon
                        onPress={() => setShowPassword((prev) => !prev)}
                        icon={() => (
                          <Feather
                            name={showPassword ? 'eye' : 'eye-off'}
                            size={18}
                            color={colors.textMuted}
                          />
                        )}
                      />
                    }
                  />
                </View>

                {/* Login Button */}
                <Button
                  mode="contained"
                  onPress={handleLogin}
                  disabled={isLoginDisabled}
                  loading={submitting && submittingMode === 'password'}
                  testID="login-submit"
                  buttonColor={colors.primaryPurple}
                  textColor={colors.appBg}
                  style={[styles.loginButton, isCompact && styles.loginButtonCompact]}
                  contentStyle={[styles.loginButtonContent, isCompact && styles.loginButtonContentCompact]}
                  icon={({ size }) => <Feather name="log-in" size={size} color={colors.appBg} />}
                >
                  {submitting && submittingMode === 'password' ? t('Authorizing...') : t('Enter')}
                </Button>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <Divider style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
                  <Text style={[styles.dividerText, { color: colors.textMuted }]}>{t('OR')}</Text>
                  <Divider style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
                </View>

                {/* Google Link Button */}
                <Surface
                  style={[
                    styles.googleButton,
                    { borderColor: colors.neonGreen, backgroundColor: googleBg },
                    submitting && styles.buttonDisabled,
                  ]}
                  elevation={0}
                >
                  <TouchableRipple
                    onPress={startGoogleLogin}
                    disabled={submitting}
                    testID="login-google"
                    style={styles.googleRipple}
                  >
                    <View style={[styles.googleContent, isCompact && styles.googleContentCompact]}>
                      <View style={[styles.googleIconBox, { backgroundColor: `${colors.neonGreen}20` }]}>
                        <Feather name="globe" size={20} color={colors.neonGreen} />
                      </View>
                      <View style={styles.googleTextContainer}>
                        <Text style={[styles.googleTitle, { color: colors.neonGreen }]}>
                          {submitting && submittingMode === 'google' ? t('Linking...') : t('Initiate Google Link')}
                        </Text>
                        <Text style={[styles.googleSubtitle, { color: colors.textMuted }]}>
                          {t('ROUTE THROUGH NERV SSO')}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={20} color={colors.neonGreen} />
                    </View>
                  </TouchableRipple>
                </Surface>
              </View>
            </BlurView>
          </Surface>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={[styles.statusIndicator, { backgroundColor: colors.neonGreen }]} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>{t('System Status: Online')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.8,
  },
  glowTop: {
    top: -120,
    right: -140,
  },
  glowBottom: {
    bottom: -140,
    left: -120,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContentCompact: {
    padding: 16,
  },
  glassCard: {
    width: '100%',
    maxWidth: 480,
    marginBottom: 20,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#2b2016',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  glassCardCompact: {
    marginBottom: 16,
    borderRadius: 18,
  },
  blurContainer: {
    padding: 26,
  },
  blurContainerCompact: {
    padding: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoContainerCompact: {
    gap: 12,
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBoxCompact: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  logoText: {
    fontSize: 32,
  },
  logoTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  titleCompact: {
    fontSize: 20,
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 12,
    letterSpacing: 0.6,
  },
  formContainer: {
    gap: 20,
  },
  formTitle: {
    fontSize: 32,
    marginBottom: -8,
  },
  formTitleCompact: {
    fontSize: 26,
  },
  formSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    fontSize: 12,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  paperInput: {
    borderRadius: 12,
    fontSize: 15,
  },
  paperInputCompact: {
    minHeight: 50,
  },
  loginButton: {
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#2b2016',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  loginButtonCompact: {
    borderRadius: 14,
  },
  loginButtonContent: {
    paddingVertical: 16,
  },
  loginButtonContentCompact: {
    paddingVertical: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  googleButton: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  googleRipple: {
    padding: 16,
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleContentCompact: {
    flexWrap: 'wrap',
  },
  googleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleTextContainer: {
    flex: 1,
  },
  googleTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  googleSubtitle: {
    fontSize: 10,
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerText: {
    fontSize: 11,
  },
});
