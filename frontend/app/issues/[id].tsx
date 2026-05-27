/**
 * Issue detail screen - shows full report, status, helpers, comments, timeline.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Pill, StatusBadge, TText } from "@/src/components/ui";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { getCategory, timeAgo } from "@/src/utils/format";

export default function IssueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [issue, setIssue] = useState<any>(null);
  const [cmtText, setCmtText] = useState("");
  const [supLoading, setSupLoading] = useState(false);
  const [volLoading, setVolLoading] = useState(false);

  const load = useCallback(async () => {
    const i = await api.get(`/issues/${id}`);
    setIssue(i);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const support = async () => {
    setSupLoading(true);
    try { await api.post(`/issues/${id}/support`); await load(); } catch {} finally { setSupLoading(false); }
  };

  const volunteer = async () => {
    setVolLoading(true);
    try { await api.post(`/issues/${id}/volunteer`); await load(); Alert.alert("धन्यवाद!", "+8 क्रांति पॉइंट्स"); } catch (e: any) { Alert.alert("त्रुटि", e.message); } finally { setVolLoading(false); }
  };

  const comment = async () => {
    if (!cmtText.trim()) return;
    try { await api.post(`/issues/${id}/comments`, { text: cmtText }); setCmtText(""); await load(); } catch {}
  };

  const setStatus = async (status: "open" | "in_progress" | "resolved") => {
    try { await api.put(`/issues/${id}/status`, { status }); await load(); } catch (e: any) { Alert.alert("त्रुटि", e.message); }
  };

  const flag = () => {
    Alert.alert("रिपोर्ट करें", "इस पोस्ट को रिपोर्ट करें?", [
      { text: "रद्द", style: "cancel" },
      { text: "रिपोर्ट", style: "destructive", onPress: async () => {
        try { await api.post("/flags", { content_type: "issue", content_id: id, reason: "अनुपयुक्त सामग्री" }); Alert.alert("धन्यवाद", "टीम जाँच करेगी"); } catch {}
      } },
    ]);
  };

  if (!issue) return null;
  const cat = getCategory(issue.category);
  const isSupporter = issue.supporters?.includes(user?.id);
  const isHelper = issue.helpers?.includes(user?.id);
  const isReporter = issue.reported_by === user?.id;
  const canStatus = isReporter || user?.role === "admin";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <LinearGradient colors={[colors.primary, "#1f0d4a"]} style={styles.hdr}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.hdrRow}>
            <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color="#fff" /></Pressable>
            <TText weight="display" style={{ color: "#fff", fontSize: 18 }}>समस्या विवरण</TText>
            <Pressable onPress={flag} testID="issue-flag"><Ionicons name="flag-outline" size={20} color="#fff" /></Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Pill label={cat.label} icon={cat.icon as any} />
              <StatusBadge status={issue.status} />
            </View>
            <TText weight="display" style={{ fontSize: 22 }}>{issue.title}</TText>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
              <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}><Ionicons name="location" size={12} color={colors.muted} /><TText style={{ color: colors.muted, fontSize: 12 }}>{issue.area}, {issue.city}</TText></View>
              <TText style={{ color: colors.muted, fontSize: 12 }}>•</TText>
              <TText style={{ color: colors.muted, fontSize: 12 }}>{timeAgo(issue.created_at)}</TText>
            </View>
            {issue.media_url && <Image source={{ uri: issue.media_url }} style={{ width: "100%", height: 220, borderRadius: 12, marginTop: 12 }} />}
            <TText style={{ marginTop: 12, lineHeight: 22, fontSize: 14 }}>{issue.description}</TText>
            <View style={styles.reporterRow}>
              <View style={styles.avatar}>
                {issue.reporter?.photo_url ? <Image source={{ uri: issue.reporter.photo_url }} style={{ width: "100%", height: "100%", borderRadius: 18 }} /> : <TText weight="bold" style={{ color: colors.primary }}>{issue.reporter?.name?.[0] || "?"}</TText>}
              </View>
              <View>
                <TText weight="bold" style={{ fontSize: 13 }}>{issue.reporter?.name || "सदस्य"}</TText>
                <TText style={{ color: colors.muted, fontSize: 11 }}>रिपोर्टर</TText>
              </View>
            </View>
          </Card>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Pressable style={[styles.actionBtn, isSupporter && { backgroundColor: colors.energy + "12", borderColor: colors.energy }]} onPress={support} disabled={supLoading} testID="issue-support-btn">
              <Ionicons name={isSupporter ? "heart" : "heart-outline"} size={18} color={isSupporter ? colors.energy : colors.text} />
              <TText weight="bold" style={{ fontSize: 13, color: isSupporter ? colors.energy : colors.text }}>{issue.supporters?.length || 0} समर्थन</TText>
            </Pressable>
            <Pressable style={[styles.actionBtn, isHelper && { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={volunteer} disabled={volLoading || isHelper} testID="issue-volunteer-btn">
              <Ionicons name="hand-left" size={18} color={isHelper ? colors.text : colors.primary} />
              <TText weight="bold" style={{ fontSize: 13, color: isHelper ? colors.text : colors.primary }}>{isHelper ? "मदद कर रहा हूँ" : "मैं मदद करूँगा"}</TText>
            </Pressable>
          </View>

          {canStatus && issue.status !== "resolved" && (
            <Card style={{ marginTop: 16 }}>
              <TText weight="bold" style={{ marginBottom: 8 }}>स्थिति बदलें</TText>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {issue.status !== "in_progress" && <Pressable style={styles.statusBtn} onPress={() => setStatus("in_progress")} testID="issue-status-progress"><TText weight="bold" style={{ color: colors.primary, fontSize: 12 }}>काम चालू</TText></Pressable>}
                <Pressable style={[styles.statusBtn, { backgroundColor: colors.success, borderColor: colors.success }]} onPress={() => setStatus("resolved")} testID="issue-status-resolved"><TText weight="bold" style={{ color: "#fff", fontSize: 12 }}>हल हो गई</TText></Pressable>
              </View>
            </Card>
          )}

          {issue.helpers_list && issue.helpers_list.length > 0 && (
            <Card style={{ marginTop: 16 }}>
              <TText weight="bold" style={{ marginBottom: 8 }}>मदद करने वाले ({issue.helpers_list.length})</TText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {issue.helpers_list.map((h: any) => (
                  <View key={h.id} style={styles.helperChip}>
                    <View style={styles.helperAvatar}>{h.photo_url ? <Image source={{ uri: h.photo_url }} style={{ width: "100%", height: "100%", borderRadius: 12 }} /> : <TText weight="bold" style={{ fontSize: 11, color: colors.primary }}>{h.name?.[0]}</TText>}</View>
                    <TText weight="bold" style={{ fontSize: 12 }}>{h.name}</TText>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Timeline */}
          <TText weight="display" style={{ fontSize: 18, marginTop: 20, marginBottom: 12 }}>प्रगति</TText>
          {(issue.timeline || []).map((e: any, idx: number) => (
            <View key={idx} style={styles.tlRow}>
              <View style={styles.tlDot} />
              <View style={{ flex: 1, paddingBottom: 16 }}>
                <TText weight="bold" style={{ fontSize: 13 }}>{e.text}</TText>
                <TText style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{e.user_name} • {timeAgo(e.created_at)}</TText>
                {e.media_url && <Image source={{ uri: e.media_url }} style={{ width: "100%", height: 180, borderRadius: 10, marginTop: 8 }} />}
              </View>
            </View>
          ))}

          {/* Comments */}
          <TText weight="display" style={{ fontSize: 18, marginTop: 12, marginBottom: 12 }}>टिप्पणियाँ ({issue.comments?.length || 0})</TText>
          {(issue.comments || []).map((cm: any) => (
            <Card key={cm.id} style={{ marginBottom: 8, padding: 12 }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <View style={styles.avatar}>{cm.user_photo ? <Image source={{ uri: cm.user_photo }} style={{ width: "100%", height: "100%", borderRadius: 18 }} /> : <TText weight="bold" style={{ color: colors.primary }}>{cm.user_name?.[0]}</TText>}</View>
                <View style={{ flex: 1 }}>
                  <TText weight="bold" style={{ fontSize: 13 }}>{cm.user_name}</TText>
                  <TText style={{ color: colors.muted, fontSize: 10 }}>{timeAgo(cm.created_at)}</TText>
                </View>
              </View>
              <TText style={{ fontSize: 14, marginTop: 8 }}>{cm.text}</TText>
            </Card>
          ))}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TextInput value={cmtText} onChangeText={setCmtText} placeholder="टिप्पणी लिखें..." placeholderTextColor={colors.muted} style={styles.cmtInput} testID="issue-comment-input" />
            <Pressable onPress={comment} style={styles.cmtSend} testID="issue-comment-send"><Ionicons name="send" size={16} color="#fff" /></Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hdr: { paddingBottom: 12 },
  hdrRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  reporterRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface },
  helperChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary + "08", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  helperAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary + "20", alignItems: "center", justifyContent: "center" },
  tlRow: { flexDirection: "row", gap: 12 },
  tlDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginTop: 4, borderWidth: 2, borderColor: colors.primary },
  cmtInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fonts.body, color: colors.text, borderWidth: 1, borderColor: colors.border },
  cmtSend: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
