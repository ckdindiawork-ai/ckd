/**
 * Report Issue tab - multi-section form for creating a new civic issue.
 */
import React, { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, TText } from "@/src/components/ui";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { CATEGORIES, CITIES, colors, fonts, radius, spacing } from "@/src/theme";

export default function Report() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState(user?.city || "");
  const [area, setArea] = useState(user?.area || "");
  const [media, setMedia] = useState<{ url: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCity, setShowCity] = useState(false);

  const pickMedia = async (kind: "image" | "video") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("अनुमति चाहिए", "मीडिया चुनने के लिए अनुमति दें");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === "image" ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (!r.canceled && r.assets[0]) {
      setUploading(true);
      try {
        const res = await api.upload(r.assets[0].uri, kind);
        setMedia({ url: res.url, type: kind });
      } catch (e: any) {
        Alert.alert("अपलोड विफल", e.message);
      } finally {
        setUploading(false);
      }
    }
  };

  const submit = async () => {
    if (!title.trim() || !description.trim() || !category || !city || !area.trim()) {
      Alert.alert("अधूरी जानकारी", "कृपया सभी आवश्यक फ़ील्ड भरें");
      return;
    }
    setLoading(true);
    try {
      const r = await api.post("/issues", {
        title, description, city, area, category,
        media_url: media?.url || null,
        media_type: media?.type || null,
      });
      Alert.alert("समस्या दर्ज हुई!", "+5 क्रांति पॉइंट्स", [
        { text: "देखें", onPress: () => router.push(`/issues/${r.id}`) },
        { text: "ठीक है", onPress: () => { resetForm(); router.push("/(tabs)/home"); } },
      ]);
    } catch (e: any) {
      Alert.alert("त्रुटि", e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setCategory(""); setArea(user?.area || ""); setMedia(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ marginBottom: 16 }}>
            <TText weight="display" style={{ fontSize: 26 }}>समस्या दर्ज करें</TText>
            <TText style={{ color: colors.muted, fontSize: 13 }}>आपकी आवाज़ बदलाव की पहली ईंट है।</TText>
          </View>

          {/* Media picker */}
          <Pressable style={styles.mediaBox} onPress={() => pickMedia("image")} disabled={uploading} testID="report-media-picker">
            {media ? (
              <>
                <Image source={{ uri: media.url }} style={styles.mediaPreview} />
                <View style={styles.mediaReplace}>
                  <Ionicons name="refresh" size={14} color="#fff" />
                  <TText weight="bold" style={{ color: "#fff", fontSize: 12 }}>बदलें</TText>
                </View>
              </>
            ) : (
              <View style={{ alignItems: "center" }}>
                <View style={styles.mediaIcon}>
                  {uploading ? <Ionicons name="cloud-upload" size={28} color={colors.primary} /> : <Ionicons name="camera" size={28} color={colors.primary} />}
                </View>
                <TText weight="bold" style={{ color: colors.text, marginTop: 12 }}>{uploading ? "अपलोड हो रहा है..." : "फ़ोटो जोड़ें"}</TText>
                <TText style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>समस्या स्पष्ट दिखे ऐसी फ़ोटो</TText>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <Pressable style={styles.miniBtn} onPress={() => pickMedia("image")} testID="report-pick-photo">
                    <Ionicons name="image" size={14} color={colors.primary} />
                    <TText weight="bold" style={{ color: colors.primary, fontSize: 12 }}>फ़ोटो</TText>
                  </Pressable>
                  <Pressable style={styles.miniBtn} onPress={() => pickMedia("video")} testID="report-pick-video">
                    <Ionicons name="videocam" size={14} color={colors.primary} />
                    <TText weight="bold" style={{ color: colors.primary, fontSize: 12 }}>वीडियो</TText>
                  </Pressable>
                </View>
              </View>
            )}
          </Pressable>

          {/* Title */}
          <Label text="समस्या का शीर्षक *" />
          <TextInput value={title} onChangeText={setTitle} placeholder="जैसे: मेन रोड पर खतरनाक गड्ढा" placeholderTextColor={colors.muted} style={styles.input} testID="report-title-input" />

          {/* Category */}
          <Label text="श्रेणी *" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map((c) => (
              <Pressable key={c.value} style={[styles.catChip, category === c.value && styles.catChipActive]} onPress={() => setCategory(c.value)} testID={`report-cat-${c.value}`}>
                <Ionicons name={c.icon as any} size={14} color={category === c.value ? "#fff" : colors.primary} />
                <TText weight="bold" style={{ color: category === c.value ? "#fff" : colors.primary, fontSize: 13 }}>{c.label}</TText>
              </Pressable>
            ))}
          </View>

          {/* Description */}
          <Label text="विस्तार से बताइए *" />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="समस्या का पूरा विवरण..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            style={[styles.input, styles.textarea]}
            testID="report-desc-input"
          />

          {/* City */}
          <Label text="शहर *" />
          <Pressable style={styles.input} onPress={() => setShowCity(!showCity)} testID="report-city-picker">
            <TText style={{ color: city ? colors.text : colors.muted, fontSize: 15 }}>{city || "शहर चुनें"}</TText>
            <Ionicons name={showCity ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
          </Pressable>
          {showCity && (
            <Card style={{ padding: 0, marginTop: 4, maxHeight: 240 }}>
              <ScrollView>
                {CITIES.map((c) => (
                  <Pressable key={c} style={styles.option} onPress={() => { setCity(c); setShowCity(false); }}>
                    <TText weight={city === c ? "bold" : "regular"} style={{ color: city === c ? colors.primary : colors.text }}>{c}</TText>
                  </Pressable>
                ))}
              </ScrollView>
            </Card>
          )}

          {/* Area */}
          <Label text="इलाक़ा *" />
          <TextInput value={area} onChangeText={setArea} placeholder="जैसे: करोल बाग" placeholderTextColor={colors.muted} style={styles.input} testID="report-area-input" />

          <Button label="समस्या दर्ज करें" icon="send" onPress={submit} loading={loading} style={{ marginTop: 24 }} testID="report-submit-btn" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <TText weight="bold" style={{ marginTop: 18, marginBottom: 8, color: colors.text }}>{text}</TText>;
}

const styles = StyleSheet.create({
  mediaBox: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary + "20", borderStyle: "dashed", borderRadius: radius.lg, height: 200, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  mediaPreview: { width: "100%", height: "100%" },
  mediaReplace: { position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  mediaIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary + "10", alignItems: "center", justifyContent: "center" },
  miniBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.primary + "40" },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 14, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  textarea: { minHeight: 100, textAlignVertical: "top", paddingTop: 12 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: colors.primary + "30", backgroundColor: colors.surface },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  option: { padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
});
