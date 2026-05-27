/**
 * Mobile + OTP login. Mock OTP - always `123456`. Routes to profile-setup or tabs.
 */
import React, { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button, TText } from "@/src/components/ui";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { colors, fonts, LOGO_URL, radius, spacing } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"mobile" | "otp">("mobile");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const sendOtp = async () => {
    if (mobile.length < 10) {
      Alert.alert("मोबाइल नंबर सही नहीं", "10 अंकों का सही नंबर दर्ज करें");
      return;
    }
    setLoading(true);
    try {
      const r = await api.post("/auth/send-otp", { mobile });
      setStage("otp");
      setHint(r.mock_otp ? `डेमो OTP: ${r.mock_otp}` : null);
    } catch (e: any) {
      Alert.alert("त्रुटि", e.message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (otp.length !== 6) {
      Alert.alert("OTP गलत", "6 अंकों का OTP दर्ज करें");
      return;
    }
    setLoading(true);
    try {
      const r = await api.post("/auth/verify-otp", { mobile, otp });
      await signIn(r.token, r.user);
      if (!r.user.profile_complete) router.replace("/auth/profile-setup");
      else router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("OTP सत्यापन विफल", e.message);
    } finally {
      setLoading(false);
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
          <TText weight="display" style={styles.title}>{stage === "mobile" ? "आंदोलन में आपका स्वागत है" : "OTP दर्ज करें"}</TText>
          <TText style={styles.subtitle}>
            {stage === "mobile" ? "अपना मोबाइल नंबर दर्ज करें। हम एक 6 अंकों का OTP भेजेंगे।" : `+91 ${mobile} पर भेजा गया OTP डालें`}
          </TText>

          {stage === "mobile" ? (
            <View style={styles.inputBox}>
              <TText weight="bold" style={styles.cc}>+91</TText>
              <View style={styles.sep} />
              <TextInput
                testID="login-mobile-input"
                value={mobile}
                onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, "").slice(0, 10))}
                placeholder="मोबाइल नंबर"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                style={styles.input}
                maxLength={10}
              />
            </View>
          ) : (
            <>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed" size={18} color={colors.muted} style={{ marginRight: 8 }} />
                <TextInput
                  testID="login-otp-input"
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="6 अंकों का OTP"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={[styles.input, { letterSpacing: 8 }]}
                  maxLength={6}
                />
              </View>
              {hint && (
                <View style={styles.hint}>
                  <Ionicons name="information-circle" size={16} color={colors.primary} />
                  <TText weight="medium" style={{ color: colors.primary, fontSize: 13 }}>{hint}</TText>
                </View>
              )}
              <Pressable onPress={() => { setStage("mobile"); setOtp(""); }}>
                <TText weight="bold" style={{ color: colors.primary, marginTop: 8 }}>नंबर बदलें</TText>
              </Pressable>
            </>
          )}

          <Button
            testID={stage === "mobile" ? "login-send-otp-btn" : "login-verify-otp-btn"}
            label={stage === "mobile" ? "OTP भेजें" : "सत्यापित करें"}
            icon={stage === "mobile" ? "send" : "checkmark-circle"}
            onPress={stage === "mobile" ? sendOtp : verify}
            loading={loading}
            style={{ marginTop: spacing.xl }}
          />

          <View style={styles.legal}>
            <Ionicons name="shield-checkmark" size={14} color={colors.muted} />
            <TText style={{ color: colors.muted, fontSize: 12, marginLeft: 6 }}>आगे बढ़कर आप हमारी गोपनीयता नीति से सहमत होते हैं</TText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerArea: { paddingBottom: 40 },
  headerInner: { alignItems: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  logo: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: colors.accent },
  brand: { color: "#fff", fontSize: 28, marginTop: 12, letterSpacing: 1 },
  tag: { color: colors.accent, fontSize: 13, marginTop: 4 },
  sheet: { flex: 1, marginTop: -24, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  title: { fontSize: 22, color: colors.text },
  subtitle: { color: colors.muted, marginTop: 6, lineHeight: 20 },
  inputBox: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  cc: { color: colors.text, fontSize: 16 },
  sep: { width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 10 },
  input: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text, paddingVertical: 14 },
  hint: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, padding: 12, backgroundColor: colors.primary + "10", borderRadius: 10 },
  legal: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20 },
});
