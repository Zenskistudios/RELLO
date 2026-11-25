export interface TokenStorage {
  get(): string | null | Promise<string | null>;
  set(token: string): void | Promise<void>;
  clear(): void | Promise<void>;
}

export type ApiRequestOptions = RequestInit;

export function createApiClient(baseUrl: string, tokenStorage: TokenStorage) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const url = /^https?:\/\//i.test(path) ? path : `${normalizedBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = new Headers(options.headers);
    const token = await tokenStorage.get();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

    const response = await fetch(url, { ...options, headers });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      if (response.status === 401 && token) await tokenStorage.clear();
      throw new Error(body.error ?? "Something went wrong. Please try again.");
    }
    return body as T;
  }

  return { request };
}

export const json = (value: unknown) => JSON.stringify(value);
