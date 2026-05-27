/**
 * Cross-platform Toast - global success / error / info banner.
 * On native, Alert can be slow/blocking; on web, RN Alert silently no-ops.
 * Usage: const { toast } = useToast(); toast.success("..."); toast.error("...");
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, shadow, spacing } from "@/src/theme";
import { TText } from "@/src/components/ui";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; text: string };

type ToastCtx = {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, text: string) => {
    const id = ++counter;
    setItems((arr) => [...arr, { id, kind, text }]);
    setTimeout(() => setItems((arr) => arr.filter((x) => x.id !== id)), kind === "error" ? 4500 : 2800);
  }, []);

  const value: ToastCtx = {
    success: (t) => push("success", t),
    error: (t) => push("error", t),
    info: (t) => push("info", t),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={styles.host}>
        {items.map((it) => (
          <ToastView key={it.id} item={it} onClose={() => setItems((arr) => arr.filter((x) => x.id !== it.id))} />
        ))}
      </View>
    </Ctx.Provider>
  );
}

function ToastView({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(-12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [op, ty]);
  const palette = item.kind === "success"
    ? { bg: colors.success, icon: "checkmark-circle" as const }
    : item.kind === "error"
      ? { bg: colors.energy, icon: "alert-circle" as const }
      : { bg: colors.primary, icon: "information-circle" as const };
  return (
    <Animated.View style={[styles.toast, { backgroundColor: palette.bg, opacity: op, transform: [{ translateY: ty }] }]}>
      <Ionicons name={palette.icon} size={20} color="#fff" />
      <TText weight="bold" style={{ color: "#fff", flex: 1, fontSize: 14 }}>{item.text}</TText>
      <Pressable onPress={onClose} hitSlop={8}>
        <Ionicons name="close" size={16} color="rgba(255,255,255,0.85)" />
      </Pressable>
    </Animated.View>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast outside provider");
  return { toast: ctx };
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: Platform.select({ ios: 48, android: 24, default: 16 }),
    left: 12,
    right: 12,
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    ...shadow.card,
  },
});
