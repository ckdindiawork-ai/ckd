/**
 * API client - thin fetch wrapper handling auth token + base URL.
 *
 * BASE URL resolution (in priority order):
 *   1. EXPO_PUBLIC_BACKEND_URL from .env / eas.json env injection (build-time inlined)
 *   2. Hard-coded production fallback so a packaged APK still works even if env
 *      injection silently fails during EAS Build.
 *
 * If you fork this repo to a different backend, change PROD_FALLBACK below.
 */
import { Platform } from "react-native";
import { storage } from "@/src/utils/storage";

const PROD_FALLBACK = "https://grassroot-action.preview.emergentagent.com";

function resolveBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (fromEnv && typeof fromEnv === "string" && fromEnv.startsWith("http")) return fromEnv.replace(/\/+$/, "");
  // On web, prefer the current origin so /api proxying works in any deployment.
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return PROD_FALLBACK;
}

const BASE = resolveBase();
// One-shot log so the active URL is visible in `adb logcat` / Metro on first request.
if (__DEV__ || Platform.OS !== "web") {
  // eslint-disable-next-line no-console
  console.log("[ckd-api] BASE =", BASE);
}

const TOKEN_KEY = "ckd_token";

let cachedToken: string | null = null;

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

async function request(path: string, opts: RequestInit = {}) {
  const token = await loadToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers as any),
  };
  if (!(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    const err = new Error(data.detail || `Request failed (${res.status})`);
    (err as any).status = res.status;
    throw err;
  }
  return data;
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
  del: (p: string) => request(p, { method: "DELETE" }),
  /**
   * Cross-platform Cloudinary upload via backend.
   * - Web: converts the local/blob URI to a real Blob (FormData {uri} shape does not work on web).
   * - Native: sends the {uri, name, type} shape which React Native turns into multipart.
   */
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

    // Use XHR for progress on web/native (fetch lacks upload progress).
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
        else reject(new Error(data.detail || `अपलोड विफल (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("नेटवर्क त्रुटि — कृपया दोबारा कोशिश करें"));
      xhr.send(fd);
    });
  },
};
