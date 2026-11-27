export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.';

export function apiPath(path: string, query: Record<string, string | number | boolean | undefined> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.size ? path + '?' + params.toString() : path;
}

async function response(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body != null) headers.set('Content-Type', 'application/json');
  headers.set('X-Deal-Client', 'browser');
  let result: Response;
  try {
    result = await fetch('/api' + path, { ...init, headers, credentials: 'same-origin' });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(0, 'UNREACHABLE', 'The Deal Alert server is unreachable. Try again.');
  }
  if (!result.ok) {
    const data: { code?: string; message?: string } = await result.json().catch(() => ({}));
    if (result.status === 401 && (data.code === 'SESSION_REQUIRED' || data.code === 'SESSION_EXPIRED')) {
      window.dispatchEvent(new Event('dealalert:expired'));
    }
    throw new ApiError(
      result.status,
      data.code ?? 'HTTP_ERROR',
      data.message ?? 'The server could not complete the request.',
    );
  }
  return result;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const result = await response(path, init);
  if (result.status === 204) return undefined as T;
  if (!result.headers.get('Content-Type')?.includes('application/json')) {
    throw new ApiError(
      result.status,
      'INVALID_RESPONSE',
      'The API response was invalid. Check your server configuration.',
    );
  }
  return result.json() as Promise<T>;
}

export function send<T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, input?: unknown) {
  return api<T>(path, { method, body: input === undefined ? undefined : JSON.stringify(input) });
}

export async function requestBlob(path: string) {
  return (await response(path)).blob();
}

export async function download(path: string, name: string) {
  const url = URL.createObjectURL(await requestBlob(path));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
