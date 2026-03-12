import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { AntDesign, Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Button, Divider, Surface, TextInput as PaperTextInput, TouchableRipple } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useLoginController } from '../hooks/auth/useLoginController';
import { useI18n } from '../contexts/I18nContext';

WebBrowser.maybeCompleteAuthSession();
const WEB_PARTICLE_COUNT = 9600;

type ParticleSeed = {
  id: number;
  baseX: number;
  baseY: number;
  depth: number;
  radius: number;
  speed: number;
  phase: number;
  size: number;
};

type ParticleFrameRef = {
  x: number;
  y: number;
};

const createParticleSeeds = (): ParticleSeed[] =>
  Array.from({ length: WEB_PARTICLE_COUNT }, (_, index) => ({
    id: index,
    baseX: 0.01 + Math.random() * 0.98,
    baseY: 0.01 + Math.random() * 0.98,
    depth: 0.04 + Math.random() * 0.15,
    radius: 7 + Math.random() * 32,
    speed: 1 + Math.random() * 2.7,
    phase: Math.random() * Math.PI * 2,
    size: 0.8 + Math.random() * 2.2,
  }));

const hexToRgb = (hex: string) => {
  const sanitized = hex.replace('#', '').trim();
  const fullHex =
    sanitized.length === 3
      ? sanitized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : sanitized.slice(0, 6);
  const intValue = Number.parseInt(fullHex, 16);
  if (Number.isNaN(intValue)) {
    return { r: 124, g: 77, b: 255 };
  }
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
};

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
  const isWeb = Platform.OS === 'web';
  const particleSeedsRef = useRef<ParticleSeed[]>(createParticleSeeds());
  const particleFramesRef = useRef<ParticleFrameRef[]>(
    particleSeedsRef.current.map((seed) => ({
      x: seed.baseX * 1280,
      y: seed.baseY * 720,
    })),
  );
  const particleCanvasRef = useRef<any>(null);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    const canvas = particleCanvasRef.current as any;
    if (!canvas || typeof canvas.getContext !== 'function') {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    const layerElement = canvas.parentElement as any;
    if (layerElement) {
      layerElement.style.position = 'fixed';
      layerElement.style.top = '0';
      layerElement.style.left = '0';
      layerElement.style.right = '0';
      layerElement.style.bottom = '0';
      layerElement.style.width = '100vw';
      layerElement.style.height = '100vh';
      layerElement.style.pointerEvents = 'none';
      layerElement.style.overflow = 'hidden';
      layerElement.style.zIndex = '0';
    }
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.right = '0';
    canvas.style.bottom = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const pointer = {
      x: viewport.width * 0.5,
      y: viewport.height * 0.5,
      targetX: viewport.width * 0.5,
      targetY: viewport.height * 0.5,
    };
    const seeds = particleSeedsRef.current;
    const frames = particleFramesRef.current;
    const neonPurpleRgb = hexToRgb('#b84dff');
    const influenceRadius = 320;
    const influenceRadiusSq = influenceRadius * influenceRadius;
    const particleFill = `rgba(${neonPurpleRgb.r}, ${neonPurpleRgb.g}, ${neonPurpleRgb.b}, 0.3)`;
    let rafId = 0;
    let lastFrameTime = 0;

    if (frames.length !== seeds.length) {
      particleFramesRef.current = seeds.map((seed) => ({
        x: seed.baseX * viewport.width,
        y: seed.baseY * viewport.height,
      }));
    }

    const resizeCanvas = () => {
      viewport.width = window.innerWidth;
      viewport.height = window.innerHeight;
      const pixelRatio = 1;
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handlePointerMove = (event: any) => {
      pointer.targetX = event.clientX;
      pointer.targetY = event.clientY;
    };

    const animate = (time: number) => {
      const delta = lastFrameTime === 0 ? 16 : Math.min(34, time - lastFrameTime);
      lastFrameTime = time;
      const deltaFactor = delta / 16;
      pointer.x += (pointer.targetX - pointer.x) * 0.1 * deltaFactor;
      pointer.y += (pointer.targetY - pointer.y) * 0.1 * deltaFactor;
      context.clearRect(0, 0, viewport.width, viewport.height);

      for (let index = 0; index < seeds.length; index += 1) {
        const seed = seeds[index];
        const frame = particleFramesRef.current[index];
        const sway = time * 0.00035 * seed.speed + seed.phase;
        const orbitX = Math.cos(sway) * seed.radius;
        const orbitY = Math.sin(sway * 1.2) * seed.radius * 0.75;
        const anchorX = seed.baseX * viewport.width + orbitX;
        const anchorY = seed.baseY * viewport.height + orbitY;
        const dx = anchorX - pointer.x;
        const dy = anchorY - pointer.y;
        const distanceSq = dx * dx + dy * dy;
        let targetX = anchorX;
        let targetY = anchorY;

        if (distanceSq < influenceRadiusSq) {
          const distance = Math.sqrt(distanceSq) || 1;
          const influence = Math.max(0, 1 - distance / influenceRadius);
          const easedInfluence = influence * influence;
          const pushStrength = easedInfluence * (24 + seed.depth * 160);
          targetX += (dx / distance) * pushStrength;
          targetY += (dy / distance) * pushStrength;
        }

        const frameLerp = 0.16 * deltaFactor;
        frame.x += (targetX - frame.x) * frameLerp;
        frame.y += (targetY - frame.y) * frameLerp;
      }

      context.fillStyle = particleFill;
      context.beginPath();
      for (let index = 0; index < seeds.length; index += 1) {
        const seed = seeds[index];
        const frame = particleFramesRef.current[index];
        context.moveTo(frame.x + seed.size, frame.y);
        context.arc(frame.x, frame.y, seed.size, 0, Math.PI * 2);
      }
      context.fill();

      rafId = window.requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('resize', resizeCanvas);
    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isWeb]);

  return (
    <View style={[styles.background, { backgroundColor: colors.appBg }]}>
      {isWeb && (
        <View pointerEvents="none" style={styles.particlesLayer}>
          {React.createElement('canvas', {
            ref: particleCanvasRef,
            style: styles.particlesCanvas as any,
          })}
        </View>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, isCompact && styles.scrollContentCompact]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Unified Login Card */}
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
              <View style={styles.cardSections}>
                <View style={[styles.logoContainer, isCompact && styles.logoContainerCompact]}>
                  <View style={[styles.logoBox, { backgroundColor: colors.primaryPurple }, isCompact && styles.logoBoxCompact]}>
                    <Image
                      source={require('../assets/images/logo-mark.png')}
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.logoTextContainer}>
                    <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
                      NERV ERP
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                      {t('Secure Access Protocol')}
                    </Text>
                    <View
                      style={[
                        styles.heroTag,
                        {
                          backgroundColor: `${colors.primaryPurple}22`,
                          borderColor: `${colors.primaryPurple}55`,
                        },
                      ]}
                    >
                      <View style={[styles.heroTagDot, { backgroundColor: colors.neonGreen }]} />
                      <Text style={[styles.heroTagText, { color: colors.textSecondary }]}>
                        {t('Neural Link Ready')}
                      </Text>
                    </View>
                  </View>
                </View>

                <Divider style={[styles.cardDivider, { backgroundColor: colors.cardBorder }]} />

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
                      <View
                        style={[
                          styles.googleIconBox,
                          {
                            backgroundColor: colors.cardBgFrom,
                            borderColor: `${colors.cardBorder}aa`,
                          },
                        ]}
                      >
                        <AntDesign name="google" size={18} color="#4285F4" />
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
  container: {
    flex: 1,
    zIndex: 1,
  },
  particlesLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  particlesCanvas: {
    width: '100%',
    height: '100%',
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
    marginBottom: 18,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.2,
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
    borderRadius: 20,
  },
  blurContainer: {
    padding: 24,
  },
  blurContainerCompact: {
    padding: 18,
  },
  cardSections: {
    gap: 18,
  },
  cardDivider: {
    height: 1,
    opacity: 0.45,
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
  logoImage: {
    width: '72%',
    height: '92%',
  },
  logoTextContainer: {
    flex: 1,
  },
  heroTag: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 999,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroTagDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  heroTagText: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
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
    gap: 18,
  },
  formTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: -8,
  },
  formTitleCompact: {
    fontSize: 28,
  },
  formSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    borderRadius: 14,
    fontSize: 15,
  },
  paperInputCompact: {
    minHeight: 50,
  },
  loginButton: {
    borderRadius: 18,
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
    borderRadius: 18,
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
    borderRadius: 12,
    borderWidth: 1,
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
