const API_URL = process.env.API_URL ?? 'https://api.ferrlabs.com';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'ferrlabs-mcp/4.0.0',
  };

  if (token) {
    headers['x-api-token'] = token;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? `API error: ${res.status}`);
  }

  return data as T;
}
