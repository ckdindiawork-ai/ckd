/**
 * Email + password login + Google one-tap + forgot password + signup CTA.
 */
import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button, TText } from "@/src/components/ui";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useToast } from "@/src/components/Toast";
import { colors, fonts, LOGO_URL, radius, spacing } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) return toast.error("ईमेल भरें");
    if (!password) return toast.error("पासवर्ड भरें");
    setLoading(true);
    try {
      const r = await api.post("/auth/login", { email: email.trim().toLowerCase(), password });
      await signIn(r.token, r.user);
      if (!r.user.profile_complete) router.replace("/auth/profile-setup");
      else router.replace("/(tabs)/home");
    } catch (e: any) {
      toast.error(e?.message || "लॉग इन विफल");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setGoogleLoading(true);
    try {
      const r = await signInWithGoogle();
      if (!r.ok) {
        if (r.error && r.error !== "रद्द किया गया") toast.error(r.error);
        return;
      }
      // On web the page is about to redirect; nothing more to do.
      if (Platform.OS === "web") return;
      router.replace("/");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <LinearGradient colors={[colors.primary, "#1a0a4a"]} style={styles.headerArea}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerInner}>
            <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
            <TText weight="display" style={styles.brand}>क्रांति दल</TText>
            <TText weight="bold" style={styles.tag}>युवा जागे, देश बदले</TText>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.sheet} contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled">
          <TText weight="display" style={styles.title}>स्वागत है</TText>
          <TText style={styles.subtitle}>अपने खाते में लॉग इन करें</TText>

          <Label text="ईमेल" />
          <View style={styles.inputBox}>
            <Ionicons name="mail" size={18} color={colors.muted} />
            <TextInput
              testID="login-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
            />
          </View>

          <Label text="पासवर्ड" />
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed" size={18} color={colors.muted} />
            <TextInput
              testID="login-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPw}
              autoComplete="password"
              style={styles.input}
            />
            <Pressable onPress={() => setShowPw(!showPw)} hitSlop={10}>
              <Ionicons name={showPw ? "eye-off" : "eye"} size={18} color={colors.muted} />
            </Pressable>
          </View>

          <Link href="/auth/forgot" asChild>
            <Pressable style={{ alignSelf: "flex-end", marginTop: 8 }}>
              <TText weight="bold" style={{ color: colors.primary, fontSize: 13 }}>पासवर्ड भूल गए?</TText>
            </Pressable>
          </Link>

          <Button
            testID="login-submit-btn"
            label="लॉग इन करें"
            icon="log-in"
            onPress={submit}
            loading={loading}
            style={{ marginTop: spacing.lg }}
          />

          <View style={styles.divider}>
            <View style={styles.divLine} />
            <TText style={{ color: colors.muted, fontSize: 12 }}>या</TText>
            <View style={styles.divLine} />
          </View>

          <Pressable style={styles.googleBtn} onPress={google} disabled={googleLoading} testID="login-google-btn">
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <TText weight="bold" style={{ color: colors.text, fontSize: 15 }}>
              {googleLoading ? "कनेक्ट हो रहा है…" : "Google से जारी रखें"}
            </TText>
          </Pressable>

          <View style={styles.signupRow}>
            <TText style={{ color: colors.muted, fontSize: 13 }}>नए हैं? </TText>
            <Link href="/auth/signup" asChild>
              <Pressable testID="login-go-signup">
                <TText weight="bold" style={{ color: colors.primary, fontSize: 13 }}>खाता बनाएँ</TText>
              </Pressable>
            </Link>
          </View>

          <View style={styles.legal}>
            <Ionicons name="shield-checkmark" size={14} color={colors.muted} />
            <TText style={{ color: colors.muted, fontSize: 12, marginLeft: 6 }}>आगे बढ़कर आप गोपनीयता नीति से सहमत होते हैं</TText>
          </View>

          {/* QA/Debug — verify which APK build is installed (no login required). */}
          <Pressable onPress={() => router.push("/buildinfo")} style={styles.buildLink} testID="login-build-info">
            <Ionicons name="git-branch" size={10} color={colors.muted} />
            <TText style={{ color: colors.muted, fontSize: 10, fontFamily: "monospace" }}>
              बिल्ड पहचान देखें
            </TText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <TText weight="bold" style={{ marginTop: spacing.md, marginBottom: 6, color: colors.text, fontSize: 13 }}>{text}</TText>;
}

const styles = StyleSheet.create({
  headerArea: { paddingBottom: 40 },
  headerInner: { alignItems: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  logo: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.accent },
  brand: { color: "#fff", fontSize: 26, marginTop: 10, letterSpacing: 1 },
  tag: { color: colors.accent, fontSize: 13, marginTop: 4 },
  sheet: { flex: 1, marginTop: -24, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  title: { fontSize: 24, color: colors.text },
  subtitle: { color: colors.muted, marginTop: 4 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text, paddingVertical: 14 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: spacing.lg },
  divLine: { flex: 1, height: 1, backgroundColor: colors.border },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  signupRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl },
  legal: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16 },
  buildLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 12, marginTop: 4 },
});
