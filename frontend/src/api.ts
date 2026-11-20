export const API_URL: string = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export type RequestOptions = {
  method?: string;
  body?: unknown;
};

export type ApiOptions = RequestOptions & {
  token?: string | null;
};

export function apiFetch(path: string, { method = 'GET', body, token }: ApiOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
}

// Lee el mensaje de error que manda el backend ({ error: "..." }) o usa uno por defecto.
export async function leerError(res: Response, porDefecto: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error || porDefecto;
}

export type AuthFetch = (path: string, options?: RequestOptions) => Promise<Response>;
