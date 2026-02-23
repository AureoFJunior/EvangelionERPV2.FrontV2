import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';

interface UseLoginControllerParams {
  login: (credentials: { username: string; password: string }) => Promise<unknown>;
  loginWithGoogle: (idToken: string) => Promise<unknown>;
  loginWithGoogleCode: (payload: {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }) => Promise<unknown>;
}

export function useLoginController({
  login,
  loginWithGoogle,
  loginWithGoogleCode,
}: UseLoginControllerParams) {
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
  const isWeb = Platform.OS === 'web';

  const [googleRequest, googleResponse, promptGoogleLogin] = Google.useAuthRequest({
    ...googleClientIds,
    webClientId: googleClientIds.webClientId ?? 'missing-web-client-id',
    responseType: isWeb ? ResponseType.Code : ResponseType.IdToken,
    shouldAutoExchangeCode: isWeb ? false : undefined,
    usePKCE: isWeb ? false : undefined,
    scopes: ['openid', 'profile', 'email'],
  });

  const handleLogin = async () => {
    if (!username || !password || submitting) {
      return;
    }
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

  const handleGoogleCode = useCallback(
    async (code: string, redirectUri: string, codeVerifier?: string) => {
      if (!code || !redirectUri) {
        setError('Google authorization code missing.');
        setSubmitting(false);
        setSubmittingMode(null);
        return;
      }

      setError(null);
      setSubmitting(true);
      setSubmittingMode('google');
      try {
        await loginWithGoogleCode({ code, redirectUri, codeVerifier });
      } catch (err: any) {
        setError(err?.message ?? 'Google sign-in failed');
      } finally {
        setSubmitting(false);
        setSubmittingMode(null);
      }
    },
    [loginWithGoogleCode],
  );

  const startGoogleLogin = async () => {
    if (submitting) {
      return;
    }
    if (!googleRequest || missingWebClientId) {
      setError('Google login is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and platform IDs).');
      return;
    }
    setError(null);
    setSubmitting(true);
    setSubmittingMode('google');
    try {
      await promptGoogleLogin({ useProxy: Platform.OS !== 'web' } as any);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to start Google login');
      setSubmitting(false);
      setSubmittingMode(null);
    }
  };

  useEffect(() => {
    if (!googleResponse) {
      return;
    }
    if (googleResponse.type === 'success') {
      const params = (googleResponse as any).params ?? {};
      const idToken = googleResponse.authentication?.idToken ?? params.id_token;
      const code = params.code;
      const redirectUri = googleRequest?.redirectUri;
      const codeVerifier = (googleRequest as any)?.codeVerifier;

      if (code && redirectUri) {
        handleGoogleCode(code, redirectUri, codeVerifier);
        return;
      }

      if (idToken) {
        handleGoogleCredential(idToken);
        return;
      }

      setError('Google token missing.');
      setSubmitting(false);
      setSubmittingMode(null);
    } else if (googleResponse.type === 'error') {
      setError('Google authentication failed.');
      setSubmitting(false);
      setSubmittingMode(null);
    } else if (googleResponse.type === 'cancel' || googleResponse.type === 'dismiss') {
      setSubmitting(false);
      setSubmittingMode(null);
    }
  }, [googleResponse, googleRequest, handleGoogleCode, handleGoogleCredential]);

  const isLoginDisabled = submitting || !username || !password;

  return {
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
  };
}
