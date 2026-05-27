/**
 * Cross-platform share helper for campaigns.
 * - On native: react-native-view-shot + expo-sharing to send poster image + caption.
 * - On web (preview): navigator.share if available, falls back to clipboard copy.
 */
import { Platform, Share } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { captureRef } from "react-native-view-shot";
import { LOGO_URL } from "@/src/theme";

const APP_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "https://ckd.app";

export function buildCampaignCaption(c: { title: string; description: string; date?: string; location?: string }) {
  const link = `${APP_URL}/campaigns/${(c as any).id || ""}`;
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

/**
 * Shares a campaign with optional captured poster view (cardRef from useRef).
 * If cardRef provided and platform supports image share, sends image + caption,
 * otherwise sends just the caption (which still includes the link).
 */
export async function shareCampaign(
  campaign: { id?: string; title: string; description: string; date?: string; location?: string; cover_url?: string | null },
  cardRef?: { current: any },
) {
  const caption = buildCampaignCaption(campaign);
  const title = `CKD — ${campaign.title}`;

  // Try native image share via view-shot if ref provided
  if (cardRef?.current && Platform.OS !== "web") {
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 0.9 });
      const isAvail = await Sharing.isAvailableAsync();
      if (isAvail) {
        // expo-sharing on iOS opens UIActivityViewController; on Android the system chooser
        await Sharing.shareAsync(uri, { dialogTitle: title, mimeType: "image/png", UTI: "public.png" });
        return { ok: true, mode: "image" };
      }
    } catch (e) {
      // fall through to text share
    }
  }

  // Web: prefer Web Share API which can handle text+url (and files on supporting browsers)
  if (Platform.OS === "web" && typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      await (navigator as any).share({ title, text: caption, url: `${APP_URL}/campaigns/${campaign.id || ""}` });
      return { ok: true, mode: "web-share" };
    } catch (e: any) {
      if (e?.name === "AbortError") return { ok: false, mode: "cancelled" };
    }
  }

  // Fallback: RN Share which works on iOS/Android and most web envs
  try {
    await Share.share({ title, message: caption });
    return { ok: true, mode: "text" };
  } catch {
    return { ok: false, mode: "error" };
  }
}

/**
 * Captures and shares the digital membership card image.
 */
export async function shareMembershipCard(cardRef: { current: any }, name: string) {
  const caption = `मैं Cockroach Kranti Dal (CKD) का सदस्य हूँ — युवा जागे, देश बदले 🚩\n— ${name}`;

  // Try image capture first (works best on native, sometimes on web via html2canvas)
  let imageUri: string | null = null;
  let imageDataUrl: string | null = null;
  try {
    if (Platform.OS === "web") {
      imageDataUrl = await captureRef(cardRef, { format: "png", quality: 0.95, result: "data-uri" } as any);
    } else {
      imageUri = await captureRef(cardRef, { format: "png", quality: 0.95 });
    }
  } catch {
    // Capture failed - fall through to text-only sharing below.
  }

  // Native path
  if (Platform.OS !== "web") {
    if (imageUri) {
      try {
        const isAvail = await Sharing.isAvailableAsync();
        if (isAvail) {
          await Sharing.shareAsync(imageUri, { dialogTitle: "CKD सदस्यता कार्ड", mimeType: "image/png" });
          return { ok: true, mode: "image" };
        }
        const dest = `${FileSystem.documentDirectory}ckd-membership.png`;
        await FileSystem.copyAsync({ from: imageUri, to: dest });
        return { ok: true, mode: "saved", path: dest };
      } catch {
        // fall through to text share
      }
    }
    try {
      await Share.share({ title: "CKD सदस्यता कार्ड", message: caption });
      return { ok: true, mode: "text" };
    } catch {
      return { ok: false, mode: "error" };
    }
  }

  // Web path
  // 1) Try Web Share API with file if we have the image
  if (imageDataUrl && typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      const blob = await (await fetch(imageDataUrl)).blob();
      const file = new File([blob], "ckd-membership.png", { type: "image/png" });
      if ((navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: "CKD सदस्यता कार्ड", text: caption });
        return { ok: true, mode: "web-file" };
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return { ok: false, mode: "cancelled" };
    }
  }
  // 2) Trigger a download if we have the image
  if (imageDataUrl && typeof document !== "undefined") {
    try {
      const a = document.createElement("a");
      a.href = imageDataUrl;
      a.download = "ckd-membership.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return { ok: true, mode: "download" };
    } catch {
      // continue to text share
    }
  }
  // 3) Try Web Share API with text+url
  if (typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      await (navigator as any).share({ title: "CKD सदस्यता कार्ड", text: caption });
      return { ok: true, mode: "web-text" };
    } catch (e: any) {
      if (e?.name === "AbortError") return { ok: false, mode: "cancelled" };
    }
  }
  // 4) Final fallback: clipboard copy
  try {
    if (typeof navigator !== "undefined" && (navigator as any).clipboard?.writeText) {
      await (navigator as any).clipboard.writeText(caption);
      return { ok: true, mode: "clipboard" };
    }
  } catch {
    // ignore
  }
  return { ok: false, mode: "error" };
}

export const LOGO_REMOTE = LOGO_URL;
