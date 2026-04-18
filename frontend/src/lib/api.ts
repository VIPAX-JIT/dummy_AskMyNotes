export const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const SESSION_TOKEN_KEY = "askmynotes_session_token";
const USER_NAME_KEY = "askmynotes_user_name";
const USER_EMAIL_KEY = "askmynotes_user_email";

export interface StoredUser {
  name: string;
  email: string;
}

export function getStoredSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const name = localStorage.getItem(USER_NAME_KEY);
  const email = localStorage.getItem(USER_EMAIL_KEY);
  if (!name || !email) return null;
  return { name, email };
}

export function setStoredSession(token: string, user: StoredUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.setItem(USER_NAME_KEY, user.name);
  localStorage.setItem(USER_EMAIL_KEY, user.email);
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getStoredSessionToken();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("content-type") && init.body && !isFormData) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error ?? "Request failed");
  }

  return payload as T;
}
