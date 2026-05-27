/**
 * Edit Profile screen - allow user to update photo, name, email, location, age.
 * On save, AuthContext is updated and membership card refreshes automatically.
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

export default function EditProfile() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState<LocationValue>({ state: user?.state || "", city: user?.city || "", area: user?.area || "" });
  const [age, setAge] = useState(user?.age_group || "");
  const [photo, setPhoto] = useState(user?.photo_url || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return toast.error("गैलरी की अनुमति दें");
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

  const save = async () => {
    if (!name.trim()) return toast.error("कृपया नाम भरें");
    if (!location.state) return toast.error("राज्य चुनें");
    if (!location.city) return toast.error("शहर चुनें या टाइप करें");
    if (!location.area.trim()) return toast.error("इलाक़ा भरें");
    if (!age) return toast.error("उम्र समूह चुनें");

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
      toast.success("प्रोफ़ाइल अपडेट हो गई");
      router.back();
    } catch (e: any) {
      toast.error(e.message || "अपडेट नहीं हो सका");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>
        <TText weight="display" style={{ fontSize: 20 }}>प्रोफ़ाइल अपडेट</TText>
        <View style={{ width: 38 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <Pressable onPress={pickPhoto} style={styles.avatar} disabled={uploadingPhoto} testID="edit-photo">
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatarImg} />
              ) : (
                <Ionicons name={uploadingPhoto ? "cloud-upload" : "camera"} size={28} color={colors.primary} />
              )}
              <View style={styles.cameraBadge}><Ionicons name="add" size={14} color="#fff" /></View>
            </Pressable>
            <TText style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>{uploadingPhoto ? "अपलोड हो रही है..." : "फ़ोटो बदलें"}</TText>
          </View>

          <Label text="पूरा नाम *" />
          <TextInput value={name} onChangeText={setName} placeholder="नाम" placeholderTextColor={colors.muted} style={styles.input} testID="edit-name" />

          <Label text="ईमेल (बदला नहीं जा सकता)" />
          <TextInput value={user?.email || ""} editable={false} placeholderTextColor={colors.muted} style={[styles.input, { opacity: 0.6 }]} testID="edit-email" />

          <Label text="मोबाइल नंबर (वैकल्पिक)" />
          <TextInput value={phone} onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, "").slice(0, 10))} placeholder="10 अंक" placeholderTextColor={colors.muted} keyboardType="phone-pad" maxLength={10} style={styles.input} testID="edit-phone" />

          <View style={{ marginTop: 18 }}>
            <LocationPicker value={location} onChange={setLocation} testIDPrefix="edit-loc" />
          </View>

          <Label text="उम्र समूह *" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {AGE_GROUPS.map((a) => (
              <Pressable key={a} onPress={() => setAge(a)} style={[styles.chip, age === a && styles.chipActive]} testID={`edit-age-${a}`}>
                <TText weight="bold" style={{ color: age === a ? "#fff" : colors.primary, fontSize: 13 }}>{a}</TText>
              </Pressable>
            ))}
          </View>

          <Button label="बदलाव सेव करें" icon="checkmark-circle" loading={loading} onPress={save} style={{ marginTop: 28 }} testID="edit-save" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <TText weight="bold" style={{ marginTop: 18, marginBottom: 8, color: colors.text }}>{text}</TText>;
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary + "10", borderWidth: 2, borderColor: colors.primary + "30", alignItems: "center", justifyContent: "center" },
  avatarImg: { width: "100%", height: "100%", borderRadius: 50 },
  cameraBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: colors.accent, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 14, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.primary + "10", borderWidth: 1.5, borderColor: colors.primary + "30" },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
