export interface ApiClientConfig {
  baseUrl: string;
  authPath: string;
  googleAuthPath?: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
}

export const API_CONFIG: ApiClientConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api/v1',
  authPath: process.env.EXPO_PUBLIC_AUTH_PATH ?? '/User/LogInto',
  googleAuthPath: process.env.EXPO_PUBLIC_GOOGLE_AUTH_PATH ?? '/LoginWithGoogle',
  timeoutMs: 15000,
  defaultHeaders: {
    Accept: 'application/json',
  },
};
