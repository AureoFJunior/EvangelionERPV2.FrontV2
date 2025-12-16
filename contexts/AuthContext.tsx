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
import { ApiClient } from '../services/apiClient';
import { AuthCredentials, AuthService, AuthTokens } from '../services/authService';

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: AuthCredentials) => Promise<AuthTokens>;
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
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
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
            setToken(session.token);
            client.setToken(session.token);
            scheduleLogout(session.expiresAt);
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

  const login = useCallback(
    async (credentials: AuthCredentials) => {
      const response = await authService.login(credentials);

      const token =
        typeof response.data === 'string'
          ? (response.data as unknown as string)
          : response.data?.token;

      if (!response.ok || !token) {
        throw new Error(response.error ?? 'Unable to authenticate');
      }

      const expiresInMs =
        (typeof response.data === 'object' && response.data?.expiresIn
          ? response.data.expiresIn * 1000
          : DEFAULT_TOKEN_TTL_MS);

      const expiresAt = Date.now() + expiresInMs;
      const session: StoredSession = { token, expiresAt };

      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(session));
      setToken(token);
      client.setToken(token);
      scheduleLogout(expiresAt);

      return { token, expiresIn: expiresInMs / 1000 };
    },
    [scheduleLogout],
  );

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      loading,
      login,
      logout,
      client,
    }),
    [token, loading, login, logout],
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
