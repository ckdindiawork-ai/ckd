/**
 * Report Issue tab - multi-section form for creating a new civic issue.
 * Validates field-by-field, shows toast on success/error, navigates to detail on success.
 */
import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Button, TText } from "@/src/components/ui";
import { LocationPicker, type LocationValue } from "@/src/components/LocationPicker";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useToast } from "@/src/components/Toast";
import { CATEGORIES, colors, fonts, radius, spacing } from "@/src/theme";

export default function Report() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState<LocationValue>({ state: "", city: user?.city || "", area: user?.area || "" });
  const [media, setMedia] = useState<{ url: string; type: string } | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickMedia = async (kind: "image" | "video") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return toast.error("मीडिया चुनने की अनुमति दें");
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === "image" ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (r.canceled || !r.assets[0]) return;

    setUploading(true);
    setUploadPct(0);
    try {
      const res = await api.upload(r.assets[0].uri, kind, (pct) => setUploadPct(pct));
      setMedia({ url: res.url, type: kind });
      toast.success(kind === "image" ? "फ़ोटो अपलोड हो गई" : "वीडियो अपलोड हो गया");
    } catch (e: any) {
      toast.error(e.message || "अपलोड विफल — दोबारा कोशिश करें");
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("शीर्षक भरें");
    if (!description.trim()) return toast.error("समस्या का विवरण भरें");
    if (!category) return toast.error("कोई एक श्रेणी चुनें");
    if (!location.state) return toast.error("राज्य चुनें");
    if (!location.city) return toast.error("शहर चुनें");
    if (!location.area.trim()) return toast.error("इलाक़ा भरें");

    setLoading(true);
    try {
      const r = await api.post("/issues", {
        title,
        description,
        city: location.city,
        area: location.area,
        category,
        media_url: media?.url || null,
        media_type: media?.type || null,
      });
      toast.success("आपकी समस्या दर्ज हो गई (+5 क्रांति पॉइंट्स)");
      resetForm();
      await refresh();
      router.push(`/issues/${r.id}`);
    } catch (e: any) {
      toast.error(e.message || "समस्या दर्ज नहीं हो सकी");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setLocation({ state: "", city: user?.city || "", area: user?.area || "" });
    setMedia(null);
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
          <Pressable style={styles.mediaBox} onPress={() => !uploading && pickMedia("image")} disabled={uploading} testID="report-media-picker">
            {media ? (
              <>
                <Image source={{ uri: media.url }} style={styles.mediaPreview} />
                <View style={styles.mediaReplace}>
                  <Ionicons name="refresh" size={14} color="#fff" />
                  <TText weight="bold" style={{ color: "#fff", fontSize: 12 }}>बदलें</TText>
                </View>
              </>
            ) : uploading ? (
              <View style={{ alignItems: "center", padding: 16 }}>
                <View style={styles.mediaIcon}>
                  <Ionicons name="cloud-upload" size={28} color={colors.primary} />
                </View>
                <TText weight="bold" style={{ color: colors.text, marginTop: 12 }}>अपलोड हो रहा है... {uploadPct}%</TText>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${uploadPct}%` }]} />
                </View>
              </View>
            ) : (
              <View style={{ alignItems: "center" }}>
                <View style={styles.mediaIcon}>
                  <Ionicons name="camera" size={28} color={colors.primary} />
                </View>
                <TText weight="bold" style={{ color: colors.text, marginTop: 12 }}>फ़ोटो या वीडियो जोड़ें</TText>
                <TText style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>समस्या स्पष्ट दिखे ऐसी मीडिया</TText>
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

          <Label text="समस्या का शीर्षक *" />
          <TextInput value={title} onChangeText={setTitle} placeholder="जैसे: मेन रोड पर खतरनाक गड्ढा" placeholderTextColor={colors.muted} style={styles.input} testID="report-title-input" />

          <Label text="श्रेणी *" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map((c) => (
              <Pressable key={c.value} style={[styles.catChip, category === c.value && styles.catChipActive]} onPress={() => setCategory(c.value)} testID={`report-cat-${c.value}`}>
                <Ionicons name={c.icon as any} size={14} color={category === c.value ? "#fff" : colors.primary} />
                <TText weight="bold" style={{ color: category === c.value ? "#fff" : colors.primary, fontSize: 13 }}>{c.label}</TText>
              </Pressable>
            ))}
          </View>

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

          <View style={{ marginTop: 18 }}>
            <LocationPicker value={location} onChange={setLocation} testIDPrefix="report-loc" />
          </View>

          <Button label="समस्या दर्ज करें" icon="send" onPress={submit} loading={loading} disabled={uploading} style={{ marginTop: 24 }} testID="report-submit-btn" />
          {uploading && <TText style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 8 }}>मीडिया अपलोड पूरा होने पर ही दर्ज करें</TText>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <TText weight="bold" style={{ marginTop: 18, marginBottom: 8, color: colors.text }}>{text}</TText>;
}

const styles = StyleSheet.create({
  mediaBox: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary + "20", borderStyle: "dashed", borderRadius: radius.lg, minHeight: 200, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  mediaPreview: { width: "100%", height: 220 },
  mediaReplace: { position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  mediaIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary + "10", alignItems: "center", justifyContent: "center" },
  miniBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.primary + "40" },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 14, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  textarea: { minHeight: 100, textAlignVertical: "top", paddingTop: 12 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: colors.primary + "30", backgroundColor: colors.surface },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  progressTrack: { width: 180, height: 6, borderRadius: 3, backgroundColor: colors.primary + "12", overflow: "hidden", marginTop: 10 },
  progressFill: { height: "100%", backgroundColor: colors.accent },
});
