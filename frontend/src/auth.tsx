/**
 * Auth context — tracks current user, token; exposes signIn / signOut / refresh / Google flow.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { api, loadToken, setToken as persistToken, clearAllAuthState, onUnauthorized, cancelAllRequests } from "@/src/api";

export type User = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  state?: string | null;
  city?: string | null;
  area?: string | null;
  age_group?: string | null;
  photo_url?: string | null;
  role: "member" | "admin";
  auth_provider: "password" | "google";
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
  signInWithGoogle: () => Promise<{ ok: boolean; isNew?: boolean; error?: string }>;
  consumeWebSessionId: () => Promise<{ consumed: boolean; isNew?: boolean }>;
};

const AuthCtx = createContext<AuthState | null>(null);

const EMERGENT_AUTH_URL = "https://auth.emergentagent.com";

async function exchangeSessionForJwt(session_id: string): Promise<{ token: string; user: User; is_new_user?: boolean }> {
  return await api.post("/auth/google/session", { session_id });
}

function parseSessionIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Hash fragment: "#session_id=..."
    if (parsed.hash) {
      const h = parsed.hash.replace(/^#/, "");
      const params = new URLSearchParams(h);
      const sid = params.get("session_id");
      if (sid) return sid;
    }
    // Query param fallback
    const q = new URLSearchParams(parsed.search);
    const sid = q.get("session_id");
    if (sid) return sid;
  } catch {
    // Manual parse fallback for exp:// URLs
    const m = url.match(/[#?&]session_id=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await api.get("/auth/me");
      setUser(u);
    } catch (e: any) {
      // 401 or anything else → treat session as dead, force clean.
      console.log("[auth] refresh failed → clearing session", e?.message);
      setUser(null);
      await clearAllAuthState();
    }
  }, []);

  useEffect(() => {
    // Register 401 listener so any future API call that hits 401 will auto-logout.
    onUnauthorized(() => {
      console.log("[auth] 401 detected → auto logout");
      setUser(null);
      // best-effort cleanup; don't await to avoid blocking the calling render
      void clearAllAuthState();
    });
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
    console.log("[auth] signOut → cancel + clear all auth state");
    cancelAllRequests();          // 1. abort any in-flight fetches
    await clearAllAuthState();    // 2. wipe token + legacy keys
    setUser(null);                // 3. flip UI to logged-out
  }, []);

  const updateUser = useCallback((u: User) => setUser(u), []);

  const signInWithGoogle = useCallback(async (): Promise<{ ok: boolean; isNew?: boolean; error?: string }> => {
    try {
      if (Platform.OS === "web") {
        // Web: full redirect. Will return to origin with #session_id=...
        const redirectUrl = window.location.origin + "/";
        window.location.href = `${EMERGENT_AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}`;
        return { ok: true }; // Page is about to redirect
      }
      const redirectUrl = Linking.createURL("auth");
      const authUrl = `${EMERGENT_AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type !== "success" || !result.url) {
        return { ok: false, error: result.type === "cancel" ? "रद्द किया गया" : "Google साइन-इन विफल" };
      }
      const sid = parseSessionIdFromUrl(result.url);
      if (!sid) return { ok: false, error: "Google session नहीं मिला" };
      const res = await exchangeSessionForJwt(sid);
      await signIn(res.token, res.user);
      return { ok: true, isNew: !!res.is_new_user };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Google साइन-इन विफल" };
    }
  }, [signIn]);

  // Web-only: if URL has #session_id=... (from Emergent redirect), consume it.
  const consumeWebSessionId = useCallback(async (): Promise<{ consumed: boolean; isNew?: boolean }> => {
    if (Platform.OS !== "web" || typeof window === "undefined") return { consumed: false };
    const url = window.location.href;
    const sid = parseSessionIdFromUrl(url);
    if (!sid) return { consumed: false };
    try {
      const res = await exchangeSessionForJwt(sid);
      await signIn(res.token, res.user);
      // Clean URL
      try {
        window.history.replaceState(null, "", window.location.pathname);
      } catch {
        // ignore
      }
      return { consumed: true, isNew: !!res.is_new_user };
    } catch {
      return { consumed: false };
    }
  }, [signIn]);

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signOut, refresh, updateUser, signInWithGoogle, consumeWebSessionId }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
