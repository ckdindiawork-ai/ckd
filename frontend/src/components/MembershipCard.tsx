/**
 * Digital Membership Card - branded React Native view captured for sharing.
 */
import React, { forwardRef } from "react";
import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { TText } from "@/src/components/ui";
import { colors, fonts, LOGO_URL, radius } from "@/src/theme";

export type CardUser = {
  id: string;
  name?: string | null;
  photo_url?: string | null;
  city?: string | null;
  created_at: string;
  kranti_points: number;
};

function memberId(uid: string) {
  // First 8 chars of UUID, uppercased - stable, human-readable, unique enough.
  return `CKD-${uid.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function joinDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("hi-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return ""; }
}

export const MembershipCard = forwardRef<View, { user: CardUser }>(({ user }, ref) => {
  return (
    <View ref={ref} style={styles.wrap} collapsable={false}>
      <LinearGradient colors={[colors.primary, "#1f0d4a", "#0f0530"]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Decorative golden corner */}
        <View style={styles.cornerTL} />
        <View style={styles.cornerBR} />

        {/* Header */}
        <View style={styles.header}>
          <Image source={{ uri: LOGO_URL }} style={styles.logo} />
          <View style={{ flex: 1 }}>
            <TText weight="display" style={styles.brand}>क्रांति दल</TText>
            <TText weight="bold" style={styles.brandEn}>COCKROACH KRANTI DAL</TText>
          </View>
          <View style={styles.starsRow}>
            <Ionicons name="star" size={10} color={colors.accent} />
            <Ionicons name="star" size={10} color={colors.accent} />
          </View>
        </View>

        {/* Member section */}
        <View style={styles.body}>
          <View style={styles.avatarRing}>
            {user.photo_url ? (
              <Image source={{ uri: user.photo_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <TText weight="display" style={{ fontSize: 32, color: colors.text }}>
                  {user.name?.[0]?.toUpperCase() || "?"}
                </TText>
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <TText style={styles.label}>सदस्य</TText>
            <TText weight="display" style={styles.name} numberOfLines={1}>{user.name || "—"}</TText>
            <View style={styles.idBox}>
              <Ionicons name="qr-code" size={11} color={colors.accent} />
              <TText weight="bold" style={styles.idText}>{memberId(user.id)}</TText>
            </View>
          </View>
        </View>

        {/* Footer info row */}
        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <TText style={styles.label}>शहर</TText>
            <TText weight="bold" style={styles.value} numberOfLines={1}>{user.city || "—"}</TText>
          </View>
          <View style={styles.divider} />
          <View style={{ flex: 1 }}>
            <TText style={styles.label}>शामिल</TText>
            <TText weight="bold" style={styles.value}>{joinDate(user.created_at)}</TText>
          </View>
          <View style={styles.divider} />
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <TText style={styles.label}>क्रांति अंक</TText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="flame" size={12} color={colors.energy} />
              <TText weight="display" style={[styles.value, { color: colors.accent, fontSize: 16 }]}>{user.kranti_points}</TText>
            </View>
          </View>
        </View>

        {/* Tagline strip */}
        <View style={styles.tagline}>
          <View style={styles.dash} />
          <TText weight="bold" style={styles.taglineText}>युवा जागे, देश बदले</TText>
          <View style={styles.dash} />
        </View>
      </LinearGradient>
    </View>
  );
});

MembershipCard.displayName = "MembershipCard";

const styles = StyleSheet.create({
  wrap: { backgroundColor: "transparent" },
  card: {
    borderRadius: radius.lg,
    padding: 18,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.accent,
  },
  cornerTL: { position: "absolute", top: -30, left: -30, width: 90, height: 90, borderRadius: 45, backgroundColor: colors.accent + "12" },
  cornerBR: { position: "absolute", bottom: -40, right: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: colors.energy + "10" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  logo: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.accent },
  brand: { color: "#fff", fontSize: 18, letterSpacing: 0.5 },
  brandEn: { color: "rgba(255,255,255,0.65)", fontSize: 9, letterSpacing: 2, marginTop: 1 },
  starsRow: { flexDirection: "row", gap: 2 },
  body: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(244,180,0,0.18)" },
  avatarRing: { padding: 3, borderRadius: 50, borderWidth: 2, borderColor: colors.accent, backgroundColor: "rgba(244,180,0,0.1)" },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  label: { color: "rgba(255,255,255,0.55)", fontSize: 9, textTransform: "uppercase", letterSpacing: 1, fontFamily: fonts.bodyBold },
  name: { color: "#fff", fontSize: 20, marginTop: 2 },
  idBox: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6, backgroundColor: "rgba(244,180,0,0.16)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  idText: { color: colors.accent, fontSize: 11, letterSpacing: 1 },
  footer: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  divider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.15)" },
  value: { color: "#fff", fontSize: 13, marginTop: 2 },
  tagline: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(244,180,0,0.18)" },
  dash: { width: 16, height: 2, backgroundColor: colors.energy },
  taglineText: { color: colors.accent, fontSize: 11, letterSpacing: 1 },
});
