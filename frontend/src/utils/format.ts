/**
 * Helpers to render relative Hindi time + category lookup.
 */
import { CATEGORIES } from "@/src/theme";

export function timeAgo(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "अभी";
  if (diff < 3600) return `${Math.floor(diff / 60)} मिनट पहले`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} घंटे पहले`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} दिन पहले`;
  const d = new Date(iso);
  return d.toLocaleDateString("hi-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function getCategory(value?: string) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
}

export function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("hi-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}
