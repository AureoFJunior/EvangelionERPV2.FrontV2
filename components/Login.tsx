import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';

WebBrowser.maybeCompleteAuthSession();

export function Login() {
  const { colors, theme } = useTheme();
  const { login, loginWithGoogle } = useAuth();
  const { isCompact } = useResponsive();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingMode, setSubmittingMode] = useState<'password' | 'google' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const googleClientIds = useMemo(
    () => ({
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      webClientId:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
      expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    }),
    [],
  );

  const missingWebClientId = Platform.OS === 'web' && !googleClientIds.webClientId;

  const [googleRequest, googleResponse, promptGoogleLogin] = Google.useAuthRequest({
    ...googleClientIds,
    webClientId: googleClientIds.webClientId ?? 'missing-web-client-id',
    responseType: ResponseType.IdToken,
    scopes: ['profile', 'email'],
  });

  const handleLogin = async () => {
    if (!username || !password || submitting) return;
    setSubmitting(true);
    setSubmittingMode('password');
    setError(null);
    try {
      await login({ username, password });
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setSubmitting(false);
      setSubmittingMode(null);
    }
  };

  const handleGoogleCredential = useCallback(
    async (idToken: string) => {
      if (!idToken) {
        setError('Google token missing.');
        setSubmitting(false);
        setSubmittingMode(null);
        return;
      }

      setError(null);
      setSubmitting(true);
      setSubmittingMode('google');
      try {
        await loginWithGoogle(idToken);
      } catch (err: any) {
        setError(err?.message ?? 'Google sign-in failed');
      } finally {
        setSubmitting(false);
        setSubmittingMode(null);
      }
    },
    [loginWithGoogle],
  );

  const startGoogleLogin = async () => {
    if (submitting) return;
    if (!googleRequest || missingWebClientId) {
      setError('Google login is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and platform IDs).');
      return;
    }
    setError(null);
    setSubmitting(true);
    setSubmittingMode('google');
    try {
      await promptGoogleLogin({ useProxy: Platform.OS !== 'web' });
    } catch (err: any) {
      setError(err?.message ?? 'Unable to start Google login');
      setSubmitting(false);
      setSubmittingMode(null);
    }
  };

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === 'success') {
      const idToken =
        googleResponse.authentication?.idToken ?? (googleResponse as any).params?.id_token;
      handleGoogleCredential(idToken);
    } else if (googleResponse.type === 'error') {
      setError('Google authentication failed.');
      setSubmitting(false);
      setSubmittingMode(null);
    } else if (googleResponse.type === 'cancel' || googleResponse.type === 'dismiss') {
      setSubmitting(false);
      setSubmittingMode(null);
    }
  }, [googleResponse, handleGoogleCredential]);

  const isLoginDisabled = submitting || !username || !password;
  const glassBorder = `${colors.primaryPurple}55`;
  const glassBg = `${colors.cardBgFrom}80`;
  const inputBg = `${colors.inputBgFrom}cc`;
  const googleBg = `${colors.neonGreen}12`;
  const overlayColor = theme === 'light' ? 'rgba(20, 22, 35, 0.72)' : 'rgba(8, 10, 18, 0.82)';

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1920&q=80' }}
      style={styles.background}
      blurRadius={Platform.OS === 'ios' ? 10 : 3}
    >
      <View style={[styles.overlay, { backgroundColor: overlayColor }]} />

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
          <View
            style={[
              styles.glassCard,
              { borderColor: glassBorder, backgroundColor: glassBg },
              isCompact && styles.glassCardCompact,
            ]}
          >
            <BlurView
              intensity={20}
              tint={theme === 'light' ? 'light' : 'dark'}
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
                    Secure Access Protocol
                  </Text>
                </View>
              </View>
            </BlurView>
          </View>

          {/* Login Form Card */}
          <View
            style={[
              styles.glassCard,
              { borderColor: glassBorder, backgroundColor: glassBg },
              isCompact && styles.glassCardCompact,
            ]}
          >
            <BlurView
              intensity={20}
              tint={theme === 'light' ? 'light' : 'dark'}
              style={[styles.blurContainer, isCompact && styles.blurContainerCompact]}
            >
              <View style={styles.formContainer}>
                <Text style={[styles.formTitle, { color: colors.textPrimary }, isCompact && styles.formTitleCompact]}>
                  Login
                </Text>
                <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                  Authenticate to synchronize live data with System.
                </Text>

                {error && (
                  <View style={[styles.errorBanner, { backgroundColor: `${colors.accentOrange}1a`, borderColor: colors.accentOrange }]}>
                    <Text style={[styles.errorText, { color: colors.accentOrange }]}>{error}</Text>
                  </View>
                )}

                {/* Username Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Username</Text>
                  <View style={[styles.inputContainer, { borderColor: colors.cardBorder, backgroundColor: inputBg }, isCompact && styles.inputContainerCompact]}>
                    <Feather name="user" size={20} color={colors.primaryPurple} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      placeholder="Commander"
                      placeholderTextColor={colors.textMuted}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
                  <View style={[styles.inputContainer, { borderColor: colors.cardBorder, backgroundColor: inputBg }, isCompact && styles.inputContainerCompact]}>
                    <Feather name="lock" size={20} color={colors.primaryPurple} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      placeholder="********"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={styles.eyeIcon}
                    >
                      <Feather
                        name={showPassword ? 'eye' : 'eye-off'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoginDisabled}
                  style={[styles.loginButtonContainer, isLoginDisabled && styles.buttonDisabled]}
                >
                  <LinearGradient
                    colors={[colors.primaryPurple, colors.secondaryPurple]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.loginButton, isCompact && styles.loginButtonCompact]}
                  >
                    <Feather name="log-in" size={20} color={colors.neonGreen} />
                    <Text style={[styles.loginButtonText, { color: colors.neonGreen }]}>
                      {submitting && submittingMode === 'password' ? 'Authorizing...' : 'Enter'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
                  <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
                </View>

                {/* Google Link Button */}
                <TouchableOpacity
                  style={[
                    styles.googleButton,
                    { borderColor: colors.neonGreen, backgroundColor: googleBg },
                    submitting && styles.buttonDisabled,
                  ]}
                  onPress={startGoogleLogin}
                  disabled={submitting}
                >
                  <View style={[styles.googleContent, isCompact && styles.googleContentCompact]}>
                    <View style={[styles.googleIconBox, { backgroundColor: `${colors.neonGreen}20` }]}>
                      <Feather name="globe" size={20} color={colors.neonGreen} />
                    </View>
                    <View style={styles.googleTextContainer}>
                      <Text style={[styles.googleTitle, { color: colors.neonGreen }]}>
                        {submitting && submittingMode === 'google' ? 'Linking...' : 'Initiate Google Link'}
                      </Text>
                      <Text style={[styles.googleSubtitle, { color: colors.textMuted }]}>
                        ROUTE THROUGH NERV SSO
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={colors.neonGreen} />
                  </View>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={[styles.statusIndicator, { backgroundColor: colors.neonGreen }]} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>System Status: Online</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#7f3ff2',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  glassCardCompact: {
    marginBottom: 16,
    borderRadius: 14,
  },
  blurContainer: {
    padding: 24,
  },
  blurContainerCompact: {
    padding: 18,
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
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBoxCompact: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  logoTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 4,
  },
  titleCompact: {
    fontSize: 20,
    letterSpacing: 2.2,
  },
  subtitle: {
    fontSize: 12,
    letterSpacing: 1,
  },
  formContainer: {
    gap: 20,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: 'bold',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    height: 56,
  },
  inputContainerCompact: {
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  loginButtonContainer: {
    marginTop: 8,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#7f3ff2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  loginButtonCompact: {
    paddingVertical: 14,
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
  },
  googleButton: {
    borderRadius: 12,
    borderWidth: 2,
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
    fontWeight: '600',
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
