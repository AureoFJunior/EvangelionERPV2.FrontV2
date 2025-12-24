import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/api';
import { ApiClient, ApiResponse } from '../services/apiClient';
import { AuthCredentials, AuthService, AuthTokens } from '../services/authService';

interface AuthContextValue {
  token: string | null;
  enterpriseId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: AuthCredentials) => Promise<AuthTokens>;
  loginWithGoogle: (idToken: string) => Promise<AuthTokens>;
  logout: () => Promise<void>;
  client: ApiClient;
}

const TOKEN_STORAGE_KEY = 'authToken';
const DEFAULT_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const client = new ApiClient(API_CONFIG);
const authService = new AuthService(client);

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface StoredSession {
  token: string;
  expiresAt: number;
  enterpriseId?: string | null;
}

const decodeBase64 = (input: string) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let buffer = 0;
  let bits = 0;
  let output = '';

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '=') {
      break;
    }
    const index = chars.indexOf(char);
    if (index === -1) {
      return null;
    }
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
};

const decodeUtf8 = (binary: string) => {
  if (typeof TextDecoder !== 'undefined') {
    const bytes = Uint8Array.from(binary.split('').map((char) => char.charCodeAt(0)));
    return new TextDecoder('utf-8').decode(bytes);
  }

  return decodeURIComponent(
    binary
      .split('')
      .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
      .join(''),
  );
};

const parseJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

  try {
    if (typeof (globalThis as any).atob === 'function') {
      const binary = (globalThis as any).atob(padded);
      return JSON.parse(decodeUtf8(binary)) as Record<string, unknown>;
    }

    if (typeof Buffer !== 'undefined') {
      const json = Buffer.from(padded, 'base64').toString('utf8');
      return JSON.parse(json) as Record<string, unknown>;
    }

    const fallback = decodeBase64(padded);
    if (fallback) {
      return JSON.parse(decodeUtf8(fallback)) as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
};

const resolveEnterpriseId = (data: unknown, token?: string | null) => {
  if (data && typeof data === 'object') {
    const record = data as Record<string, any>;
    return (
      record.enterpriseId ??
      record.enterprise_id ??
      record.groupsid ??
      record.groupSid ??
      record.enterprise?.id ??
      record.enterprise?.enterpriseId ??
      record.user?.enterpriseId ??
      record.user?.enterprise?.id ??
      null
    );
  }

  if (token) {
    const payload = parseJwtPayload(token);
    if (payload) {
      const record = payload as Record<string, any>;
      return (
        record.enterpriseId ??
        record.enterprise_id ??
        record.groupsid ??
        record.groupSid ??
        record.enterprise?.id ??
        record.enterprise ??
        record.tenantId ??
        record.tenant_id ??
        null
      );
    }
  }

  return null;
};

const resolveTokenValue = (data: unknown) => {
  if (!data) {
    return null;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'object') {
    const record = data as Record<string, any>;
    return (
      record.token ??
      record.Token ??
      record.access_token ??
      record.accessToken ??
      record.id_token ??
      record.idToken ??
      null
    );
  }

  return null;
};

const resolveExpiresInMs = (data: unknown) => {
  if (data && typeof data === 'object') {
    const record = data as Record<string, any>;
    if (typeof record.expiresIn === 'number') {
      return record.expiresIn * 1000;
    }
    if (typeof record.expires_in === 'number') {
      return record.expires_in * 1000;
    }
    if (typeof record.expiresAt === 'number') {
      return Math.max(record.expiresAt - Date.now(), 0);
    }
  }

  return DEFAULT_TOKEN_TTL_MS;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLogoutTimer = () => {
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }
  };

  const logout = useCallback(async () => {
    clearLogoutTimer();
    setToken(null);
    setEnterpriseId(null);
    client.setToken(null);
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  const scheduleLogout = useCallback(
    (expiresAt: number) => {
      clearLogoutTimer();
      const delay = expiresAt - Date.now();
      if (delay <= 0) {
        logout();
        return;
      }
      logoutTimer.current = setTimeout(logout, delay);
    },
    [logout],
  );

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (stored) {
          let session: StoredSession | null = null;

          try {
            session = JSON.parse(stored) as StoredSession;
          } catch {
            session = { token: stored, expiresAt: Date.now() + DEFAULT_TOKEN_TTL_MS };
          }

          if (session?.token && session.expiresAt > Date.now()) {
            const resolvedEnterpriseId =
              session.enterpriseId ?? resolveEnterpriseId(null, session.token);
            setToken(session.token);
            setEnterpriseId(resolvedEnterpriseId ?? null);
            client.setToken(session.token);
            scheduleLogout(session.expiresAt);

            if (resolvedEnterpriseId && resolvedEnterpriseId !== session.enterpriseId) {
              const refreshed: StoredSession = {
                ...session,
                enterpriseId: resolvedEnterpriseId,
              };
              await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(refreshed));
            }
          } else {
            await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [scheduleLogout]);

  useEffect(() => () => clearLogoutTimer(), []);

  const persistSession = useCallback(
    async (response: ApiResponse<AuthTokens>) => {
      const nextToken = resolveTokenValue(response.data);

      if (!response.ok || !nextToken) {
        throw new Error(response.error ?? 'Unable to authenticate');
      }

      const resolvedEnterpriseId = resolveEnterpriseId(response.data, nextToken);
      const expiresInMs = resolveExpiresInMs(response.data);
      const expiresAt = Date.now() + expiresInMs;
      const session: StoredSession = { token: nextToken, expiresAt, enterpriseId: resolvedEnterpriseId };

      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(session));
      setToken(nextToken);
      setEnterpriseId(resolvedEnterpriseId);
      client.setToken(nextToken);
      scheduleLogout(expiresAt);

      return {
        token: nextToken,
        expiresIn: expiresInMs / 1000,
        enterpriseId: resolvedEnterpriseId ?? undefined,
      };
    },
    [scheduleLogout],
  );

  const login = useCallback(
    async (credentials: AuthCredentials) => {
      const response = await authService.login(credentials);
      return persistSession(response);
    },
    [persistSession],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      if (!idToken) {
        throw new Error('Missing Google token');
      }
      const response = await authService.loginWithGoogle(idToken);
      return persistSession(response);
    },
    [persistSession],
  );

  const value = useMemo(
    () => ({
      token,
      enterpriseId,
      isAuthenticated: Boolean(token),
      loading,
      login,
      loginWithGoogle,
      logout,
      client,
    }),
    [token, enterpriseId, loading, login, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
