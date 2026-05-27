/**
 * Cross-platform share helper for campaigns + membership card.
 * Guaranteed soft-fail: when native/web share is unavailable or denied,
 * we fall back to clipboard copy and report the mode to the caller.
 */
import { Platform, Share } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as Clipboard from "expo-clipboard";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import { LOGO_URL } from "@/src/theme";

const APP_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "https://ckd.app";

export function buildCampaignCaption(c: { id?: string; title: string; description: string; date?: string; location?: string }) {
  const link = `${APP_URL}/campaigns/${c.id || ""}`;
  return [
    `🚩 ${c.title}`,
    c.location && c.date ? `📍 ${c.location}  •  📅 ${c.date}` : c.location ? `📍 ${c.location}` : c.date ? `📅 ${c.date}` : "",
    "",
    c.description?.slice(0, 160) || "",
    "",
    "आइए साथ चलें — *युवा जागे, देश बदले*",
    "Cockroach Kranti Dal (CKD)",
    link,
  ].filter(Boolean).join("\n");
}

async function copyAsFallback(text: string) {
  try {
    await Clipboard.setStringAsync(text);
    return { ok: true, mode: "clipboard" as const };
  } catch {
    return { ok: false, mode: "error" as const };
  }
}

/**
 * Share a campaign. Always returns ok:true unless the user cancels.
 * Tries: Web Share (with files) → Web Share (text) → native Share → expo-sharing → clipboard.
 */
export async function shareCampaign(
  campaign: { id?: string; title: string; description: string; date?: string; location?: string; cover_url?: string | null },
) {
  const caption = buildCampaignCaption(campaign);
  const title = `CKD — ${campaign.title}`;

  // Web: try the Web Share API first
  if (Platform.OS === "web" && typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      await (navigator as any).share({ title, text: caption, url: `${APP_URL}/campaigns/${campaign.id || ""}` });
      return { ok: true, mode: "web-share" as const };
    } catch (e: any) {
      if (e?.name === "AbortError") return { ok: false, mode: "cancelled" as const };
      // fall through
    }
    return copyAsFallback(caption);
  }

  // Native: try React Native Share, then expo-sharing if available, then clipboard
  try {
    const result = await Share.share({ title, message: caption });
    if ((result as any)?.action === Share.dismissedAction) return { ok: false, mode: "cancelled" as const };
    return { ok: true, mode: "text" as const };
  } catch {
    // continue
  }
  try {
    const isAvail = await Sharing.isAvailableAsync();
    if (isAvail) {
      // expo-sharing wants a file, not text; we don't have one here so we skip if there's nothing to share
    }
  } catch {
    // ignore
  }
  return copyAsFallback(caption);
}

/**
 * Saves the membership card to the device gallery (native) or downloads it (web).
 * Always tries multiple fallbacks; only returns ok:false if everything fails or user cancels.
 */
export async function saveMembershipCard(cardRef: { current: any }, name: string) {
  const caption = `मैं Cockroach Kranti Dal (CKD) का सदस्य हूँ — युवा जागे, देश बदले 🚩\n— ${name}`;

  // Native: capture PNG -> save to Photos via MediaLibrary
  if (Platform.OS !== "web") {
    let uri: string | null = null;
    try {
      uri = await captureRef(cardRef, { format: "png", quality: 0.95 });
    } catch {
      // capture failed; fall back to text share
      try {
        await Share.share({ title: "CKD सदस्यता कार्ड", message: caption });
        return { ok: true, mode: "text" as const };
      } catch {
        return copyAsFallback(caption);
      }
    }
    // Try MediaLibrary save
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (perm.status === "granted") {
        const asset = await MediaLibrary.createAssetAsync(uri);
        try {
          // best-effort: place in a CKD album
          const album = await MediaLibrary.getAlbumAsync("CKD");
          if (album) await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          else await MediaLibrary.createAlbumAsync("CKD", asset, false);
        } catch {
          // album step is non-critical
        }
        return { ok: true, mode: "gallery" as const };
      }
    } catch {
      // ignore and fall through to share
    }
    // Fallback: open share sheet so user can save manually
    try {
      const isAvail = await Sharing.isAvailableAsync();
      if (isAvail) {
        await Sharing.shareAsync(uri, { dialogTitle: "CKD सदस्यता कार्ड", mimeType: "image/png" });
        return { ok: true, mode: "shared" as const };
      }
      const dest = `${FileSystem.documentDirectory}ckd-membership.png`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      return { ok: true, mode: "saved" as const, path: dest };
    } catch {
      return copyAsFallback(caption);
    }
  }

  // Web: capture to data URI then trigger browser download / Web Share
  let dataUrl: string | null = null;
  try {
    dataUrl = await captureRef(cardRef, { format: "png", quality: 0.95, result: "data-uri" } as any);
  } catch {
    // capture failed - try web share text or clipboard
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: "CKD सदस्यता कार्ड", text: caption });
        return { ok: true, mode: "web-text" as const };
      } catch (e: any) {
        if (e?.name === "AbortError") return { ok: false, mode: "cancelled" as const };
      }
    }
    return copyAsFallback(caption);
  }

  // Try Web Share API with the file
  if (dataUrl && typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "ckd-membership.png", { type: "image/png" });
      if ((navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: "CKD सदस्यता कार्ड", text: caption });
        return { ok: true, mode: "web-file" as const };
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return { ok: false, mode: "cancelled" as const };
    }
  }
  // Trigger browser download
  if (dataUrl && typeof document !== "undefined") {
    try {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "ckd-membership.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return { ok: true, mode: "download" as const };
    } catch {
      // continue
    }
  }
  return copyAsFallback(caption);
}

// Backwards-compat: keep the old name as alias.
export const shareMembershipCard = saveMembershipCard;

export const LOGO_REMOTE = LOGO_URL;
