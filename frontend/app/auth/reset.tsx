/**
 * Submit reset token + new password. Token is delivered out-of-band (email).
 */
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, TText } from "@/src/components/ui";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useToast } from "@/src/components/Toast";
import { colors, fonts, radius, spacing } from "@/src/theme";

export default function Reset() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [token, setToken] = useState(params.token || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token.trim()) return toast.error("रीसेट टोकन भरें");
    if (password.length < 8) return toast.error("पासवर्ड कम से कम 8 अक्षरों का हो");
    if (password !== confirm) return toast.error("दोनों पासवर्ड मेल नहीं खाते");
    setLoading(true);
    try {
      const r = await api.post("/auth/reset-password", { token: token.trim(), new_password: password });
      await signIn(r.token, r.user);
      toast.success("पासवर्ड बदल गया");
      router.replace("/");
    } catch (e: any) {
      toast.error(e?.message || "रीसेट विफल");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>
        <TText weight="display" style={{ fontSize: 20 }}>नया पासवर्ड</TText>
        <View style={{ width: 38 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled">
          <TText style={{ color: colors.muted, marginBottom: spacing.lg, lineHeight: 22 }}>
            ईमेल में मिला रीसेट टोकन और नया पासवर्ड भरें।
          </TText>

          <Label text="रीसेट टोकन" />
          <View style={styles.inputBox}>
            <Ionicons name="key" size={18} color={colors.muted} />
            <TextInput
              testID="reset-token-input"
              value={token}
              onChangeText={setToken}
              placeholder="ईमेल से कॉपी किया टोकन"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <Label text="नया पासवर्ड" />
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed" size={18} color={colors.muted} />
            <TextInput
              testID="reset-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPw}
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
              testID="reset-confirm-input"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPw}
              style={styles.input}
            />
          </View>

          <Button label="पासवर्ड बदलें" icon="checkmark-circle" onPress={submit} loading={loading} style={{ marginTop: spacing.xl }} testID="reset-submit-btn" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <TText weight="bold" style={{ marginTop: spacing.md, marginBottom: 6, color: colors.text, fontSize: 13 }}>{text}</TText>;
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  inputBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: 14 },
  input: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text, paddingVertical: 14 },
});
