/**
 * Campaign detail screen - cover, info, join button, updates feed with likes/comments.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Pill, TText } from "@/src/components/ui";
import { VideoPlayer } from "@/src/components/VideoPlayer";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useToast } from "@/src/components/Toast";
import { shareCampaign } from "@/src/utils/share";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { formatDate, timeAgo } from "@/src/utils/format";

export default function CampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [c, setC] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [joining, setJoining] = useState(false);
  const [newText, setNewText] = useState("");
  const [media, setMedia] = useState<{ url: string; type: string } | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [posting, setPosting] = useState(false);
  const [openCmt, setOpenCmt] = useState<string | null>(null);
  const [cmtText, setCmtText] = useState("");

  const onShare = async () => {
    if (!c) return;
    const res = await shareCampaign(c);
    if (res.ok && res.mode === "clipboard") toast.success("लिंक कॉपी हो गया");
    else if (!res.ok && res.mode === "error") toast.error("शेयर नहीं हो सका");
  };

  const load = useCallback(async () => {
    const camp = await api.get(`/campaigns/${id}`);
    setC(camp);
    const ups = await api.get(`/campaigns/${id}/updates`);
    setUpdates(ups);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const join = async () => {
    if (!c) return;
    setJoining(true);
    try {
      await api.post(`/campaigns/${id}/join`);
      await load();
      toast.success("अभियान से जुड़ गए! +10 क्रांति पॉइंट्स");
    } catch (e: any) { toast.error(e.message || "जुड़ नहीं सके"); } finally { setJoining(false); }
  };

  const pick = async (kind: "image" | "video" = "image") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return toast.error("गैलरी अनुमति चाहिए");
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === "image" ? ["images"] : ["videos"],
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (r.canceled || !r.assets[0]) return;
    setUploadingMedia(true);
    setUploadPct(0);
    try {
      const u = await api.upload(r.assets[0].uri, kind, (p) => setUploadPct(p));
      setMedia({ url: u.url, type: kind });
      toast.success(kind === "image" ? "फ़ोटो अपलोड हो गई" : "वीडियो अपलोड हो गया");
    } catch (e: any) {
      toast.error(e.message || (kind === "image" ? "फ़ोटो अपलोड नहीं हो पाई" : "वीडियो अपलोड नहीं हो पाया"));
    } finally {
      setUploadingMedia(false);
    }
  };

  const postUpdate = async () => {
    if (!newText.trim() && !media) return toast.error("टेक्स्ट या फ़ोटो जोड़ें");
    setPosting(true);
    try {
      await api.post(`/campaigns/${id}/updates`, { text: newText, media_url: media?.url, media_type: media?.type });
      setNewText(""); setMedia(null);
      await load();
      toast.success("अपडेट पोस्ट हो गया! +5 पॉइंट्स");
    } catch (e: any) { toast.error(e.message || "पोस्ट विफल"); } finally { setPosting(false); }
  };

  const like = async (uid: string) => {
    setUpdates((arr) => arr.map((u) => u.id === uid ? { ...u, _liked: !u._liked, like_count: u.like_count + (u._liked ? -1 : 1) } : u));
    try { await api.post(`/updates/${uid}/like`); } catch {}
  };

  const submitComment = async (uid: string) => {
    if (!cmtText.trim()) return;
    try {
      await api.post(`/updates/${uid}/comments`, { text: cmtText });
      setCmtText(""); setOpenCmt(null);
      await load();
    } catch {}
  };

  const flag = async (uid: string) => {
    Alert.alert("रिपोर्ट करें", "क्या आप इस पोस्ट को रिपोर्ट करना चाहते हैं?", [
      { text: "रद्द", style: "cancel" },
      { text: "रिपोर्ट", style: "destructive", onPress: async () => {
        try { await api.post("/flags", { content_type: "update", content_id: uid, reason: "अनुपयुक्त सामग्री" }); Alert.alert("धन्यवाद", "हमारी एडमिन टीम जाँच करेगी।"); } catch {}
      } },
    ]);
  };

  if (!c) return null;
  const isJoined = c.members?.includes(user?.id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView>
          <View style={styles.hero}>
            {c.cover_url && <Image source={{ uri: c.cover_url }} style={styles.coverImage} />}
            <LinearGradient colors={["rgba(0,0,0,0.5)", "transparent", "rgba(0,0,0,0.7)"]} style={StyleSheet.absoluteFill} />
            <SafeAreaView edges={["top"]} style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
              <Pressable onPress={() => router.back()} style={styles.back} testID="campaign-back">
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </Pressable>
            </SafeAreaView>
            <View style={styles.heroBottom}>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                <Pill label={c.location} icon="location" bg="rgba(255,255,255,0.2)" color="#fff" />
                <Pill label={formatDate(c.date)} icon="calendar" bg="rgba(255,255,255,0.2)" color="#fff" />
              </View>
              <TText weight="display" style={{ color: "#fff", fontSize: 26, marginTop: 8 }}>{c.title}</TText>
            </View>
          </View>

          <View style={{ padding: spacing.lg }}>
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={styles.metaIcon}><Ionicons name="people" size={18} color={colors.primary} /></View>
                  <View>
                    <TText weight="display" style={{ fontSize: 20 }}>{c.member_count}</TText>
                    <TText style={{ color: colors.muted, fontSize: 12 }}>सदस्य जुड़े</TText>
                  </View>
                </View>
                {c.goal && (
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <TText style={{ color: colors.muted, fontSize: 11 }}>लक्ष्य</TText>
                    <TText weight="bold" style={{ fontSize: 13 }}>{c.goal}</TText>
                  </View>
                )}
              </View>
            </Card>

            <TText weight="display" style={{ fontSize: 18, marginTop: 20 }}>विवरण</TText>
            <TText style={{ color: colors.text, marginTop: 8, lineHeight: 22, fontSize: 14 }}>{c.description}</TText>

            {!isJoined ? (
              <Button label="अभियान से जुड़ें" icon="checkmark-circle" loading={joining} onPress={join} style={{ marginTop: 24 }} testID="campaign-join-btn" />
            ) : (
              <View style={styles.joinedBanner}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <TText weight="bold" style={{ color: colors.success }}>आप इस अभियान के सदस्य हैं</TText>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable style={styles.shareBig} onPress={onShare} testID="campaign-share-large">
                <Ionicons name="share-social" size={18} color={colors.primary} />
                <TText weight="bold" style={{ color: colors.primary }}>शेयर करें</TText>
              </Pressable>
            </View>

            {/* Update composer (members only) */}
            {isJoined && (
              <Card style={{ marginTop: 20 }}>
                <TText weight="bold" style={{ fontSize: 15 }}>अपना अपडेट साझा करें</TText>
                <TextInput
                  value={newText}
                  onChangeText={setNewText}
                  placeholder="आज क्या किया? तस्वीर के साथ बताइए..."
                  placeholderTextColor={colors.muted}
                  multiline
                  style={styles.composer}
                  testID="campaign-update-input"
                />
                {media && (
                  <View style={{ marginTop: 8 }}>
                    {media.type === "video" ? (
                      <VideoPlayer uri={media.url} height={180} />
                    ) : (
                      <Image source={{ uri: media.url }} style={{ width: "100%", height: 180, borderRadius: 12 }} />
                    )}
                    <Pressable onPress={() => setMedia(null)} style={styles.removeMedia}>
                      <Ionicons name="close" size={14} color="#fff" />
                    </Pressable>
                  </View>
                )}
                {uploadingMedia && (
                  <View style={{ marginTop: 8 }}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${uploadPct}%` }]} />
                    </View>
                    <TText style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>अपलोड {uploadPct}%</TText>
                  </View>
                )}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                    <Pressable onPress={() => pick("image")} disabled={uploadingMedia} style={{ flexDirection: "row", alignItems: "center", gap: 6, opacity: uploadingMedia ? 0.6 : 1 }} testID="campaign-update-pick">
                      <Ionicons name="image" size={18} color={colors.primary} />
                      <TText weight="bold" style={{ color: colors.primary, fontSize: 13 }}>फ़ोटो</TText>
                    </Pressable>
                    <Pressable onPress={() => pick("video")} disabled={uploadingMedia} style={{ flexDirection: "row", alignItems: "center", gap: 6, opacity: uploadingMedia ? 0.6 : 1 }} testID="campaign-update-pick-video">
                      <Ionicons name="videocam" size={18} color={colors.primary} />
                      <TText weight="bold" style={{ color: colors.primary, fontSize: 13 }}>{uploadingMedia ? "अपलोड..." : "वीडियो"}</TText>
                    </Pressable>
                  </View>
                  <Button label="पोस्ट करें" icon="send" onPress={postUpdate} loading={posting} disabled={uploadingMedia} style={{ paddingVertical: 10, paddingHorizontal: 14 }} testID="campaign-update-submit" />
                </View>
              </Card>
            )}

            <TText weight="display" style={{ fontSize: 18, marginTop: 24, marginBottom: 12 }}>अभियान की ख़बरें ({updates.length})</TText>
            {updates.map((u) => (
              <Card key={u.id} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={styles.avatar}>
                    {u.user?.photo_url ? <Image source={{ uri: u.user.photo_url }} style={{ width: "100%", height: "100%", borderRadius: 20 }} /> : <TText weight="bold" style={{ color: colors.primary }}>{u.user?.name?.[0] || "?"}</TText>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <TText weight="bold" style={{ fontSize: 14 }}>{u.user?.name || "सदस्य"}</TText>
                    <TText style={{ color: colors.muted, fontSize: 11 }}>{timeAgo(u.created_at)}</TText>
                  </View>
                  <Pressable onPress={() => flag(u.id)} testID={`update-flag-${u.id}`}>
                    <Ionicons name="flag-outline" size={16} color={colors.muted} />
                  </Pressable>
                </View>
                <TText style={{ marginTop: 10, lineHeight: 21, fontSize: 14 }}>{u.text}</TText>
                {u.media_url && (
                  u.media_type === "video" ? (
                    <View style={{ marginTop: 10 }}><VideoPlayer uri={u.media_url} height={200} /></View>
                  ) : (
                    <Image source={{ uri: u.media_url }} style={{ width: "100%", height: 200, borderRadius: 12, marginTop: 10 }} />
                  )
                )}
                <View style={{ flexDirection: "row", gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Pressable onPress={() => like(u.id)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }} testID={`update-like-${u.id}`}>
                    <Ionicons name={u._liked ? "heart" : "heart-outline"} size={18} color={u._liked ? colors.energy : colors.muted} />
                    <TText weight="bold" style={{ color: u._liked ? colors.energy : colors.muted, fontSize: 13 }}>{u.like_count}</TText>
                  </Pressable>
                  <Pressable onPress={() => setOpenCmt(openCmt === u.id ? null : u.id)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.muted} />
                    <TText weight="bold" style={{ color: colors.muted, fontSize: 13 }}>{u.comment_count}</TText>
                  </Pressable>
                </View>
                {openCmt === u.id && (
                  <View style={{ marginTop: 10 }}>
                    {(u.comments || []).map((cm: any) => (
                      <View key={cm.id} style={styles.commentItem}>
                        <TText weight="bold" style={{ fontSize: 12, color: colors.primary }}>{cm.user_name}</TText>
                        <TText style={{ fontSize: 13, marginTop: 2 }}>{cm.text}</TText>
                      </View>
                    ))}
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <TextInput value={cmtText} onChangeText={setCmtText} placeholder="टिप्पणी लिखें..." placeholderTextColor={colors.muted} style={styles.cmtInput} />
                      <Pressable onPress={() => submitComment(u.id)} style={styles.cmtSend} testID={`comment-send-${u.id}`}>
                        <Ionicons name="send" size={16} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                )}
              </Card>
            ))}
            {updates.length === 0 && <TText style={{ color: colors.muted, textAlign: "center", padding: 20 }}>अभी कोई अपडेट नहीं। पहला अपडेट साझा करें!</TText>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { height: 280, backgroundColor: colors.primary, position: "relative" },
  coverImage: { width: "100%", height: "100%" },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", margin: 16 },
  heroBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.lg },
  metaIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center" },
  joinedBanner: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", padding: 14, backgroundColor: colors.success + "12", borderRadius: 12, marginTop: 24 },
  composer: { marginTop: 10, fontFamily: fonts.body, fontSize: 14, color: colors.text, minHeight: 60, textAlignVertical: "top" },
  removeMedia: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center" },
  commentItem: { backgroundColor: colors.bg, padding: 10, borderRadius: 10, marginTop: 6 },
  cmtInput: { flex: 1, backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, fontFamily: fonts.body, color: colors.text },
  cmtSend: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  shareBig: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary + "40", backgroundColor: colors.primary + "08" },
  progressTrack: { width: "100%", height: 6, borderRadius: 3, backgroundColor: colors.primary + "12", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.accent },
});
