/**
 * Request a password reset link. Backend prints the link to logs for now.
 */
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, TText } from "@/src/components/ui";
import { api } from "@/src/api";
import { useToast } from "@/src/components/Toast";
import { colors, fonts, radius, spacing } from "@/src/theme";

export default function Forgot() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim() || !email.includes("@")) return toast.error("सही ईमेल भरें");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
      toast.success("रीसेट लिंक भेज दिया गया");
    } catch (e: any) {
      toast.error(e?.message || "विफल");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>
        <TText weight="display" style={{ fontSize: 20 }}>पासवर्ड रीसेट</TText>
        <View style={{ width: 38 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled">
          {!sent ? (
            <>
              <TText style={{ color: colors.muted, marginBottom: spacing.lg, lineHeight: 22 }}>
                अपना पंजीकृत ईमेल भरें। हम आपको पासवर्ड रीसेट करने का लिंक भेजेंगे।
              </TText>

              <View style={styles.inputBox}>
                <Ionicons name="mail" size={18} color={colors.muted} />
                <TextInput
                  testID="forgot-email-input"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@example.com"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>

              <Button label="रीसेट लिंक भेजें" icon="send" onPress={submit} loading={loading} style={{ marginTop: spacing.xl }} testID="forgot-submit-btn" />
            </>
          ) : (
            <View style={{ alignItems: "center", paddingTop: 30 }}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={36} color="#fff" />
              </View>
              <TText weight="display" style={{ fontSize: 20, marginTop: 20, textAlign: "center" }}>लिंक भेज दिया</TText>
              <TText style={{ color: colors.muted, marginTop: 8, textAlign: "center", lineHeight: 22 }}>
                अगर यह ईमेल पंजीकृत है, तो आपको पासवर्ड रीसेट का लिंक मिल जाएगा।
              </TText>
              <Link href="/auth/reset" asChild>
                <Pressable style={{ marginTop: 24 }}>
                  <TText weight="bold" style={{ color: colors.primary, fontSize: 14 }}>मेरे पास टोकन है — रीसेट करें</TText>
                </Pressable>
              </Link>
              <Pressable onPress={() => router.replace("/auth/login")} style={{ marginTop: 12 }}>
                <TText weight="bold" style={{ color: colors.muted, fontSize: 13 }}>लॉग इन पर वापस</TText>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  inputBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: 14 },
  input: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text, paddingVertical: 14 },
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
});
