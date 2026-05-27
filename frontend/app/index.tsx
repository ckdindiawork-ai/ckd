/**
 * Splash + routing decision. Routes to:
 * - onboarding (first launch)
 * - login (no auth)
 * - profile-setup (auth but profile incomplete)
 * - tabs (auth complete)
 */
import { useEffect } from "react";
import { Image, StyleSheet, View, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth";
import { storage } from "@/src/utils/storage";
import { colors, fonts, LOGO_URL } from "@/src/theme";
import { TText } from "@/src/components/ui";

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    (async () => {
      const seen = await storage.getItem<boolean>("ckd_onboarded", false);
      await new Promise((r) => setTimeout(r, 600));
      if (!seen) router.replace("/onboarding");
      else if (!user) router.replace("/auth/login");
      else if (!user.profile_complete) router.replace("/auth/profile-setup");
      else router.replace("/(tabs)/home");
    })();
  }, [loading, user, router]);

  return (
    <LinearGradient colors={[colors.primary, "#1a0a4a"]} style={styles.root}>
      <View style={styles.center}>
        <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
        <TText weight="display" style={styles.title}>क्रांति दल</TText>
        <View style={styles.tagWrap}>
          <View style={styles.dash} />
          <TText weight="bold" style={styles.tag}>युवा जागे, देश बदले</TText>
          <View style={styles.dash} />
        </View>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  logo: { width: 180, height: 180, borderRadius: 90 },
  title: { fontSize: 36, color: "#fff", marginTop: 18, letterSpacing: 1 },
  tagWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  dash: { width: 16, height: 2, backgroundColor: colors.energy },
  tag: { color: colors.accent, fontSize: 16, fontFamily: fonts.bodyBold },
});
