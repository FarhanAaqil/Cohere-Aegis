import { UserRole } from "@/lib/roles";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

// In production, route through local PHP proxy to bypass Edge Function CORS
const IS_PROD = import.meta.env.PROD;
const FUNCTIONS_URL = IS_PROD
  ? `/supabase-proxy.php?path=auth`
  : `${SUPABASE_URL}/functions/v1/auth`;

// Storage key for auth session
const SB_AUTH_KEY = `sb-${SUPABASE_PROJECT_ID}-auth-token`;

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  team_id: string | null;
  monitor_token?: string | null;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

function getToken(): string | null {
  // Try standard key first, fall back to legacy
  const sbData = localStorage.getItem(SB_AUTH_KEY);
  if (sbData) {
    try {
      const parsed = JSON.parse(sbData);
      return parsed.access_token || null;
    } catch { /* ignore */ }
  }
  return localStorage.getItem("auth_token");
}

function setToken(token: string) {
  localStorage.setItem("auth_token", token);
  // Also store in standard sb-*-auth-token format
  const sbSession = {
    access_token: token,
    token_type: "bearer",
    expires_at: Math.floor(Date.now() / 1000) + 86400,
  };
  localStorage.setItem(SB_AUTH_KEY, JSON.stringify(sbSession));
}

function clearToken() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem(SB_AUTH_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredUser(user: AuthUser) {
  localStorage.setItem("auth_user", JSON.stringify(user));
}

function clearStoredUser() {
  localStorage.removeItem("auth_user");
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${FUNCTIONS_URL}/login`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function signup(
  email: string,
  password: string,
  first_name: string,
  last_name: string,
  role?: string
): Promise<AuthResponse> {
  const res = await fetch(`${FUNCTIONS_URL}/signup`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, first_name, last_name, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Signup failed");
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${FUNCTIONS_URL}/me`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    clearToken();
    clearStoredUser();
    return null;
  }
  const data = await res.json();
  setStoredUser(data.user);
  return data.user;
}

export function logout() {
  clearToken();
  clearStoredUser();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getAccessToken(): string | null {
  return getToken();
}
