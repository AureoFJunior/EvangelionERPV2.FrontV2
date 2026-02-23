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
import { AuthCredentials, AuthService, AuthTokens, GoogleCodeExchangePayload } from '../services/authService';
import { normalizeCurrencyCode } from '../utils/currency';
import { AppLanguage, languageToEnumValue, normalizeLanguageCode } from '../utils/language';

interface AuthContextValue {
  token: string | null;
  enterpriseId: string | null;
  currency: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  user: AuthUserProfile | null;
  login: (credentials: AuthCredentials) => Promise<AuthTokens>;
  loginWithGoogle: (idToken: string) => Promise<AuthTokens>;
  loginWithGoogleCode: (payload: GoogleCodeExchangePayload) => Promise<AuthTokens>;
  setUserLanguage: (language: AppLanguage | null) => Promise<void>;
  setUserTheme: (theme: UserTheme | null) => Promise<void>;
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
  currency?: string | null;
  user?: AuthUserProfile | null;
  theme?: UserTheme | null;
}

interface AuthUserProfile {
  id?: string | null;
  name: string;
  email?: string | null;
  role?: string | null;
  language?: AppLanguage | null;
  avatarUrl?: string | null;
  theme?: UserTheme | null;
}

type UserTheme = 'light' | 'dark';

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

const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const pickFirstString = (...values: unknown[]) => {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
};

const pickFromRecords = (records: Array<Record<string, any>>, keys: string[]) => {
  for (const record of records) {
    for (const key of keys) {
      if (record && Object.prototype.hasOwnProperty.call(record, key)) {
        const resolved = pickFirstString(record[key]);
        if (resolved) {
          return resolved;
        }
      }
    }
  }
  return null;
};

const accessLevelToRole: Record<number, string> = {
  0: 'Admin',
  1: 'Manager',
  2: 'Supervisor',
  3: 'Employee',
};

const resolveAccessLevelRole = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return accessLevelToRole[value] ?? null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return accessLevelToRole[numeric] ?? null;
    }

    const normalized = trimmed.toLowerCase();
    if (normalized === 'admin' || normalized === 'manager' || normalized === 'supervisor' || normalized === 'employee') {
      return trimmed;
    }
  }

  return null;
};

const pickRoleFromValue = (value: unknown) => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = resolveAccessLevelRole(entry) || pickFirstString(entry);
      if (candidate) {
        return candidate;
      }
    }
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, any>;
    const direct = pickFirstString(
      record.name,
      record.role,
      record.title,
      record['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
      record['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'],
    );
    if (direct) {
      return direct;
    }

    return resolveAccessLevelRole(
      record.accessLevel ??
      record.access_level ??
      record.accesslevel ??
      record.userAccessLevel ??
      record.user_access_level,
    );
  }

  return resolveAccessLevelRole(value) || pickFirstString(value);
};

