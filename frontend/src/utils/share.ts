/**
 * Cross-platform share + save helpers.
 *
 * Rule: never fake success. On native we call the real OS share sheet directly;
 * on web we use the Web Share API. Only fall back to clipboard when the platform
 * can't share at all - and clearly report that mode so callers can show the
 * correct message.
 */
import { Platform, Share } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as Clipboard from "expo-clipboard";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import { LOGO_URL } from "@/src/theme";

const APP_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "https://ckd.app";

export type ShareResult =
  | { ok: true; mode: "native" | "web-share" | "clipboard" }
  | { ok: false; mode: "cancelled" | "error" };

export type SaveResult =
  | { ok: true; mode: "gallery" | "download" | "shared" | "saved" | "clipboard" }
  | { ok: false; mode: "cancelled" | "error" };

export function buildCampaignCaption(c: { id?: string; title: string; description: string; date?: string; location?: string }) {
  const link = `${APP_URL}/campaigns/${c.id || ""}`;
  return [
    `🚩 ${c.title}`,
    c.location && c.date ? `📍 ${c.location}  •  📅 ${c.date}` : c.location ? `📍 ${c.location}` : c.date ? `📅 ${c.date}` : "",
    "",
    c.description?.slice(0, 200) || "",
    "",
    "आइए साथ चलें — *युवा जागे, देश बदले*",
    "Cockroach Kranti Dal (CKD)",
    link,
  ].filter(Boolean).join("\n");
}

export function buildIssueCaption(i: { id?: string; title: string; description: string; city?: string; area?: string; state?: string; status?: string }) {
  const link = `${APP_URL}/issues/${i.id || ""}`;
  const statusLabel = i.status === "resolved" ? "हल हो गई" : i.status === "in_progress" ? "काम चालू" : "खुली";
  const loc = [i.area, i.city, i.state].filter(Boolean).join(", ");
  return [
    `⚠️ ${i.title}`,
    loc && `📍 ${loc}`,
    `📊 स्थिति: ${statusLabel}`,
    "",
    i.description?.slice(0, 200) || "",
    "",
    "क्या आप इसमें मदद कर सकते हैं?",
    "Cockroach Kranti Dal (CKD) — युवा जागे, देश बदले",
    link,
  ].filter(Boolean).join("\n");
}

/**
 * Open the real native share sheet. NEVER fakes success.
 * - Native: React Native `Share.share` opens the system share dialog.
 * - Web: navigator.share if available.
 * - Fallback: copy to clipboard.
 */
async function shareText(title: string, text: string): Promise<ShareResult> {
  if (Platform.OS === "web") {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text });
        return { ok: true, mode: "web-share" };
      } catch (e: any) {
        if (e?.name === "AbortError") return { ok: false, mode: "cancelled" };
        // fall through to clipboard
      }
    }
    try {
      await Clipboard.setStringAsync(text);
      return { ok: true, mode: "clipboard" };
    } catch {
      return { ok: false, mode: "error" };
    }
  }

  // Native iOS/Android - open the OS share sheet directly.
  try {
    const result = await Share.share({ title, message: text });
    if ((result as any)?.action === Share.dismissedAction) return { ok: false, mode: "cancelled" };
    return { ok: true, mode: "native" };
  } catch {
    // Try expo-sharing if Share threw (rare)
    try {
      await Clipboard.setStringAsync(text);
      return { ok: true, mode: "clipboard" };
    } catch {
      return { ok: false, mode: "error" };
    }
  }
}

export function shareCampaign(c: { id?: string; title: string; description: string; date?: string; location?: string; cover_url?: string | null }) {
  return shareText(`CKD — ${c.title}`, buildCampaignCaption(c));
}

export function shareIssue(i: { id?: string; title: string; description: string; city?: string; area?: string; state?: string; status?: string }) {
  return shareText(`CKD — ${i.title}`, buildIssueCaption(i));
}

/**
 * Save the membership card as an IMAGE to the device gallery (native) or
 * trigger a real browser download (web).
 */
export async function saveMembershipCard(cardRef: { current: any }, name: string): Promise<SaveResult> {
  const caption = `मैं Cockroach Kranti Dal (CKD) का सदस्य हूँ — युवा जागे, देश बदले 🚩\n— ${name}`;

  if (Platform.OS !== "web") {
    // Capture the view to PNG
    let uri: string;
    try {
      uri = await captureRef(cardRef, { format: "png", quality: 0.95 });
    } catch {
      return { ok: false, mode: "error" };
    }

    // Save to gallery (requires permission)
    try {
      const existing = await MediaLibrary.getPermissionsAsync();
      let status = existing.status;
      if (status !== "granted") {
        const req = await MediaLibrary.requestPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") {
        // Permission denied - fall back to share sheet so user can save manually
        try {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, { dialogTitle: "CKD सदस्यता कार्ड", mimeType: "image/png" });
            return { ok: true, mode: "shared" };
          }
        } catch {
          // ignore
        }
        return { ok: false, mode: "error" };
      }

      const asset = await MediaLibrary.createAssetAsync(uri);
      try {
        const album = await MediaLibrary.getAlbumAsync("CKD");
        if (album) await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        else await MediaLibrary.createAlbumAsync("CKD", asset, false);
      } catch {
        // album organisation is best-effort
      }
      return { ok: true, mode: "gallery" };
    } catch {
      // Persisting failed - try share sheet
      try {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { dialogTitle: "CKD सदस्यता कार्ड", mimeType: "image/png" });
          return { ok: true, mode: "shared" };
        }
        const dest = `${FileSystem.documentDirectory}ckd-membership.png`;
        await FileSystem.copyAsync({ from: uri, to: dest });
        return { ok: true, mode: "saved" };
      } catch {
        return { ok: false, mode: "error" };
      }
    }
  }

  // Web: capture to data-uri then trigger a real browser download
  let dataUrl: string;
  try {
    dataUrl = await captureRef(cardRef, { format: "png", quality: 0.95, result: "data-uri" } as any);
  } catch {
    return { ok: false, mode: "error" };
  }

  if (dataUrl && typeof document !== "undefined") {
    try {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "ckd-membership.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return { ok: true, mode: "download" };
    } catch {
      // continue
    }
  }
  return { ok: false, mode: "error" };
}

export const LOGO_REMOTE = LOGO_URL;
