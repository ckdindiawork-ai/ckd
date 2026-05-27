/**
 * CKD theme - brand palette + spacing + helpers.
 */
export const colors = {
  primary: "#3A1C71",      // Deep Royal Purple
  primaryDark: "#2A0F58",
  accent: "#F4B400",       // Golden Yellow
  energy: "#E63329",       // Revolutionary Red
  bg: "#F6F5FA",
  surface: "#FFFFFF",
  text: "#1C1B2E",
  muted: "#74738A",
  success: "#2E9E5B",
  border: "rgba(58, 28, 113, 0.08)",
  borderStrong: "rgba(58, 28, 113, 0.16)",
  overlay: "rgba(0,0,0,0.45)",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24, "3xl": 32 };

export const shadow = {
  card: {
    shadowColor: "#3A1C71",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  bar: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const fonts = {
  // expo-google-fonts/hind + mukta names
  body: "Hind_400Regular",
  bodyMedium: "Hind_500Medium",
  bodyBold: "Hind_700Bold",
  heading: "Hind_700Bold",
  display: "Mukta_700Bold",
};

export const STATUS = {
  open: { label: "खुली", bg: "rgba(244,180,0,0.18)", fg: "#7A5A00" },
  in_progress: { label: "काम चालू", bg: "rgba(58,28,113,0.12)", fg: "#3A1C71" },
  resolved: { label: "हल हो गई", bg: "rgba(46,158,91,0.18)", fg: "#1E6B3D" },
};

export const CATEGORIES = [
  { value: "safai", label: "सफ़ाई", icon: "trash" as const },
  { value: "sadak", label: "सड़क", icon: "construct" as const },
  { value: "paani", label: "पानी", icon: "water" as const },
  { value: "bijli", label: "बिजली", icon: "flash" as const },
  { value: "madad", label: "मदद चाहिए", icon: "hand-left" as const },
  { value: "anya", label: "अन्य", icon: "ellipsis-horizontal" as const },
];

export const CITIES = ["दिल्ली", "मुंबई", "बेंगलुरु", "हैदराबाद", "चेन्नई", "कोलकाता", "पुणे", "जयपुर", "लखनऊ", "अहमदाबाद", "इंदौर", "भोपाल", "पटना", "चंडीगढ़", "नागपुर", "अन्य"];

export const AGE_GROUPS = ["16-18", "18-25", "25-35", "35+"];

export const LOGO_URL = "https://customer-assets.emergentagent.com/job_bb88ef01-9486-44b3-bab0-5bce6557e88f/artifacts/nb1s3emw_WhatsApp%20Image%202026-05-27%20at%203.40.33%20PM.jpeg";
