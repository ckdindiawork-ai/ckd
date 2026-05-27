/**
 * Profile setup screen - state/city/area/age + name/photo/phone + consent.
 * Uses cascade State -> City -> Area picker.
 */
import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Button, TText } from "@/src/components/ui";
import { LocationPicker, type LocationValue } from "@/src/components/LocationPicker";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useToast } from "@/src/components/Toast";
import { AGE_GROUPS, colors, fonts, radius, spacing } from "@/src/theme";

export default function ProfileSetup() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState<LocationValue>({ state: user?.state || "", city: user?.city || "", area: user?.area || "" });
  const [age, setAge] = useState(user?.age_group || "");
  const [photo, setPhoto] = useState(user?.photo_url || "");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return toast.error("फ़ोटो चुनने के लिए गैलरी की अनुमति दें");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingPhoto(true);
    try {
      const r = await api.upload(result.assets[0].uri, "image");
      setPhoto(r.url);
      toast.success("फ़ोटो अपलोड हो गई");
    } catch (e: any) {
      toast.error(e.message || "फ़ोटो अपलोड नहीं हो पाई");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) return toast.error("कृपया अपना नाम भरें");
    if (!location.state) return toast.error("कृपया राज्य चुनें");
    if (!location.city) return toast.error("कृपया शहर चुनें");
    if (!location.area.trim()) return toast.error("कृपया इलाक़ा भरें");
    if (!age) return toast.error("कृपया उम्र समूह चुनें");
    if (!consent) return toast.error("गोपनीयता नीति से सहमति आवश्यक है");

    setLoading(true);
    try {
      const u = await api.post("/auth/profile-setup", {
        name,
        phone: phone.trim() || null,
        state: location.state,
        city: location.city,
        area: location.area,
        age_group: age,
        photo_url: photo || null,
        consent: true,
      });
      updateUser(u);
      toast.success("स्वागत है क्रांतिकारी!");
      router.replace("/(tabs)/home");
    } catch (e: any) {
      toast.error(e.message || "प्रोफ़ाइल सेव नहीं हो सकी");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <TText weight="display" style={{ fontSize: 26, color: colors.text }}>अपना परिचय दीजिए</TText>
          <TText style={{ color: colors.muted, marginTop: 6 }}>आंदोलन में स्थानीय बदलाव लाने के लिए हमें यह जानकारी चाहिए।</TText>

          <View style={{ alignItems: "center", marginTop: 24 }}>
            <Pressable onPress={pickPhoto} style={styles.avatar} testID="profile-photo-picker" disabled={uploadingPhoto}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatarImg} />
              ) : (
                <Ionicons name={uploadingPhoto ? "cloud-upload" : "camera"} size={28} color={colors.primary} />
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="add" size={14} color="#fff" />
              </View>
            </Pressable>
            <TText style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>{uploadingPhoto ? "अपलोड हो रही है..." : "फ़ोटो जोड़ें (वैकल्पिक)"}</TText>
          </View>

          <Label text="पूरा नाम *" />
          <TextInput value={name} onChangeText={setName} placeholder="जैसे: राहुल वर्मा" placeholderTextColor={colors.muted} style={styles.input} testID="profile-name-input" />

          <Label text="मोबाइल नंबर (वैकल्पिक)" />
          <TextInput value={phone} onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, "").slice(0, 10))} placeholder="10 अंक का मोबाइल" placeholderTextColor={colors.muted} keyboardType="phone-pad" maxLength={10} style={styles.input} testID="profile-phone-input" />

          <View style={{ marginTop: 18 }}>
            <LocationPicker value={location} onChange={setLocation} testIDPrefix="profile-loc" />
          </View>

          <Label text="उम्र समूह *" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {AGE_GROUPS.map((a) => (
              <Pressable key={a} onPress={() => setAge(a)} style={[styles.chip, age === a && styles.chipActive]} testID={`profile-age-${a}`}>
                <TText weight="bold" style={{ color: age === a ? "#fff" : colors.primary, fontSize: 13 }}>{a}</TText>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.consent} onPress={() => setConsent(!consent)} testID="profile-consent-checkbox">
            <View style={[styles.checkbox, consent && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              {consent && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <TText style={{ flex: 1, color: colors.text, fontSize: 13 }}>
              मैं <TText weight="bold" style={{ color: colors.primary }}>गोपनीयता नीति</TText> से सहमत हूँ और अपना डेटा साझा करने की अनुमति देता/देती हूँ।
            </TText>
          </Pressable>

          <Button label="आगे बढ़ें" icon="arrow-forward" loading={loading} onPress={submit} style={{ marginTop: spacing.xl }} testID="profile-submit-btn" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <TText weight="bold" style={{ marginTop: 18, marginBottom: 8, color: colors.text }}>{text}</TText>;
}

const styles = StyleSheet.create({
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary + "10", borderWidth: 2, borderColor: colors.primary + "30", alignItems: "center", justifyContent: "center" },
  avatarImg: { width: "100%", height: "100%", borderRadius: 50 },
  cameraBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: colors.accent, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 14, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.primary + "10", borderWidth: 1.5, borderColor: colors.primary + "30" },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  consent: { flexDirection: "row", gap: 10, marginTop: 24, alignItems: "flex-start" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.primary + "40", alignItems: "center", justifyContent: "center", marginTop: 2 },
});
