export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function api<T>(endpoint: string, options: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...init } = options;
  const response = await fetch(`/api${endpoint}`, {
    ...init,
    credentials: 'same-origin',
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    body: json !== undefined ? JSON.stringify(json) : init.body,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error ?? `Erreur ${response.status}`, response.status);
  return body.data as T;
}
