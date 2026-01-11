export interface ApiClientConfig {
  baseUrl: string;
  authPath: string;
  googleAuthPath?: string;
  googleCodeAuthPath?: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
}

export const API_CONFIG: ApiClientConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8082/api/v1',
  authPath: process.env.EXPO_PUBLIC_AUTH_PATH ?? '/User/LogInto',
  googleAuthPath: process.env.EXPO_PUBLIC_GOOGLE_AUTH_PATH ?? '/User/LoginWithGoogle',
  googleCodeAuthPath: process.env.EXPO_PUBLIC_GOOGLE_CODE_AUTH_PATH ?? '/User/LoginWithGoogleCode',
  timeoutMs: 15000,
  defaultHeaders: {
    Accept: 'application/json',
  },
};
