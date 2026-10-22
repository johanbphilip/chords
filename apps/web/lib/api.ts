export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'chords.token';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** The error body, for callers that need more than the message (e.g. `existingId` on a duplicate Song). */
    readonly payload: Record<string, unknown> | null = null,
  ) {
    super(message);
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const payload: ({ message?: string | string[] } & Record<string, unknown>) | null = await res
      .json()
      .catch(() => null);
    const message = [payload?.message].flat()[0];
    throw new ApiError(res.status, message ?? `API error ${res.status}`, payload);
  }
  return res.json();
}

export const apiGet = <T>(path: string) => request<T>('GET', path);
export const apiPost = <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {});
export const apiPut = <T>(path: string, body: unknown) => request<T>('PUT', path, body);
export const apiPatch = <T>(path: string, body: unknown) => request<T>('PATCH', path, body);
export const apiDelete = <T>(path: string) => request<T>('DELETE', path);

/** The id of the Song a 409 points at (a Song with the same title and artist already exists), if the error is one. */
export function existingSongId(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const id = error.payload?.existingId;
  return typeof id === 'string' ? id : null;
}
