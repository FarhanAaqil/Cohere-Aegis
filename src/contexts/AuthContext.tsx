import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AuthUser,
  login as authLogin,
  signup as authSignup,
  logout as authLogout,
  fetchCurrentUser,
  getStoredUser,
  isAuthenticated as checkAuth,
  getAccessToken,
} from "@/lib/auth";
import { deactivateMonitorExtension, saveExtensionSession } from "@/lib/extension-activate";

/** How many ms between background token validity checks */
const TOKEN_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
/** Max silent retries before treating the token as expired */
const MAX_FETCH_RETRIES = 2;

/** Fetches current user with up to `retries` silent retries on network failure. */
async function fetchWithRetry(retries: number): Promise<AuthUser | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const u = await fetchCurrentUser();
      return u; // null means token was rejected by the server (valid response)
    } catch {
      if (attempt === retries) return null;
      // Wait 1 second before retrying
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName: string, lastName: string, role?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      return getStoredUser();
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Starts a periodic background token refresh. */
  const startRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(async () => {
      if (!checkAuth()) return;
      const u = await fetchWithRetry(MAX_FETCH_RETRIES);
      if (!u) {
        // Token truly expired — clear and redirect
        authLogout();
        setUser(null);
        if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
        navigate("/login", { replace: true });
      } else {
        // Silently update stored user profile (role/name changes propagate)
        setUser(u);
        const token = getAccessToken();
        if (token) saveExtensionSession({ token, user: u });
      }
    }, TOKEN_REFRESH_INTERVAL_MS);
  }, [navigate]);

  useEffect(() => {
    if (checkAuth()) {
      fetchWithRetry(MAX_FETCH_RETRIES)
        .then((u) => {
          if (!u) {
            // Token was invalid/expired — clear everything
            authLogout();
            setUser(null);
            navigate("/login", { replace: true });
          } else {
            setUser(u);
            const token = getAccessToken();
            if (token) saveExtensionSession({ token, user: u });
            startRefreshTimer();
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setUser(null);
      setIsLoading(false);
    }

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [navigate, startRefreshTimer]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authLogin(email, password);
    setUser(res.user);
    saveExtensionSession({ token: res.token, user: res.user });
    startRefreshTimer();
  }, [startRefreshTimer]);


  const signup = useCallback(
    async (email: string, password: string, firstName: string, lastName: string, role?: string) => {
      const res = await authSignup(email, password, firstName, lastName, role);
      setUser(res.user);
    },
    []
  );

  const logout = useCallback(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    deactivateMonitorExtension();
    authLogout();
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
