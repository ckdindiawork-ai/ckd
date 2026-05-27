/**
 * Auth context - tracks current user, token, and exposes login/logout/refresh.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, loadToken, setToken as persistToken } from "@/src/api";

export type User = {
  id: string;
  mobile: string;
  name?: string | null;
  email?: string | null;
  city?: string | null;
  area?: string | null;
  age_group?: string | null;
  photo_url?: string | null;
  role: "member" | "admin";
  kranti_points: number;
  is_banned: boolean;
  created_at: string;
  profile_complete: boolean;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (u: User) => void;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await api.get("/auth/me");
      setUser(u);
    } catch {
      setUser(null);
      await persistToken(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const t = await loadToken();
      if (t) await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const signIn = useCallback(async (token: string, u: User) => {
    await persistToken(token);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await persistToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((u: User) => setUser(u), []);

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signOut, refresh, updateUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
