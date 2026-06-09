import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  Platform,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { AntDesign, Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Button, Divider, Surface, TouchableRipple } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useLoginController } from '../hooks/auth/useLoginController';
import { usePasswordRecoveryController } from '../hooks/auth/usePasswordRecoveryController';
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

  const recovery = usePasswordRecoveryController();
  const glassBg = 'rgba(11, 14, 38, 0.78)';
  const glassBorder = 'rgba(124, 77, 255, 0.22)';
  const fieldBg = 'rgba(26, 30, 54, 0.9)';
  const fieldBorder = 'rgba(47, 47, 74, 0.9)';
  const iconBoxBg = 'rgba(124, 77, 255, 0.15)';
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
    const neonPurpleRgb = hexToRgb('#9f76ff');
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
                    <Text style={[styles.title, { color: colors.secondaryPurple }, isCompact && styles.titleCompact]}>
                      NERV ERP
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                      {t('Enterprise Resource Platform')}
                    </Text>
                    <View style={styles.heroTag}>
                      <View style={styles.heroTagDot} />
                      <Text style={[styles.heroTagText, { color: colors.textSecondary }]}>
                        {t('System Online')}
                      </Text>
                    </View>
                  </View>
                </View>

              <View style={styles.formContainer}>
                {recovery.step === 'idle' ? (
                  <>
                    <Text style={[styles.formTitle, { color: colors.textPrimary }, isCompact && styles.formTitleCompact]}>
                      {t('Login')}
                    </Text>
                    <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                      {t('Sign in to access your workspace.')}
                    </Text>

                    {error && (
                      <View
                        testID="login-error"
                        style={[styles.errorBanner, { backgroundColor: `${colors.destructive}14`, borderColor: `${colors.destructive}59` }]}
                      >
                        <View style={styles.errorIconBox}>
                          <Feather name="alert-circle" size={16} color={colors.destructive} />
                        </View>
                        <Text style={[styles.errorText, { color: colors.destructive }]}>{t(error)}</Text>
                      </View>
                    )}

                    <View style={styles.fieldsBlock}>
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('Username')}</Text>
                        <View style={[styles.fieldRow, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                          <View style={[styles.fieldIconBox, { backgroundColor: iconBoxBg, borderRightColor: fieldBorder }]}>
                            <Feather name="user" size={16} color={colors.primaryPurple} />
                          </View>
                          <TextInput
                            testID="login-username"
                            value={username}
                            onChangeText={setUsername}
                            placeholder={t('Enter username')}
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="none"
                            style={[styles.fieldInput, { color: colors.textPrimary }]}
                          />
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('Password')}</Text>
                        <View style={[styles.fieldRow, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                          <View style={[styles.fieldIconBox, { backgroundColor: iconBoxBg, borderRightColor: fieldBorder }]}>
                            <Feather name="lock" size={16} color={colors.primaryPurple} />
                          </View>
                          <TextInput
                            testID="login-password"
                            value={password}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            style={[styles.fieldInput, { color: colors.textPrimary }]}
                          />
                          <Pressable
                            onPress={() => setShowPassword((prev) => !prev)}
                            style={[styles.fieldEyeBtn, { borderLeftColor: fieldBorder }]}
                          >
                            <Feather
                              name={showPassword ? 'eye' : 'eye-off'}
                              size={16}
                              color={colors.textMuted}
                            />
                          </Pressable>
                        </View>
                        <Pressable onPress={recovery.openRecovery} style={styles.forgotLink}>
                          <Text style={[styles.forgotText, { color: colors.primaryPurple }]}>
                            {t('Forgot password?')}
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    <Pressable
                      onPress={handleLogin}
                      disabled={isLoginDisabled}
                      testID="login-submit"
                      style={({ pressed }) => [
                        styles.enterButton,
                        isLoginDisabled && styles.buttonDisabled,
                        pressed && { transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      {submitting && submittingMode === 'password' ? (
                        <Text style={styles.enterButtonText}>{t('Authorizing...')}</Text>
                      ) : (
                        <>
                          <Feather name="log-in" size={16} color="#fff" />
                          <Text style={styles.enterButtonText}>{t('Enter')}</Text>
                        </>
                      )}
                    </Pressable>

                    <View style={styles.dividerContainer}>
                      <View style={[styles.dividerLine, { backgroundColor: fieldBorder }]} />
                      <Text style={[styles.dividerText, { color: colors.textMuted }]}>{t('OR')}</Text>
                      <View style={[styles.dividerLine, { backgroundColor: fieldBorder }]} />
                    </View>

                    <Pressable
                      onPress={startGoogleLogin}
                      disabled={submitting}
                      testID="login-google"
                      style={(state: any) => [
                        styles.googleButton,
                        { backgroundColor: fieldBg, borderColor: fieldBorder },
                        submitting && styles.buttonDisabled,
                        state.hovered && { borderColor: 'rgba(52, 245, 166, 0.3)' },
                      ]}
                    >
                      <View style={[styles.googleIconBox, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                        <Text style={styles.googleG}>G</Text>
                      </View>
                      <View style={styles.googleTextContainer}>
                        <Text style={[styles.googleTitle, { color: colors.neonGreen }]}>
                          {submitting && submittingMode === 'google' ? t('Connecting...') : t('Continue with Google')}
                        </Text>
                        <Text style={[styles.googleSubtitle, { color: colors.textMuted }]}>
                          {t('Single sign-on via Google')}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.textMuted} />
                    </Pressable>
                  </>
                ) : recovery.step === 'email' ? (
                  <>
                    <Pressable onPress={recovery.closeRecovery} style={styles.backRow}>
                      <Feather name="arrow-left" size={16} color={colors.primaryPurple} />
                      <Text style={[styles.backText, { color: colors.primaryPurple }]}>{t('Back to login')}</Text>
                    </Pressable>
                    <Text style={[styles.formTitle, { color: colors.textPrimary }, isCompact && styles.formTitleCompact]}>
                      {t('Reset Password')}
                    </Text>
                    <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                      {t('Enter your email to receive a reset code.')}
                    </Text>

                    {recovery.error && (
                      <View style={[styles.errorBanner, { backgroundColor: `${colors.accentOrange}1a`, borderColor: colors.accentOrange }]}>
                        <Text style={[styles.errorText, { color: colors.accentOrange }]}>{recovery.error}</Text>
                      </View>
                    )}

                    <View style={styles.fieldsBlock}>
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('Email')}</Text>
                        <View style={[styles.fieldRow, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                          <View style={[styles.fieldIconBox, { backgroundColor: iconBoxBg, borderRightColor: fieldBorder }]}>
                            <Feather name="mail" size={16} color={colors.primaryPurple} />
                          </View>
                          <TextInput
                            value={recovery.email}
                            onChangeText={recovery.setEmail}
                            placeholder={t('Enter your email')}
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            style={[styles.fieldInput, { color: colors.textPrimary }]}
                          />
                        </View>
                      </View>
                    </View>

                    <Pressable
                      onPress={recovery.submitEmail}
                      disabled={!recovery.canSubmitEmail}
                      style={({ pressed }) => [
                        styles.enterButton,
                        !recovery.canSubmitEmail && styles.buttonDisabled,
                        pressed && { transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      {recovery.submitting ? (
                        <Text style={styles.enterButtonText}>{t('Sending...')}</Text>
                      ) : (
                        <>
                          <Feather name="send" size={16} color="#fff" />
                          <Text style={styles.enterButtonText}>{t('Send Reset Code')}</Text>
                        </>
                      )}
                    </Pressable>
                  </>
                ) : recovery.step === 'code' ? (
                  <>
                    <Pressable onPress={recovery.backToEmail} style={styles.backRow}>
                      <Feather name="arrow-left" size={16} color={colors.primaryPurple} />
                      <Text style={[styles.backText, { color: colors.primaryPurple }]}>{t('Change email')}</Text>
                    </Pressable>
                    <Text style={[styles.formTitle, { color: colors.textPrimary }, isCompact && styles.formTitleCompact]}>
                      {t('Enter Code')}
                    </Text>
                    <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                      {t('Check your email for the 8-digit code.')}
                    </Text>

                    {recovery.error && (
                      <View style={[styles.errorBanner, { backgroundColor: `${colors.accentOrange}1a`, borderColor: colors.accentOrange }]}>
                        <Text style={[styles.errorText, { color: colors.accentOrange }]}>{recovery.error}</Text>
                      </View>
                    )}

                    <View style={styles.fieldsBlock}>
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('Reset Code')}</Text>
                        <View style={[styles.fieldRow, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                          <View style={[styles.fieldIconBox, { backgroundColor: iconBoxBg, borderRightColor: fieldBorder }]}>
                            <Feather name="hash" size={16} color={colors.primaryPurple} />
                          </View>
                          <TextInput
                            value={recovery.code}
                            onChangeText={recovery.setCode}
                            placeholder="00000000"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            maxLength={8}
                            style={[styles.fieldInput, { color: colors.textPrimary }]}
                          />
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('New Password')}</Text>
                        <View style={[styles.fieldRow, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                          <View style={[styles.fieldIconBox, { backgroundColor: iconBoxBg, borderRightColor: fieldBorder }]}>
                            <Feather name="lock" size={16} color={colors.primaryPurple} />
                          </View>
                          <TextInput
                            value={recovery.newPassword}
                            onChangeText={recovery.setNewPassword}
                            placeholder="••••••••"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry={!recovery.showNewPassword}
                            autoCapitalize="none"
                            style={[styles.fieldInput, { color: colors.textPrimary }]}
                          />
                          <Pressable
                            onPress={() => recovery.setShowNewPassword((prev) => !prev)}
                            style={[styles.fieldEyeBtn, { borderLeftColor: fieldBorder }]}
                          >
                            <Feather
                              name={recovery.showNewPassword ? 'eye' : 'eye-off'}
                              size={16}
                              color={colors.textMuted}
                            />
                          </Pressable>
                        </View>
                        {recovery.passwordError && (
                          <Text style={[styles.fieldHint, { color: colors.accentOrange }]}>
                            {t('Min 8 chars, 1 number, 1 uppercase or special character.')}
                          </Text>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('Confirm Password')}</Text>
                        <View style={[styles.fieldRow, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                          <View style={[styles.fieldIconBox, { backgroundColor: iconBoxBg, borderRightColor: fieldBorder }]}>
                            <Feather name="check" size={16} color={colors.primaryPurple} />
                          </View>
                          <TextInput
                            value={recovery.confirmPassword}
                            onChangeText={recovery.setConfirmPassword}
                            placeholder="••••••••"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry={!recovery.showNewPassword}
                            autoCapitalize="none"
                            style={[styles.fieldInput, { color: colors.textPrimary }]}
                          />
                        </View>
                        {recovery.confirmError && (
                          <Text style={[styles.fieldHint, { color: colors.accentOrange }]}>
                            {t('Passwords do not match.')}
                          </Text>
                        )}
                      </View>
                    </View>

                    <Pressable
                      onPress={recovery.submitReset}
                      disabled={!recovery.canSubmitCode}
                      style={({ pressed }) => [
                        styles.enterButton,
                        !recovery.canSubmitCode && styles.buttonDisabled,
                        pressed && { transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      {recovery.submitting ? (
                        <Text style={styles.enterButtonText}>{t('Resetting...')}</Text>
                      ) : (
                        <>
                          <Feather name="shield" size={16} color="#fff" />
                          <Text style={styles.enterButtonText}>{t('Reset Password')}</Text>
                        </>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View style={styles.successContainer}>
                      <View style={[styles.successIconBox, { backgroundColor: `${colors.neonGreen}18` }]}>
                        <Feather name="check-circle" size={32} color={colors.neonGreen} />
                      </View>
                      <Text style={[styles.formTitle, { color: colors.textPrimary, textAlign: 'center' }, isCompact && styles.formTitleCompact]}>
                        {t('Password Updated')}
                      </Text>
                      <Text style={[styles.formSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
                        {t('Your password has been reset. You can now log in with your new password.')}
                      </Text>
                    </View>

                    <Pressable
                      onPress={recovery.closeRecovery}
                      style={({ pressed }) => [
                        styles.enterButton,
                        pressed && { transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      <Feather name="log-in" size={16} color="#fff" />
                      <Text style={styles.enterButtonText}>{t('Back to Login')}</Text>
                    </Pressable>
                  </>
                )}
              </View>
              </View>
            </BlurView>
          </Surface>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={[styles.statusIndicator, { backgroundColor: colors.neonGreen }]} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>{t('All systems operational')}</Text>
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
    maxWidth: 400,
    marginBottom: 18,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.55,
        shadowRadius: 64,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  glassCardCompact: {
    marginBottom: 16,
    borderRadius: 22,
  },
  blurContainer: {
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  blurContainerCompact: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  cardSections: {
    gap: 0,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 40,
  },
  logoContainerCompact: {
    gap: 12,
    marginBottom: 32,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 0 28px rgba(124,77,255,0.4), 0 0 0 1px rgba(124,77,255,0.25)' } as any,
      ios: { shadowColor: '#7c4dff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 14 },
      default: {},
    }),
  },
  logoBoxCompact: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  logoImage: {
    width: '72%',
    height: '92%',
  },
  logoTextContainer: {
    flex: 1,
    paddingTop: 4,
  },
  heroTag: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34f5a6',
    ...Platform.select({
      web: { boxShadow: '0 0 7px #34f5a6' } as any,
      default: {},
    }),
  },
  heroTagText: {
    fontSize: 11,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.8,
    lineHeight: 24,
  },
  titleCompact: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  formContainer: {
    gap: 0,
  },
  formTitle: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 4,
  },
  formTitleCompact: {
    fontSize: 30,
  },
  formSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorIconBox: {
    flexShrink: 0,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  fieldsBlock: {
    gap: 16,
    marginBottom: 24,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fieldIconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    flexShrink: 0,
  },
  fieldInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  fieldEyeBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    flexShrink: 0,
    ...Platform.select({ web: { cursor: 'pointer' } as any, default: {} }),
  },
  enterButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    ...Platform.select({
      web: {
        backgroundColor: '#7c4dff',
        backgroundImage: 'linear-gradient(135deg, #7c4dff 0%, #5c2de8 100%)',
        boxShadow: '0 6px 28px rgba(124,77,255,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
        cursor: 'pointer',
        transition: 'transform 0.15s ease',
      } as any,
      ios: {
        backgroundColor: '#7c4dff',
        shadowColor: '#7c4dff',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
      },
      default: {
        backgroundColor: '#7c4dff',
        elevation: 8,
      },
    }),
  },
  enterButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
  googleButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'border-color 0.2s ease' } as any, default: {} }),
  },
  googleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ff8b5f',
  },
  googleTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  googleTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  googleSubtitle: {
    fontSize: 10,
    lineHeight: 14,
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
  forgotLink: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
    ...Platform.select({ web: { cursor: 'pointer' } as any, default: {} }),
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '500',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    ...Platform.select({ web: { cursor: 'pointer' } as any, default: {} }),
  },
  backText: {
    fontSize: 13,
    fontWeight: '500',
  },
  fieldHint: {
    fontSize: 11,
    marginTop: 2,
  },
  successContainer: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  successIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
