/**
 * Production-grade API client for CKD.
 *
 * Design goals:
 *   1. Single source of BASE URL with hard-coded fallback so a packaged APK
 *      always knows where the backend lives (even if EAS env injection fails).
 *   2. EVERY request gets logged (URL + status + ms) so logcat can debug 404s.
 *   3. AbortController support — on logout we cancel ALL in-flight requests
 *      to prevent stale fetches from crashing the next screen.
 *   4. Network errors are auto-retried ONCE (not 4xx — auth/validation should
 *      not retry).
 *   5. HTML error responses (Emergent ingress 404 pages, captive portals) are
 *      detected and never bubbled to the user as raw HTML — replaced with a
 *      friendly Hindi message.
 *   6. On 401 we treat the session as corrupt and trigger a global signOut
 *      listener so the auth provider can navigate to /auth/login.
 */
import { Platform } from "react-native";
import { storage } from "@/src/utils/storage";

const PROD_FALLBACK = "https://grassroot-action.preview.emergentagent.com";

function resolveBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (fromEnv && typeof fromEnv === "string" && fromEnv.startsWith("http")) {
    return fromEnv.replace(/\/+$/, "");
  }
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return PROD_FALLBACK;
}

export const BASE = resolveBase();
// One-shot boot log so the active backend URL is visible in `adb logcat` /
// Metro on first request.
// eslint-disable-next-line no-console
console.log(`[ckd-api] BASE = ${BASE}  (Platform=${Platform.OS})`);

const TOKEN_KEY = "ckd_token";
let cachedToken: string | null = null;

/* ------------------------------------------------------------------ */
/* In-flight request tracking — used to cancel everything on logout.  */
/* ------------------------------------------------------------------ */
const inflight = new Set<AbortController>();

/** Cancel every in-flight fetch (called from signOut). */
export function cancelAllRequests() {
  inflight.forEach((c) => {
    try { c.abort(); } catch { /* ignore */ }
  });
  inflight.clear();
}

/* ------------------------------------------------------------------ */
/* Token storage helpers                                              */
/* ------------------------------------------------------------------ */
export async function setToken(token: string | null) {
  cachedToken = token;
  if (token) await storage.setItem(TOKEN_KEY, token);
  else await storage.removeItem(TOKEN_KEY);
}

export async function loadToken() {
  if (cachedToken) return cachedToken;
  const t = await storage.getItem<string>(TOKEN_KEY, "");
  cachedToken = t || null;
  return cachedToken;
}

/** Force-flush ANY auth-related storage (called from signOut for safety). */
export async function clearAllAuthState() {
  cachedToken = null;
  await storage.removeItem(TOKEN_KEY);
  // Legacy keys from older builds — be aggressive, leave no trace.
  await storage.removeItem("ckd_user");
  await storage.removeItem("ckd_refresh_token");
  await storage.removeItem("authToken");
  cancelAllRequests();
}

/* ------------------------------------------------------------------ */
/* Listener for 401s — auth provider subscribes to auto-logout.       */
/* ------------------------------------------------------------------ */
type AuthErrorListener = () => void;
let unauthListener: AuthErrorListener | null = null;
export function onUnauthorized(fn: AuthErrorListener) { unauthListener = fn; }

/* ------------------------------------------------------------------ */
/* Core request fn                                                    */
/* ------------------------------------------------------------------ */
type RequestOpts = RequestInit & { skipRetry?: boolean };

function looksLikeHTML(text: string): boolean {
  const t = (text || "").trim().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.includes("<title>");
}

