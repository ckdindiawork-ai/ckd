/**
 * Email + password signup. After success, redirect to profile-setup which
 * collects the remaining profile fields (state/city/area/age/phone/photo).
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

export default function Signup() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error("पूरा नाम भरें");
    if (!email.trim() || !email.includes("@")) return toast.error("सही ईमेल भरें");
    if (password.length < 8) return toast.error("पासवर्ड कम से कम 8 अक्षरों का हो");
    if (password !== confirm) return toast.error("दोनों पासवर्ड मेल नहीं खाते");
    setLoading(true);
    try {
      const r = await api.post("/auth/signup", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirm,
      });
      await signIn(r.token, r.user);
      toast.success("स्वागत है क्रांतिकारी!");
      router.replace("/auth/profile-setup");
    } catch (e: any) {
      toast.error(e?.message || "साइन-अप विफल");
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
            <TText weight="display" style={styles.brand}>नया खाता बनाएँ</TText>
            <TText weight="bold" style={styles.tag}>आंदोलन का हिस्सा बनिए</TText>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.sheet} contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled">
          <Label text="पूरा नाम" />
          <View style={styles.inputBox}>
            <Ionicons name="person" size={18} color={colors.muted} />
            <TextInput
              testID="signup-name-input"
              value={name}
              onChangeText={setName}
              placeholder="जैसे: राहुल वर्मा"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </View>

          <Label text="ईमेल" />
          <View style={styles.inputBox}>
            <Ionicons name="mail" size={18} color={colors.muted} />
            <TextInput
              testID="signup-email-input"
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

          <Label text="पासवर्ड (कम से कम 8 अक्षर)" />
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed" size={18} color={colors.muted} />
            <TextInput
              testID="signup-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPw}
              autoComplete="new-password"
              style={styles.input}
            />
            <Pressable onPress={() => setShowPw(!showPw)} hitSlop={10}>
              <Ionicons name={showPw ? "eye-off" : "eye"} size={18} color={colors.muted} />
            </Pressable>
          </View>

          <Label text="पासवर्ड फिर से" />
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed" size={18} color={colors.muted} />
            <TextInput
              testID="signup-confirm-input"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPw}
              autoComplete="new-password"
              style={styles.input}
            />
          </View>

          <Button
            testID="signup-submit-btn"
            label="खाता बनाएँ"
            icon="person-add"
            onPress={submit}
            loading={loading}
            style={{ marginTop: spacing.xl }}
          />

          <View style={styles.divider}>
            <View style={styles.divLine} />
            <TText style={{ color: colors.muted, fontSize: 12 }}>या</TText>
            <View style={styles.divLine} />
          </View>

          <Pressable style={styles.googleBtn} onPress={google} disabled={googleLoading} testID="signup-google-btn">
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <TText weight="bold" style={{ color: colors.text, fontSize: 15 }}>
              {googleLoading ? "कनेक्ट हो रहा है…" : "Google से जारी रखें"}
            </TText>
          </Pressable>

          <View style={styles.signupRow}>
            <TText style={{ color: colors.muted, fontSize: 13 }}>पहले से खाता है? </TText>
            <Link href="/auth/login" asChild>
              <Pressable testID="signup-go-login">
                <TText weight="bold" style={{ color: colors.primary, fontSize: 13 }}>लॉग इन करें</TText>
              </Pressable>
            </Link>
          </View>
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
  logo: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: colors.accent },
  brand: { color: "#fff", fontSize: 22, marginTop: 10, letterSpacing: 0.5 },
  tag: { color: colors.accent, fontSize: 12, marginTop: 4 },
  sheet: { flex: 1, marginTop: -24, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  inputBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: 14 },
  input: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text, paddingVertical: 14 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: spacing.lg },
  divLine: { flex: 1, height: 1, backgroundColor: colors.border },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  signupRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl },
});