const pickRole = (records: Array<Record<string, any>>) => {
  for (const record of records) {
    const accessLevel = resolveAccessLevelRole(
      record.accessLevel ??
      record.access_level ??
      record.accesslevel ??
      record.userAccessLevel ??
      record.user_access_level,
    );
    if (accessLevel) {
      return accessLevel;
    }

    const direct = pickFirstString(
      record.role,
      record.roleName,
      record.role_name,
      record.title,
      record.jobTitle,
      record.job_title,
      record.position,
      record['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
      record['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'],
    );
    if (direct) {
      return direct;
    }

    const candidates = [
      record.roles,
      record.roleList,
      record.groups,
      record.group,
      record.permissions,
      record['cognito:groups'],
      record.realm_access?.roles,
    ];
    for (const candidate of candidates) {
      const resolved = pickRoleFromValue(candidate);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
};

const pickLanguage = (records: Array<Record<string, any>>) => {
  for (const record of records) {
    const resolved =
      normalizeLanguageCode(
        record.language ??
        record.Language ??
        record.lang ??
        record.Lang ??
        record.userLanguage ??
        record.user_language ??
        record.locale ??
        record.Locale,
      );
    if (resolved) {
      return resolved;
    }
  }
  return null;
};

const buildProfileRecords = (data: unknown, token?: string | null) => {
  const records: Array<Record<string, any>> = [];

  if (data && typeof data === 'object') {
    const record = data as Record<string, any>;
    records.push(record);
    const nestedKeys = [
      'user',
      'User',
      'loggedUser',
      'LoggedUser',
      'profile',
      'account',
      'employee',
      'owner',
      'member',
      'data',
      'result',
    ];
    nestedKeys.forEach((key) => {
      if (record[key] && typeof record[key] === 'object') {
        records.push(record[key]);
      }
    });
  }

  if (token) {
    const payload = parseJwtPayload(token);
    if (payload && typeof payload === 'object') {
      records.push(payload as Record<string, any>);
    }
  }

  return records;
};

const resolveUserProfile = (
  data: unknown,
  token?: string | null,
  fallback?: Partial<AuthUserProfile> | null,
) => {
  const records = buildProfileRecords(data, token);

  const givenName = pickFromRecords(records, ['given_name', 'givenName', 'first_name', 'firstName']);
  const familyName = pickFromRecords(records, ['family_name', 'familyName', 'last_name', 'lastName', 'surname']);
  const combinedName = [givenName, familyName].filter(Boolean).join(' ').trim();

  const id =
    pickFromRecords(records, ['id', 'userId', 'user_id', 'subject', 'sub', 'nameid', 'name_id']) ||
    pickFirstString(fallback?.id) ||
    null;

  const displayName =
    pickFromRecords(records, ['name', 'displayName', 'fullName', 'full_name']) ||
    combinedName ||
    pickFromRecords(records, ['preferred_username', 'username', 'userName', 'unique_name', 'upn', 'email']) ||
    pickFirstString(fallback?.name, fallback?.email) ||
    'User';

  const email =
    pickFromRecords(records, ['email', 'emailAddress', 'mail', 'upn', 'preferred_username']) ||
    pickFirstString(fallback?.email) ||
    null;

  const avatarUrl =
    pickFromRecords(records, [
      'picture',
      'avatar',
      'avatarUrl',
      'avatar_url',
      'profileImage',
      'profile_image',
      'photo',
      'image',
    ]) ||
    pickFirstString(fallback?.avatarUrl) ||
    null;

  const role = pickRole(records) || pickFirstString(fallback?.role) || null;
  const language = pickLanguage(records) ?? normalizeLanguageCode(fallback?.language) ?? null;

  const rawTheme =
    pickFromRecords(records, ['theme', 'Theme', 'uiTheme', 'ui_theme']) ||
    null;

  const rawActualTheme =
    pickFromRecords(records, ['actualTheme', 'ActualTheme']) ||
    records
      .map((record) => record.actualTheme ?? record.ActualTheme ?? null)
      .find((value) => value !== null && value !== undefined) ||
    null;

  const parsedThemeValue = (() => {
    if (rawTheme) {
      const normalized = rawTheme.toLowerCase();
      if (normalized.includes('light') || normalized.includes('day')) {
        return 'light' as const;
      }
      if (normalized.includes('dark') || normalized.includes('night')) {
        return 'dark' as const;
      }
    }

    const actual =
      (typeof rawActualTheme === 'string' && rawActualTheme.trim() !== ''
        ? Number(rawActualTheme)
        : typeof rawActualTheme === 'number'
          ? rawActualTheme
          : null);
    if (actual === 1) {
      return 'light' as const;
    }
    if (actual === 0) {
      return 'dark' as const;
    }

    if (fallback?.theme) {
      return fallback.theme;
    }

    return null;
  })();

  return {
    id,
    name: displayName,
    email,
    role,
    language,
    avatarUrl,
    theme: parsedThemeValue,
  };
};

const areUsersEqual = (left?: AuthUserProfile | null, right?: AuthUserProfile | null) => {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    left.name === right.name &&
    left.email === right.email &&
    left.role === right.role &&
    left.language === right.language &&
    left.avatarUrl === right.avatarUrl &&
    left.theme === right.theme &&
    left.id === right.id
  );
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

const resolveEnterpriseCurrency = (data: unknown) => {
  if (data && typeof data === 'object') {
    const record = data as Record<string, any>;
    return (
      record.currency ??
      record.Currency ??
      record.enterpriseCurrency ??
      record.enterprise_currency ??
      null
    );
  }
  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterpriseCurrencyRef = useRef<string | null>(null);

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
    setCurrency(null);
    setUser(null);
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
              const resolvedUser = resolveUserProfile(null, session.token, session.user ?? null);
              const resolvedCurrency = normalizeCurrencyCode(session.currency) ?? null;
              setToken(session.token);
              setEnterpriseId(resolvedEnterpriseId ?? null);
              setCurrency(resolvedCurrency);
              setUser(resolvedUser);
              client.setToken(session.token);
              scheduleLogout(session.expiresAt);

              const shouldUpdateSession =
                (resolvedEnterpriseId && resolvedEnterpriseId !== session.enterpriseId) ||
                !areUsersEqual(session.user ?? null, resolvedUser) ||
                (resolvedUser.theme && resolvedUser.theme !== session.theme);

              if (shouldUpdateSession) {
                const refreshed: StoredSession = {
                  ...session,
                  enterpriseId: resolvedEnterpriseId,
                  currency: resolvedCurrency,
                  user: resolvedUser,
                  theme: resolvedUser.theme ?? session.theme ?? null,
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

  const updateStoredCurrency = useCallback(async (nextCurrency: string | null) => {
    const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      return;
    }

    let session: StoredSession | null = null;
    try {
      session = JSON.parse(stored) as StoredSession;
    } catch {
      return;
    }

    if (!session?.token || session.currency === nextCurrency) {
      return;
    }

    const updated: StoredSession = {
      ...session,
      currency: nextCurrency,
    };
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const updateStoredTheme = useCallback(async (nextTheme: UserTheme | null) => {
    const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      return;
    }

    let session: StoredSession | null = null;
    try {
      session = JSON.parse(stored) as StoredSession;
    } catch {
      return;
    }

    if (!session?.token || session.theme === nextTheme) {
      return;
    }

    const updated: StoredSession = {
      ...session,
      theme: nextTheme,
      user: session.user ? { ...session.user, theme: nextTheme } : session.user,
    };
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const updateStoredLanguage = useCallback(async (nextLanguage: AppLanguage | null) => {
    const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      return;
    }

    let session: StoredSession | null = null;
    try {
      session = JSON.parse(stored) as StoredSession;
    } catch {
      return;
    }

    if (!session?.token) {
      return;
    }

    const currentLanguage = normalizeLanguageCode(session.user?.language) ?? null;
    if (currentLanguage === nextLanguage) {
      return;
    }

    const updated: StoredSession = {
      ...session,
      user: session.user ? { ...session.user, language: nextLanguage } : session.user,
    };
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(updated));
  }, []);

  useEffect(() => {
    if (!token || !enterpriseId) {
      enterpriseCurrencyRef.current = null;
      setCurrency(null);
      return;
    }

    if (enterpriseCurrencyRef.current === enterpriseId && currency) {
      return;
    }

    let active = true;

    const loadCurrency = async () => {
      const response = await client.request<Record<string, any>>({
        path: `/Enterprise/GetEnterprise/${enterpriseId}`,
        method: 'GET',
      });

      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        const resolved = normalizeCurrencyCode(resolveEnterpriseCurrency(response.data)) ?? 'BRL';
        enterpriseCurrencyRef.current = enterpriseId;
        setCurrency(resolved);
        await updateStoredCurrency(resolved);
      }
    };

    loadCurrency();

    return () => {
      active = false;
    };
  }, [token, enterpriseId, currency, updateStoredCurrency]);

  const persistSession = useCallback(
    async (response: ApiResponse<AuthTokens>, fallbackUser?: Partial<AuthUserProfile> | null) => {
      const nextToken = resolveTokenValue(response.data);

      if (!response.ok || !nextToken) {
        throw new Error(response.error ?? 'Unable to authenticate');
      }

      const resolvedEnterpriseId = resolveEnterpriseId(response.data, nextToken);
      const expiresInMs = resolveExpiresInMs(response.data);
      const expiresAt = Date.now() + expiresInMs;
      const resolvedUser = resolveUserProfile(response.data, nextToken, fallbackUser ?? null);
      const session: StoredSession = {
        token: nextToken,
        expiresAt,
        enterpriseId: resolvedEnterpriseId,
        currency: null,
        user: resolvedUser,
        theme: resolvedUser.theme ?? null,
      };

      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(session));
      setToken(nextToken);
      setEnterpriseId(resolvedEnterpriseId);
      setCurrency(null);
      setUser(resolvedUser);
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

  const setUserTheme = useCallback(
    async (theme: UserTheme | null) => {
      setUser((prev) => (prev ? { ...prev, theme } : prev));
      await updateStoredTheme(theme);
    },
    [updateStoredTheme],
  );

  const setUserLanguage = useCallback(
    async (language: AppLanguage | null) => {
      const normalizedLanguage = normalizeLanguageCode(language) ?? null;
      const languageValue = languageToEnumValue(normalizedLanguage);

      if (languageValue === null) {
        throw new Error('Invalid language');
      }

      const response = await client.request<Record<string, any>, { language: number }>({
        path: '/User/UpdateLanguage',
        method: 'PUT',
        body: { language: languageValue },
      });

      if (!response.ok) {
        throw new Error(response.error ?? 'Unable to update language');
      }

      const resolvedUser = resolveUserProfile(response.data, token, {
        ...(user ?? { name: 'User' }),
        language: normalizedLanguage,
      });

      setUser(resolvedUser);
      await updateStoredLanguage(normalizeLanguageCode(resolvedUser.language) ?? normalizedLanguage);
    },
    [client, token, user, updateStoredLanguage],
  );

  const login = useCallback(
    async (credentials: AuthCredentials) => {
      const response = await authService.login(credentials);
      return persistSession(response, { name: credentials.username });
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

  const loginWithGoogleCode = useCallback(
    async (payload: GoogleCodeExchangePayload) => {
      if (!payload?.code || !payload?.redirectUri) {
        throw new Error('Missing Google authorization code or redirectUri');
      }
      const response = await authService.loginWithGoogleCode(payload);
      return persistSession(response);
    },
    [persistSession],
  );

  const value = useMemo(
    () => ({
      token,
      enterpriseId,
      currency,
      isAuthenticated: Boolean(token),
      loading,
      user,
      login,
      loginWithGoogle,
      loginWithGoogleCode,
      setUserLanguage,
      setUserTheme,
      logout,
      client,
    }),
    [
      token,
      enterpriseId,
      currency,
      loading,
      user,
      login,
      loginWithGoogle,
      loginWithGoogleCode,
      setUserLanguage,
      setUserTheme,
      logout,
    ],
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
