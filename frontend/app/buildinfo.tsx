/**
 * Public Build Info screen — accessible without login at `/buildinfo`.
 *
 * Purpose: QA can verify exactly which commit is installed BEFORE logging in.
 * Useful when the app gets stuck in an auth loop and we still need to confirm
 * the user has a fresh APK.
 *
 * Also reachable from Profile screen → tap build stamp.
 */
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { BUILD_INFO } from "@/src/build-info";
import { TText } from "@/src/components/ui";
import { useToast } from "@/src/components/Toast";
import { colors, spacing, radius } from "@/src/theme";

export default function BuildInfoScreen() {
  const router = useRouter();
  const { toast } = useToast();

  const stale = BUILD_INFO.commit === "STAMPED_AT_BUILD" || BUILD_INFO.commit === "no-git";
  const dirty = BUILD_INFO.commit.includes("+dirty");
  const profileColor =
    BUILD_INFO.profile === "production" ? colors.success :
    BUILD_INFO.profile === "preview" ? colors.accent :
    BUILD_INFO.profile === "development" ? colors.primary :
    colors.muted;

  const fingerprint =
    `CKD v${BUILD_INFO.version} (build ${BUILD_INFO.versionCode})\n` +
    `commit: ${BUILD_INFO.commit}\n` +
    `branch: ${BUILD_INFO.branch}\n` +
    `profile: ${BUILD_INFO.profile}\n` +
    `runner: ${BUILD_INFO.runner}\n` +
    `easBuildId: ${BUILD_INFO.easBuildId || "—"}\n` +
    `builtAt: ${BUILD_INFO.builtAt}`;

  const onCopy = async () => {
    await Clipboard.setStringAsync(fingerprint);
    toast.success("बिल्ड डिटेल्स कॉपी हो गईं");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="buildinfo-back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <TText weight="bold">वापस</TText>
        </Pressable>

        <LinearGradient colors={[colors.primary, "#1f0d4a"]} style={styles.hero}>
          <Ionicons name="git-branch" size={32} color={colors.accent} />
          <TText weight="display" style={{ color: "#fff", fontSize: 22, marginTop: 8 }}>बिल्ड पहचान</TText>
          <TText style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4, textAlign: "center" }}>
            यह स्क्रीन साबित करती है कि APK में कौन-सा code compiled है
          </TText>
        </LinearGradient>

        {stale && (
          <View style={styles.warning} testID="buildinfo-stale-warning">
            <Ionicons name="warning" size={18} color={colors.energy} />
            <TText weight="bold" style={{ color: colors.energy, flex: 1, fontSize: 13 }}>
              ⚠ बिल्ड स्टैम्प missing — EAS hooks नहीं चले। APK को rebuild करें।
            </TText>
          </View>
        )}

        <View style={styles.card} testID="buildinfo-card">
          <Row label="App version" value={`v${BUILD_INFO.version} (build ${BUILD_INFO.versionCode})`} mono testID="buildinfo-version" />
          <Row label="Commit hash" value={BUILD_INFO.commit} mono warn={dirty} testID="buildinfo-commit" />
          <Row label="Git branch" value={BUILD_INFO.branch} mono testID="buildinfo-branch" />
          <Row
            label="Build profile"
            value={BUILD_INFO.profile.toUpperCase()}
            pill
            pillColor={profileColor}
            testID="buildinfo-profile"
          />
          <Row label="Build runner" value={BUILD_INFO.runner} mono testID="buildinfo-runner" />
          <Row label="EAS Build ID" value={BUILD_INFO.easBuildId || "—"} mono testID="buildinfo-eas-id" />
          <Row label="Built at (UTC)" value={BUILD_INFO.builtAt} mono testID="buildinfo-built-at" />
        </View>

        <Pressable onPress={onCopy} style={styles.copyBtn} testID="buildinfo-copy">
          <Ionicons name="copy-outline" size={18} color={colors.text} />
          <TText weight="bold">सभी विवरण क्लिपबोर्ड पर कॉपी करें</TText>
        </Pressable>

        <TText style={styles.helper}>
          💡 यह जानकारी हर EAS Build पर automatically regenerate होती है। GitHub HEAD के commit hash से मिलाकर verify करें।
        </TText>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, mono, warn, pill, pillColor, testID }: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
  pill?: boolean;
  pillColor?: string;
  testID?: string;
}) {
  return (
    <View style={styles.row} testID={testID}>
      <TText style={styles.rowLabel}>{label}</TText>
      {pill ? (
        <View style={[styles.pill, { backgroundColor: (pillColor || colors.muted) + "22", borderColor: pillColor || colors.muted }]}>
          <TText weight="bold" style={[styles.pillText, { color: pillColor || colors.muted }]}>{value}</TText>
        </View>
      ) : (
        <TText
          style={[
            styles.rowValue,
            mono && { fontFamily: "monospace" },
            warn && { color: colors.energy },
          ]}
          selectable
          numberOfLines={2}
        >
          {value}
        </TText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  hero: { padding: 24, borderRadius: radius.lg, alignItems: "center", marginBottom: 16 },
  warning: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.energy + "15", borderWidth: 1, borderColor: colors.energy, marginBottom: 12 },
  card: { backgroundColor: colors.surface, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: 10 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 6 },
  rowLabel: { width: 120, color: colors.muted, fontSize: 12 },
  rowValue: { flex: 1, color: colors.text, fontSize: 13 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1, alignSelf: "flex-start" },
  pillText: { fontSize: 11, fontFamily: "monospace" },
  copyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, marginTop: 16, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  helper: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 16, paddingHorizontal: 8, lineHeight: 18 },
});
