/**
 * API client - thin fetch wrapper handling auth token + base URL.
 */
import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
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

export const api = {
  get: (p: string) => request(p),
  post: (p: string, body?: any) => request(p, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: (p: string, body?: any) => request(p, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: (p: string) => request(p, { method: "DELETE" }),
  upload: async (uri: string, kind: "image" | "video") => {
    const token = await loadToken();
    const ext = uri.split(".").pop()?.toLowerCase() || (kind === "image" ? "jpg" : "mp4");
    const mime =
      kind === "image"
        ? ext === "png"
          ? "image/png"
          : "image/jpeg"
        : ext === "mov"
          ? "video/quicktime"
          : "video/mp4";
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("file", { uri, name: `upload.${ext}`, type: mime } as any);
    const res = await fetch(`${BASE}/api/media/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Upload failed");
    return data;
  },
};
