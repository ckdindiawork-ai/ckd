/**
 * Profile setup screen - city/area/age + name/photo + consent.
 */
import React, { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Button, TText } from "@/src/components/ui";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { AGE_GROUPS, CITIES, colors, fonts, radius, spacing } from "@/src/theme";

export default function ProfileSetup() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [city, setCity] = useState(user?.city || "");
  const [area, setArea] = useState(user?.area || "");
  const [age, setAge] = useState(user?.age_group || "");
  const [photo, setPhoto] = useState(user?.photo_url || "");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCity, setShowCity] = useState(false);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("अनुमति चाहिए", "फ़ोटो चुनने के लिए गैलरी की अनुमति दें");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const r = await api.upload(result.assets[0].uri, "image");
        setPhoto(r.url);
      } catch (e: any) {
        Alert.alert("अपलोड विफल", e.message);
      }
    }
  };

  const submit = async () => {
    if (!name.trim() || !city || !area.trim() || !age) {
      Alert.alert("अधूरी जानकारी", "कृपया नाम, शहर, इलाक़ा और उम्र समूह भरें");
      return;
    }
    if (!consent) {
      Alert.alert("सहमति आवश्यक", "गोपनीयता नीति से सहमति दें");
      return;
    }
    setLoading(true);
    try {
      const u = await api.post("/auth/profile-setup", {
        name, email: email || null, city, area, age_group: age, photo_url: photo || null, consent: true,
      });
      updateUser(u);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("त्रुटि", e.message);
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
            <Pressable onPress={pickPhoto} style={styles.avatar} testID="profile-photo-picker">
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatarImg} />
              ) : (
                <Ionicons name="camera" size={28} color={colors.primary} />
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="add" size={14} color="#fff" />
              </View>
            </Pressable>
            <TText style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>फ़ोटो जोड़ें (वैकल्पिक)</TText>
          </View>

          <Label text="पूरा नाम *" />
          <Input value={name} onChangeText={setName} placeholder="जैसे: राहुल वर्मा" testID="profile-name-input" />

          <Label text="ईमेल (वैकल्पिक)" />
          <Input value={email} onChangeText={setEmail} placeholder="email@example.com" autoCapitalize="none" keyboardType="email-address" testID="profile-email-input" />

          <Label text="शहर *" />
          <Pressable style={styles.input} onPress={() => setShowCity(!showCity)} testID="profile-city-picker">
            <TText style={{ color: city ? colors.text : colors.muted, fontSize: 15 }}>{city || "शहर चुनें"}</TText>
            <Ionicons name={showCity ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
          </Pressable>
          {showCity && (
            <View style={styles.dropdown}>
              {CITIES.map((c) => (
                <Pressable key={c} style={styles.option} onPress={() => { setCity(c); setShowCity(false); }}>
                  <TText weight={city === c ? "bold" : "regular"} style={{ color: city === c ? colors.primary : colors.text }}>{c}</TText>
                </Pressable>
              ))}
            </View>
          )}

          <Label text="इलाक़ा / लोकेलिटी *" />
          <Input value={area} onChangeText={setArea} placeholder="जैसे: करोल बाग" testID="profile-area-input" />
          <TText style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>घर का पूरा पता न डालें — गोपनीयता के लिए केवल इलाक़ा पर्याप्त है।</TText>

          <Label text="उम्र समूह *" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {AGE_GROUPS.map((a) => (
              <Pressable
                key={a}
                onPress={() => setAge(a)}
                style={[styles.chip, age === a && styles.chipActive]}
                testID={`profile-age-${a}`}
              >
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
function Input(props: any) {
  return <TextInput {...props} placeholderTextColor={colors.muted} style={styles.input} />;
}

const styles = StyleSheet.create({
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary + "10", borderWidth: 2, borderColor: colors.primary + "30", alignItems: "center", justifyContent: "center" },
  avatarImg: { width: "100%", height: "100%", borderRadius: 50 },
  cameraBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: colors.accent, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdown: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, marginTop: 4, maxHeight: 240, overflow: "hidden" },
  option: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.primary + "10", borderWidth: 1.5, borderColor: colors.primary + "30" },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  consent: { flexDirection: "row", gap: 10, marginTop: 24, alignItems: "flex-start" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.primary + "40", alignItems: "center", justifyContent: "center", marginTop: 2 },
});
