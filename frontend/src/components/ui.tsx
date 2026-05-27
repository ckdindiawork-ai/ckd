/**
 * Reusable UI primitives - branded button, card, badge, header, etc.
 */
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextProps, View, ViewProps, ViewStyle, StyleProp } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, shadow, spacing, STATUS } from "@/src/theme";

export function TText({ style, weight = "regular", ...rest }: TextProps & { weight?: "regular" | "medium" | "bold" | "display" }) {
  const family =
    weight === "bold" ? fonts.bodyBold : weight === "medium" ? fonts.bodyMedium : weight === "display" ? fonts.display : fonts.body;
  return <Text {...rest} style={[{ fontFamily: family, color: colors.text }, style]} />;
}

export function Card({ children, style, ...rest }: ViewProps & { children: React.ReactNode }) {
  return (
    <View {...rest} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
  testID,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const v = styles[`btn_${variant}` as const];
  const t = styles[`btnText_${variant}` as const];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.btnBase, v, (disabled || loading) && { opacity: 0.6 }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.text : "#fff"} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={(t as any).color} />}
          <Text style={[styles.btnTextBase, t]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function StatusBadge({ status }: { status: "open" | "in_progress" | "resolved" }) {
  const s = STATUS[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: s.fg }]} />
      <Text style={{ color: s.fg, fontFamily: fonts.bodyBold, fontSize: 12 }}>{s.label}</Text>
    </View>
  );
}

export function Pill({ label, color = colors.primary, bg, icon }: { label: string; color?: string; bg?: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg || colors.primary + "12" }]}>
      {icon && <Ionicons name={icon} size={12} color={color} />}
      <Text style={{ color, fontFamily: fonts.bodyBold, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

export function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.xl }}>
      <View style={styles.sectionHead}>
        <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.text }}>{title}</Text>
        {action && (
          <Pressable onPress={onAction}>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 13 }}>{action}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

export function EmptyState({ icon = "leaf-outline", title, body }: { icon?: keyof typeof Ionicons.glyphMap; title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, marginTop: 12 }}>{title}</Text>
      {body && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 4, textAlign: "center" }}>{body}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  btnBase: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    minHeight: 48,
  },
  btn_primary: { backgroundColor: colors.accent },
  btn_secondary: { backgroundColor: colors.primary },
  btn_danger: { backgroundColor: colors.energy },
  btn_outline: { backgroundColor: "transparent", borderWidth: 2, borderColor: colors.primary },
  btn_ghost: { backgroundColor: "transparent" },
  btnTextBase: { fontFamily: fonts.bodyBold, fontSize: 15 },
  btnText_primary: { color: colors.text },
  btnText_secondary: { color: "#fff" },
  btnText_danger: { color: "#fff" },
  btnText_outline: { color: colors.primary },
  btnText_ghost: { color: colors.primary },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  empty: { alignItems: "center", justifyContent: "center", padding: spacing["3xl"] },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center" },
});