async function request(path: string, opts: RequestOpts = {}, attempt = 0): Promise<any> {
  const token = await loadToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers as any),
  };
  if (!(opts.body instanceof FormData) && opts.body) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${BASE}/api${path}`;
  const controller = new AbortController();
  inflight.add(controller);
  const started = Date.now();
  try {
    const res = await fetch(url, { ...opts, headers, signal: controller.signal });
    const ms = Date.now() - started;
    const text = await res.text();
    // eslint-disable-next-line no-console
    console.log(`[ckd-api] ${opts.method || "GET"} ${url} → ${res.status} (${ms}ms)`);

    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // Response is not JSON — likely an HTML 404 page from an ingress / captive portal.
      data = { detail: looksLikeHTML(text)
        ? "नेटवर्क समस्या — सर्वर से सही उत्तर नहीं मिला। दोबारा कोशिश करें।"
        : (text || `HTTP ${res.status}`) };
    }

    if (!res.ok) {
      // 401 = session corrupted / token rejected → notify auth provider.
      if (res.status === 401 && unauthListener) {
        try { unauthListener(); } catch { /* ignore */ }
      }
      const friendly = typeof data.detail === "string" && !looksLikeHTML(data.detail)
        ? data.detail
        : `Request failed (${res.status})`;
      const err = new Error(friendly);
      (err as any).status = res.status;
      throw err;
    }
    return data;
  } catch (e: any) {
    const ms = Date.now() - started;
    // Network error or abort? Retry once for transient issues.
    const isAbort = e?.name === "AbortError";
    const isNetwork = !e?.status && !isAbort;
    // eslint-disable-next-line no-console
    console.warn(`[ckd-api] FAIL ${opts.method || "GET"} ${url} (${ms}ms) ${isAbort ? "[abort]" : ""}: ${e?.message || e}`);
    if (!isAbort && isNetwork && !opts.skipRetry && attempt < 1) {
      // brief backoff then retry once
      await new Promise((r) => setTimeout(r, 600));
      return request(path, opts, attempt + 1);
    }
    if (isNetwork && !isAbort) {
      throw new Error("इंटरनेट उपलब्ध नहीं — कनेक्शन जाँचकर दोबारा कोशिश करें");
    }
    throw e;
  } finally {
    inflight.delete(controller);
  }
}

function inferMime(uri: string, kind: "image" | "video", fallbackExt?: string) {
  const ext = (uri.split(/[?#]/)[0].split(".").pop() || fallbackExt || (kind === "image" ? "jpg" : "mp4")).toLowerCase();
  if (kind === "image") {
    if (ext === "png") return { mime: "image/png", ext };
    if (ext === "webp") return { mime: "image/webp", ext };
    if (ext === "heic" || ext === "heif") return { mime: "image/heic", ext };
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (ext === "mov") return { mime: "video/quicktime", ext };
  if (ext === "webm") return { mime: "video/webm", ext };
  return { mime: "video/mp4", ext: "mp4" };
}

export const api = {
  get: (p: string) => request(p),
  post: (p: string, body?: any) => request(p, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: (p: string, body?: any) => request(p, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: (p: string, body?: any) => request(p, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: (p: string) => request(p, { method: "DELETE" }),

  upload: async (uri: string, kind: "image" | "video", onProgress?: (pct: number) => void) => {
    const token = await loadToken();
    const { mime, ext } = inferMime(uri, kind);
    const fd = new FormData();
    fd.append("kind", kind);

    if (Platform.OS === "web") {
      const blobRes = await fetch(uri);
      const blob = await blobRes.blob();
      const name = `upload.${ext}`;
      const file = new File([blob], name, { type: blob.type || mime });
      fd.append("file", file);
    } else {
      fd.append("file", { uri, name: `upload.${ext}`, type: mime } as any);
    }

    const url = `${BASE}/api/media/upload`;
    return await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let data: any = {};
        try { data = JSON.parse(xhr.responseText || "{}"); } catch { data = { detail: xhr.responseText }; }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(typeof data.detail === "string" && !looksLikeHTML(data.detail) ? data.detail : `अपलोड विफल (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("नेटवर्क त्रुटि — कृपया दोबारा कोशिश करें"));
      xhr.send(fd);
    });
  },
};
