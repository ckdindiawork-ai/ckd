/**
 * Skeleton — shimmer placeholder for loading states.
 *
 * Premium loading UX: instead of spinners, shows a content-shaped
 * shimmering placeholder that hints at the layout, then fades in real data.
 *
 * Built on react-native-reanimated 3 for 60fps smoothness without re-renders.
 *
 * Usage:
 *   <Skeleton width={120} height={16} radius={6} />
 *   <Skeleton.Circle size={48} />
 *   <Skeleton.Block style={{ aspectRatio: 16/9 }} />
 *   <Skeleton.Text lines={3} />     // multi-line text placeholder
 *
 * Composition helpers (pre-built common card shapes):
 *   <Skeleton.CampaignCard />
 *   <Skeleton.IssueRow />
 *   <Skeleton.ListItem />
 */
import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "@/src/theme";

// Base shimmer cycle ~ 1.4s — matches Material Motion guidelines.
const SHIMMER_DURATION = 1400;

const SHIMMER_COLORS = [
  "transparent",
  "rgba(255,255,255,0.45)",
  "transparent",
];

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
  /** Disable shimmer (e.g. when rendering a non-animated subtree). */
  static?: boolean;
};

function SkeletonBase({ width = "100%", height = 14, radius: r = 6, style, static: isStatic }: SkeletonProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isStatic) return;
    progress.value = withRepeat(
      withTiming(1, { duration: SHIMMER_DURATION, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    return () => { progress.value = 0; };
  }, [progress, isStatic]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-200, 400]) }],
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="लोड हो रहा है"
      style={[
        styles.base,
        { width, height, borderRadius: r },
        style as ViewStyle,
      ]}
    >
      {!isStatic && (
        <Animated.View style={[StyleSheet.absoluteFillObject, shimmerStyle]}>
          <LinearGradient
            colors={SHIMMER_COLORS as any}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

/* ---------- Variant helpers ---------- */

function SkeletonCircle({ size = 40, style }: { size?: number; style?: ViewStyle }) {
  return <SkeletonBase width={size} height={size} radius={size / 2} style={style} />;
}

function SkeletonBlock({ style, height = 120, radius: r = 12 }: { style?: ViewStyle; height?: number; radius?: number }) {
  return <SkeletonBase height={height} radius={r} style={style} />;
}

function SkeletonText({ lines = 1, lastLineWidth = 60 }: { lines?: number; lastLineWidth?: number }) {
  const arr = useMemo(() => Array.from({ length: lines }), [lines]);
  return (
    <View style={{ gap: 8 }}>
      {arr.map((_, i) => {
        const isLast = i === arr.length - 1;
        const width = isLast && lines > 1 ? (`${lastLineWidth}%` as const) : ("100%" as const);
        return <SkeletonBase key={i} width={width} height={12} radius={4} />;
      })}
    </View>
  );
}

/* ---------- Composed card shapes (drop-in for screens) ---------- */

function SkeletonCampaignCard() {
  return (
    <View style={styles.card}>
      <SkeletonBlock height={140} radius={12} />
      <View style={{ marginTop: 12, gap: 8 }}>
        <SkeletonBase width="80%" height={16} radius={6} />
        <SkeletonBase width="50%" height={12} radius={4} />
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <SkeletonBase width={80} height={26} radius={13} />
        <SkeletonBase width={60} height={26} radius={13} />
      </View>
    </View>
  );
}

function SkeletonIssueRow() {
  return (
    <View style={styles.row}>
      <SkeletonBase width={64} height={64} radius={12} />
      <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
        <SkeletonBase width="85%" height={14} radius={5} />
        <SkeletonBase width="55%" height={11} radius={4} />
        <SkeletonBase width={68} height={20} radius={10} />
      </View>
    </View>
  );
}

function SkeletonListItem() {
  return (
    <View style={styles.row}>
      <SkeletonCircle size={44} />
      <View style={{ flex: 1, gap: 6, justifyContent: "center" }}>
        <SkeletonBase width="70%" height={13} radius={4} />
        <SkeletonBase width="45%" height={10} radius={4} />
      </View>
    </View>
  );
}

/* ---------- Style sheet ---------- */

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#E8E5EF",   // brand-aligned muted purple-gray
    overflow: "hidden",
  },
  card: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
});

/* ---------- Public API ---------- */

export const Skeleton = Object.assign(SkeletonBase, {
  Circle: SkeletonCircle,
  Block: SkeletonBlock,
  Text: SkeletonText,
  CampaignCard: SkeletonCampaignCard,
  IssueRow: SkeletonIssueRow,
  ListItem: SkeletonListItem,
});

export default Skeleton;
