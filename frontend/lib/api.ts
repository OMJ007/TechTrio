/** Base URL for the FastAPI backend. */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Read the JWT from localStorage without importing the Zustand store
 * (avoids circular dependencies in non-React contexts).
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("xpense-auth");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Thin wrapper around `fetch` that injects the JWT ``Authorization``
 * header and parses JSON responses.
 *
 * Throws an `Error` with the server's ``detail`` message on non-2xx.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // Let the caller override Content-Type (e.g. for file uploads).
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // use fallback
    }
    throw new Error(detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

/**
 * Upload a file via ``multipart/form-data`` (used by the OCR endpoint).
 */
export async function apiUpload<T = unknown>(
  path: string,
  file: File,
): Promise<T> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // use fallback
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

export { API_BASE };
