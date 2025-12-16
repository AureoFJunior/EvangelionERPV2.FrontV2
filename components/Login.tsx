import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { colors } = useTheme();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username || !password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await login({ username, password });
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.appBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={[styles.logoContainer, { borderColor: colors.cardBorder }]}>
          <View style={[styles.logoBox, { backgroundColor: colors.primaryPurple }]}>
            <Text style={[styles.logoText, { color: colors.neonGreen }]}>N</Text>
          </View>
          <View>
            <Text style={[styles.title, { color: colors.neonGreen }]}>NERV ERP</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Secure Access Protocol</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Login</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Authenticate to synchronize live data with HQ.
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.cardBorder, backgroundColor: colors.inputBgFrom }]}>
              <Feather name="user" size={18} color={colors.primaryPurple} />
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Commander"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.textPrimary }]}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.cardBorder, backgroundColor: colors.inputBgFrom }]}>
              <Feather name="lock" size={18} color={colors.primaryPurple} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.textPrimary }]}
                secureTextEntry
              />
            </View>
          </View>

          {error && (
            <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
              <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={submitting || !username || !password}
            style={[
              styles.button,
              { backgroundColor: colors.primaryPurple, opacity: submitting || !username || !password ? 0.6 : 1 },
            ]}
          >
            <Feather name="log-in" size={18} color={colors.neonGreen} />
            <Text style={[styles.buttonText, { color: colors.neonGreen }]}>
              {submitting ? 'Authorizing...' : 'Enter HQ'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Data sync requires active session. Sample data remains available for preview after login.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    gap: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cardSubtitle: {
    fontSize: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  bannerText: {
    fontSize: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: 8,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
