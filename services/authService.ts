import { API_CONFIG } from '../constants/api';
import { ApiClient, ApiResponse } from './apiClient';

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}

export class AuthService {
  private readonly authPath: string;

  constructor(private readonly client: ApiClient, authPath = API_CONFIG.authPath) {
    this.authPath = authPath;
  }

  login(credentials: AuthCredentials): Promise<ApiResponse<AuthTokens>> {
    const path = `${this.authPath}/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}`;
    // Endpoint uses path params; defaults to GET
    return this.client.request<AuthTokens>({
      path,
      method: 'GET',
      withAuth: false,
    });
  }
}
