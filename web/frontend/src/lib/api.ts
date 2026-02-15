/**
 * Backend API client — wraps fetch with auth token injection.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: unknown
  ) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => res.statusText);
    throw new ApiError(res.status, detail?.detail ?? detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
