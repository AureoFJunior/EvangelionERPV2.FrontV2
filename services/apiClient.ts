import { ApiClientConfig } from '../constants/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions<TBody = unknown> {
  path: string;
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: TBody;
  headers?: Record<string, string>;
  withAuth?: boolean;
  signal?: AbortSignal;
}

export interface ApiResponse<T> {
  data: T | null;
  status: number;
  ok: boolean;
  error?: string;
  headers: Record<string, string>;
}

export class ApiClient {
  private token: string | null = null;

  constructor(private readonly config: ApiClientConfig) {}

  setToken(token: string | null) {
    this.token = token;
  }

  async request<TResponse, TBody = unknown>(options: ApiRequestOptions<TBody>): Promise<ApiResponse<TResponse>> {
    const controller = options.signal ? undefined : new AbortController();
    const signal = options.signal ?? controller?.signal;
    const timeoutId =
      controller && this.config.timeoutMs
        ? setTimeout(() => controller.abort(), this.config.timeoutMs)
        : undefined;

    try {
      const url = this.buildUrl(options.path, options.query);
      const headers = this.buildHeaders(options);
      const init: RequestInit = {
        method: options.method ?? 'GET',
        headers,
        signal,
      };

      if (options.body !== undefined) {
        init.body =
          typeof options.body === 'string' || options.body instanceof FormData
            ? (options.body as BodyInit)
            : JSON.stringify(options.body);
      }

      const response = await fetch(url, init);
      const parsed = await this.parseResponse<TResponse>(response);

      const fallbackError = response.ok
        ? undefined
        : `Failed to sync (status ${response.status})`;
      const stringError =
        !response.ok && typeof parsed.data === 'string' && parsed.data
          ? `${parsed.data} (status ${response.status})`
          : undefined;

      const apiResponse: ApiResponse<TResponse> = {
        data: parsed.data,
        ok: response.ok,
        status: response.status,
        error: parsed.error ?? stringError ?? fallbackError,
        headers: this.headersToRecord(response.headers),
      };

      return apiResponse;
    } catch (error: any) {
      const isAbort = error?.name === 'AbortError';
      const baseMessage = isAbort ? 'Request timed out' : 'Failed to sync';
      const message = `${baseMessage} (status 0)`;
      return {
        data: null,
        ok: false,
        status: 0,
        error: message,
        headers: {},
      };
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  async requestBinary<TBody = unknown>(options: ApiRequestOptions<TBody>): Promise<ApiResponse<ArrayBuffer>> {
    const controller = options.signal ? undefined : new AbortController();
    const signal = options.signal ?? controller?.signal;
    const timeoutId =
      controller && this.config.timeoutMs
        ? setTimeout(() => controller.abort(), this.config.timeoutMs)
        : undefined;

    try {
      const url = this.buildUrl(options.path, options.query);
      const headers = this.buildHeaders(options);
      const init: RequestInit = {
        method: options.method ?? 'GET',
        headers,
        signal,
      };

      if (options.body !== undefined) {
        init.body =
          typeof options.body === 'string' || options.body instanceof FormData
            ? (options.body as BodyInit)
            : JSON.stringify(options.body);
      }

      const response = await fetch(url, init);
      const responseClone = response.clone();
      const data = response.ok ? await response.arrayBuffer() : null;
      let errorMessage: string | undefined;

      if (!response.ok) {
        try {
          const text = await responseClone.text();
          errorMessage = text ? `${text} (status ${response.status})` : undefined;
        } catch {
          errorMessage = undefined;
        }
      }

      const apiResponse: ApiResponse<ArrayBuffer> = {
        data,
        ok: response.ok,
        status: response.status,
        error: errorMessage ?? (response.ok ? undefined : `Failed to sync (status ${response.status})`),
        headers: this.headersToRecord(response.headers),
      };

      return apiResponse;
    } catch (error: any) {
      const isAbort = error?.name === 'AbortError';
      const baseMessage = isAbort ? 'Request timed out' : 'Failed to sync';
      const message = `${baseMessage} (status 0)`;
      return {
        data: null,
        ok: false,
        status: 0,
        error: message,
        headers: {},
      };
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined | null>) {
    const sanitizedBase = this.config.baseUrl.replace(/\/$/, '');
    const sanitizedPath = path.startsWith('http')
      ? path
      : `${sanitizedBase}/${path.replace(/^\//, '')}`;

    const url = new URL(sanitizedPath);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  private buildHeaders(options: ApiRequestOptions<unknown>): HeadersInit {
    const headers: Record<string, string> = {
      ...(this.config.defaultHeaders ?? {}),
      ...(options.headers ?? {}),
    };

    const shouldAttachAuth = options.withAuth !== false && this.token;
    if (shouldAttachAuth) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const hasContentType = Object.keys(headers)
      .map((h) => h.toLowerCase())
      .includes('content-type');

    if (options.body !== undefined && !hasContentType && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  private async parseResponse<T>(response: Response): Promise<{ data: T | null; error?: string }> {
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      try {
        const data = (await response.json()) as T;
        return { data };
      } catch {
        return { data: null, error: 'Invalid JSON response' };
      }
    }

    try {
      const text = await response.text();
      return { data: (text as unknown as T) ?? null };
    } catch {
      return { data: null, error: 'Unable to read response' };
    }
  }

  private headersToRecord(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}
