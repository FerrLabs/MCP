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
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const raw = await res.text();
  let data: unknown = undefined;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`API non-JSON response (HTTP ${res.status}): ${raw.slice(0, 200)}`);
    }
  }

  if (!res.ok) {
    const errMsg =
      (data as { error?: string; message?: string } | undefined)?.error ??
      (data as { error?: string; message?: string } | undefined)?.message ??
      `API error: HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  return data as T;
}
