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
  enterpriseId?: string;
}

export class AuthService {
  private readonly authPath: string;
  private readonly googleAuthPath?: string;

  constructor(
    private readonly client: ApiClient,
    authPath = API_CONFIG.authPath,
    googleAuthPath = API_CONFIG.googleAuthPath,
  ) {
    this.authPath = authPath;
    this.googleAuthPath = googleAuthPath;
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

  loginWithGoogle(idToken: string): Promise<ApiResponse<AuthTokens>> {
    const path = this.googleAuthPath ?? `${this.authPath}/LoginWithGoogle`;

    return this.client.request<AuthTokens>({
      path,
      method: 'POST',
      body: { idToken },
      withAuth: false,
    });
  }
}
