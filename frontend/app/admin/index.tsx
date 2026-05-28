/**
 * Admin panel - unified dashboard with stats, members, campaigns, moderation, announcements.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Pill, StatusBadge, TText } from "@/src/components/ui";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { CITIES, colors, fonts, radius, spacing } from "@/src/theme";
import { timeAgo } from "@/src/utils/format";

type Tab = "dashboard" | "members" | "campaigns" | "moderation" | "announcements";

export default function Admin() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [editingAnnounce, setEditingAnnounce] = useState<any>(null);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/(tabs)/home");
  }, [user, router]);

  const load = useCallback(async () => {
    try {
      if (tab === "dashboard") setStats(await api.get("/admin/dashboard"));
      else if (tab === "members") setMembers(await api.get(`/admin/members${search ? `?q=${encodeURIComponent(search)}` : ""}`));
      else if (tab === "moderation") setFlags(await api.get("/admin/flags"));
      else if (tab === "campaigns") setCampaigns(await api.get("/campaigns"));
      else if (tab === "announcements") setAnnouncements(await api.get("/admin/announcements"));
    } catch (e: any) { Alert.alert("त्रुटि", e.message); }
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const banMember = async (m: any) => {
    Alert.alert("बैन?", `${m.name} को बैन करें?`, [
      { text: "रद्द", style: "cancel" },
      { text: "बैन", style: "destructive", onPress: async () => { await api.post(`/admin/members/${m.id}/ban`); await load(); } },
    ]);
  };
  const unbanMember = async (m: any) => { await api.post(`/admin/members/${m.id}/unban`); await load(); };
  const removeMember = async (m: any) => {
    Alert.alert("हटाएँ?", `${m.name} को हमेशा के लिए हटाएँ?`, [
      { text: "रद्द", style: "cancel" },
      { text: "हटाएँ", style: "destructive", onPress: async () => { await api.del(`/admin/members/${m.id}`); await load(); } },
    ]);
  };

  const resolveFlag = async (f: any, remove: boolean) => {
    await api.post(`/admin/flags/${f.id}/resolve?remove_content=${remove}`);
    await load();
  };

  const deleteCampaign = async (c: any) => {
    Alert.alert("बंद करें?", `अभियान "${c.title}" बंद करें?`, [
      { text: "रद्द", style: "cancel" },
      { text: "बंद", style: "destructive", onPress: async () => { await api.del(`/campaigns/${c.id}`); await load(); } },
    ]);
  };

  if (!user || user.role !== "admin") return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <LinearGradient colors={[colors.primary, "#1f0d4a"]} style={styles.hdr}>
        <View style={styles.hdrRow}>
          <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color="#fff" /></Pressable>
          <View>
            <TText weight="display" style={{ color: "#fff", fontSize: 20 }}>एडमिन पैनल</TText>
            <TText style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>आंदोलन का नियंत्रण</TText>
          </View>
        </View>
      </LinearGradient>

      <View style={{ backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: 10, alignItems: "center", gap: 6 }}
        >
          {[
            { k: "dashboard", l: "डैशबोर्ड", i: "stats-chart" },
            { k: "members", l: "सदस्य", i: "people" },
            { k: "campaigns", l: "अभियान", i: "megaphone" },
            { k: "moderation", l: "रिपोर्ट", i: "flag" },
            { k: "announcements", l: "घोषणा", i: "notifications" },
          ].map((t) => (
            <Pressable key={t.k} onPress={() => setTab(t.k as Tab)} style={[styles.tabPill, tab === t.k && styles.tabPillActive]} testID={`admin-tab-${t.k}`}>
              <Ionicons name={t.i as any} size={13} color={tab === t.k ? "#fff" : colors.primary} />
              <TText weight="bold" style={{ color: tab === t.k ? "#fff" : colors.primary, fontSize: 12, includeFontPadding: false }}>{t.l}</TText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: 12 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {tab === "dashboard" && stats && (
          <>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <StatCard icon="people" label="कुल सदस्य" value={stats.total_members} color={colors.primary} />
              <StatCard icon="megaphone" label="सक्रिय अभियान" value={stats.active_campaigns} color={colors.accent} />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <StatCard icon="alert-circle" label="खुली समस्या" value={stats.issues.open} color={colors.energy} />
              <StatCard icon="construct" label="काम चालू" value={stats.issues.in_progress} color={colors.primary} />
              <StatCard icon="checkmark-done" label="हल हुई" value={stats.issues.resolved} color={colors.success} />
            </View>
            {stats.pending_flags > 0 && (
              <Pressable onPress={() => setTab("moderation")}>
                <Card style={{ backgroundColor: colors.energy + "12", borderColor: colors.energy + "40", borderWidth: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Ionicons name="warning" size={24} color={colors.energy} />
                    <View style={{ flex: 1 }}>
                      <TText weight="bold" style={{ color: colors.energy }}>{stats.pending_flags} रिपोर्ट लंबित</TText>
                      <TText style={{ fontSize: 12, color: colors.muted }}>तुरंत जाँचें</TText>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color={colors.energy} />
                  </View>
                </Card>
              </Pressable>
            )}
            <Card>
              <TText weight="display" style={{ fontSize: 16, marginBottom: 12 }}>शहर के अनुसार सदस्य</TText>
              {stats.members_by_city.slice(0, 6).map((x: any) => {
                const max = stats.members_by_city[0]?.count || 1;
                return (
                  <View key={x.city} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <TText weight="bold" style={{ fontSize: 13 }}>{x.city}</TText>
                      <TText weight="bold" style={{ color: colors.primary, fontSize: 13 }}>{x.count}</TText>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${(x.count / max) * 100}%` }]} />
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {tab === "members" && (
          <>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={colors.muted} />
              <TextInput value={search} onChangeText={setSearch} placeholder="नाम, मोबाइल या शहर..." placeholderTextColor={colors.muted} style={{ flex: 1, fontFamily: fonts.bodyMedium, color: colors.text, paddingVertical: 8 }} testID="admin-search-members" />
            </View>
            {members.map((m) => (
              <Card key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={styles.mAvatar}>{m.photo_url ? <Image source={{ uri: m.photo_url }} style={{ width: "100%", height: "100%", borderRadius: 22 }} /> : <TText weight="bold" style={{ color: colors.primary }}>{(m.name?.[0] || m.email?.[0] || "?").toUpperCase()}</TText>}</View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    <TText weight="bold" style={{ fontSize: 14 }}>{m.name || "—"}</TText>
                    {m.role === "admin" && <Pill label="एडमिन" icon="shield-checkmark" bg={colors.accent + "30"} color="#7a5a00" />}
                    {m.is_banned && <Pill label="बैन" bg={colors.energy} color="#fff" />}
                  </View>
                  <TText style={{ color: colors.muted, fontSize: 12 }}>{m.email} {m.phone ? `• ${m.phone}` : ""} • {m.city || "—"}</TText>
                  <TText style={{ color: colors.primary, fontSize: 11, marginTop: 2 }}>🔥 {m.kranti_points} पॉइंट्स</TText>
                </View>
                {m.role !== "admin" && (
                  <View style={{ gap: 6 }}>
                    {m.is_banned ? (
                      <Pressable onPress={() => unbanMember(m)} style={styles.miniAct} testID={`admin-unban-${m.id}`}><Ionicons name="checkmark" size={14} color={colors.success} /></Pressable>
                    ) : (
                      <Pressable onPress={() => banMember(m)} style={styles.miniAct} testID={`admin-ban-${m.id}`}><Ionicons name="ban" size={14} color={colors.energy} /></Pressable>
                    )}
                    <Pressable onPress={() => removeMember(m)} style={styles.miniAct} testID={`admin-remove-${m.id}`}><Ionicons name="trash" size={14} color={colors.muted} /></Pressable>
                  </View>
                )}
              </Card>
            ))}
          </>
        )}

        {tab === "campaigns" && (
          <>
            <Button label="नया अभियान बनाएँ" icon="add-circle" onPress={() => { setEditing(null); setShowCampaignModal(true); }} testID="admin-new-campaign" />
            {campaigns.map((c) => (
              <Card key={c.id}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {c.cover_url && <Image source={{ uri: c.cover_url }} style={{ width: 60, height: 60, borderRadius: 10 }} />}
                  <View style={{ flex: 1 }}>
                    <TText weight="bold" numberOfLines={2}>{c.title}</TText>
                    <TText style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{c.location} • {c.member_count} सदस्य</TText>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <Pressable style={styles.miniBtn} onPress={() => { setEditing(c); setShowCampaignModal(true); }}><Ionicons name="create" size={14} color={colors.primary} /><TText weight="bold" style={{ color: colors.primary, fontSize: 12 }}>संपादित</TText></Pressable>
                  <Pressable style={[styles.miniBtn, { borderColor: colors.energy }]} onPress={() => deleteCampaign(c)}><Ionicons name="trash" size={14} color={colors.energy} /><TText weight="bold" style={{ color: colors.energy, fontSize: 12 }}>बंद करें</TText></Pressable>
                </View>
              </Card>
            ))}
          </>
        )}

        {tab === "moderation" && (
          <>
            {flags.length === 0 && <Card><TText style={{ textAlign: "center", color: colors.muted }}>कोई लंबित रिपोर्ट नहीं</TText></Card>}
            {flags.map((f) => (
              <Card key={f.id}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Pill label={f.content_type} icon="flag" />
                  <Pill label={f.status === "pending" ? "लंबित" : "हल"} bg={f.status === "pending" ? colors.energy + "20" : colors.success + "20"} color={f.status === "pending" ? colors.energy : colors.success} />
                </View>
                {f.content && (
                  <View style={{ marginTop: 10, padding: 10, backgroundColor: colors.bg, borderRadius: 10 }}>
                    {f.content.title && <TText weight="bold" style={{ fontSize: 13 }}>{f.content.title}</TText>}
                    <TText style={{ fontSize: 12, color: colors.muted, marginTop: 4 }} numberOfLines={3}>{f.content.description || f.content.text}</TText>
                  </View>
                )}
                <TText style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>कारण: {f.reason} • {timeAgo(f.created_at)}</TText>
                {f.status === "pending" && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <Pressable style={[styles.miniBtn, { borderColor: colors.energy, backgroundColor: colors.energy + "10" }]} onPress={() => resolveFlag(f, true)} testID={`admin-flag-remove-${f.id}`}><Ionicons name="trash" size={14} color={colors.energy} /><TText weight="bold" style={{ color: colors.energy, fontSize: 12 }}>हटाएँ</TText></Pressable>
                    <Pressable style={styles.miniBtn} onPress={() => resolveFlag(f, false)} testID={`admin-flag-dismiss-${f.id}`}><Ionicons name="checkmark" size={14} color={colors.primary} /><TText weight="bold" style={{ color: colors.primary, fontSize: 12 }}>ठीक है</TText></Pressable>
                  </View>
                )}
              </Card>
            ))}
          </>
        )}

        {tab === "announcements" && (
          <View>
            <Button label="नई घोषणा भेजें" icon="megaphone" onPress={() => { setEditingAnnounce(null); setShowAnnounceModal(true); }} testID="admin-new-announce" />
            <TText style={{ color: colors.muted, fontSize: 12, marginTop: 12, textAlign: "center" }}>घोषणा सभी सदस्यों या चुने हुए शहर में पहुँचेगी।</TText>

            <TText weight="bold" style={{ color: colors.text, marginTop: 22, marginBottom: 10, fontSize: 14 }}>पुरानी घोषणाएँ ({announcements.length})</TText>
            {announcements.length === 0 ? (
              <TText style={{ color: colors.muted, textAlign: "center", paddingVertical: 24, fontSize: 13 }}>अभी कोई घोषणा नहीं।</TText>
            ) : announcements.map((a) => (
              <Card key={a.id} style={{ padding: 12, marginBottom: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <TText weight="bold" style={{ color: colors.text, fontSize: 14 }}>{a.title}</TText>
                    <TText style={{ color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 18 }} numberOfLines={3}>{a.body}</TText>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 6, alignItems: "center" }}>
                      {a?.meta?.city ? <Pill label={a.meta.city} /> : <Pill label="सबको" />}
                      <TText style={{ color: colors.muted, fontSize: 11 }}>• {timeAgo(a.created_at)}</TText>
                    </View>
                  </View>
                  <View style={{ flexDirection: "column", gap: 8, alignItems: "stretch" }}>
                    <Pressable onPress={() => { setEditingAnnounce(a); setShowAnnounceModal(true); }} style={styles.editBtn} testID={`admin-announce-edit-${a.id}`}>
                      <Ionicons name="create-outline" size={16} color={colors.primary} />
                      <TText weight="bold" style={{ color: colors.primary, fontSize: 11 }}>संपादन</TText>
                    </Pressable>
                    <Pressable onPress={() => {
                      Alert.alert("घोषणा हटाएँ?", `"${a.title}" स्थायी रूप से हटा दी जाएगी।`, [
                        { text: "रद्द", style: "cancel" },
                        { text: "हटाएँ", style: "destructive", onPress: async () => {
                          try { await api.del(`/admin/announcements/${a.id}`); await load(); } catch (e: any) { Alert.alert("त्रुटि", e.message); }
                        } },
                      ]);
                    }} style={styles.deleteBtn} testID={`admin-announce-del-${a.id}`}>
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                      <TText weight="bold" style={{ color: "#fff", fontSize: 11 }}>हटाएँ</TText>
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <CampaignModal visible={showCampaignModal} onClose={() => setShowCampaignModal(false)} editing={editing} onSaved={async () => { setShowCampaignModal(false); await load(); }} />
      <AnnounceModal visible={showAnnounceModal} editing={editingAnnounce} onClose={() => { setShowAnnounceModal(false); setEditingAnnounce(null); }} onSent={async () => { setShowAnnounceModal(false); setEditingAnnounce(null); await load(); Alert.alert(editingAnnounce ? "अपडेट हो गई" : "भेज दी गई", editingAnnounce ? "घोषणा अपडेट हो गई।" : "घोषणा सभी सदस्यों तक पहुँच गई।"); }} />
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color + "20", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <TText weight="display" style={{ fontSize: 22, color: colors.text }}>{value}</TText>
      <TText style={{ color: colors.muted, fontSize: 11 }}>{label}</TText>
    </Card>
  );
}

function CampaignModal({ visible, onClose, editing, onSaved }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [goal, setGoal] = useState("");
  const [cover, setCover] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) { setTitle(editing.title); setDescription(editing.description); setLocation(editing.location); setDate(editing.date); setGoal(editing.goal || ""); setCover(editing.cover_url || ""); setIsFeatured(!!editing.is_featured); }
    else { setTitle(""); setDescription(""); setLocation(""); setDate(""); setGoal(""); setCover(""); setIsFeatured(false); }
  }, [editing, visible]);

  const pickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!r.canceled) { try { const u = await api.upload(r.assets[0].uri, "image"); setCover(u.url); } catch {} }
  };

  const submit = async () => {
    if (!title || !description || !location || !date) return Alert.alert("अधूरा", "सभी फ़ील्ड भरें");
    setLoading(true);
    try {
      const data = { title, description, cover_url: cover || null, location, date, goal, is_featured: isFeatured };
      if (editing) await api.put(`/campaigns/${editing.id}`, data);
      else await api.post("/campaigns", data);
      onSaved();
    } catch (e: any) { Alert.alert("त्रुटि", e.message); } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHead}>
            <TText weight="display" style={{ fontSize: 20 }}>{editing ? "अभियान संपादित" : "नया अभियान"}</TText>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12 }} keyboardShouldPersistTaps="handled">
            <Pressable onPress={pickCover} style={styles.coverPick}>
              {cover ? <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} /> : <View style={{ alignItems: "center" }}><Ionicons name="image" size={32} color={colors.primary} /><TText weight="bold" style={{ color: colors.primary, marginTop: 8 }}>कवर फ़ोटो जोड़ें</TText></View>}
            </Pressable>
            <TextInput value={title} onChangeText={setTitle} placeholder="अभियान शीर्षक" placeholderTextColor={colors.muted} style={styles.minput} />
            <TextInput value={description} onChangeText={setDescription} placeholder="विस्तार से..." placeholderTextColor={colors.muted} multiline style={[styles.minput, { minHeight: 100, textAlignVertical: "top" }]} />
            <TextInput value={location} onChangeText={setLocation} placeholder="शहर (जैसे: दिल्ली)" placeholderTextColor={colors.muted} style={styles.minput} />
            <TextInput value={date} onChangeText={setDate} placeholder="तारीख़ (YYYY-MM-DD)" placeholderTextColor={colors.muted} style={styles.minput} />
            <TextInput value={goal} onChangeText={setGoal} placeholder="लक्ष्य (वैकल्पिक)" placeholderTextColor={colors.muted} style={styles.minput} />
            <Pressable onPress={() => setIsFeatured(!isFeatured)} style={styles.featuredRow} testID="admin-featured-toggle">
              <View style={[styles.checkbox, isFeatured && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                {isFeatured && <Ionicons name="star" size={14} color={colors.text} />}
              </View>
              <View style={{ flex: 1 }}>
                <TText weight="bold" style={{ fontSize: 14 }}>विशेष अभियान (होम कैरोसेल में दिखाएँ)</TText>
                <TText style={{ color: colors.muted, fontSize: 12 }}>होम पेज के टॉप कैरोसेल में अधिकतम 4 अभियान दिखेंगे</TText>
              </View>
            </Pressable>
            <Button label={editing ? "अपडेट करें" : "अभियान बनाएँ"} loading={loading} onPress={submit} icon="checkmark-circle" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function AnnounceModal({ visible, onClose, onSent, editing }: any) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [city, setCity] = useState("");
  const [showCity, setShowCity] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title || "");
      setBody(editing.body || "");
      setCity(editing?.meta?.city || "");
    } else {
      setTitle("");
      setBody("");
      setCity("");
    }
  }, [editing, visible]);

  const submit = async () => {
    if (!title || !body) return Alert.alert("अधूरा");
    setLoading(true);
    try {
      if (editing?.id) {
        await api.patch(`/admin/announcements/${editing.id}`, { title, body, city: city || null });
      } else {
        await api.post("/admin/announcements", { title, body, city: city || null });
      }
      setTitle(""); setBody(""); setCity("");
      onSent();
    } catch (e: any) {
      Alert.alert("त्रुटि", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHead}>
            <TText weight="display" style={{ fontSize: 20 }}>{editing ? "घोषणा संपादित करें" : "नई घोषणा"}</TText>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12 }}>
            <TextInput value={title} onChangeText={setTitle} placeholder="शीर्षक" placeholderTextColor={colors.muted} style={styles.minput} testID="announce-title" />
            <TextInput value={body} onChangeText={setBody} placeholder="संदेश..." placeholderTextColor={colors.muted} multiline style={[styles.minput, { minHeight: 120, textAlignVertical: "top" }]} testID="announce-body" />
            <Pressable style={styles.minput} onPress={() => setShowCity(!showCity)}>
              <TText style={{ color: city ? colors.text : colors.muted }}>{city || "सभी शहर (सबको भेजें)"}</TText>
            </Pressable>
            {showCity && (
              <Card style={{ maxHeight: 240, padding: 0 }}>
                <ScrollView>
                  <Pressable style={styles.opt} onPress={() => { setCity(""); setShowCity(false); }}><TText weight="bold">सभी शहर</TText></Pressable>
                  {CITIES.map((c) => <Pressable key={c} style={styles.opt} onPress={() => { setCity(c); setShowCity(false); }}><TText>{c}</TText></Pressable>)}
                </ScrollView>
              </Card>
            )}
            <Button label={editing ? "सुरक्षित करें" : "भेजें"} icon={editing ? "checkmark-circle" : "send"} loading={loading} onPress={submit} testID="announce-send" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hdr: { paddingBottom: 4 },
  hdrRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.lg },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  tabPill: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.primary + "60", backgroundColor: colors.surface },
  tabPillActive: { backgroundColor: colors.primary },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  mAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center" },
  miniAct: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  miniBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface },
  barTrack: { width: "100%", height: 8, borderRadius: 4, backgroundColor: colors.primary + "12", overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 4 },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  coverPick: { height: 160, borderRadius: 12, backgroundColor: colors.primary + "10", borderWidth: 2, borderColor: colors.primary + "30", borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  minput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.bodyMedium, color: colors.text, fontSize: 14 },
  opt: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  featuredRow: { flexDirection: "row", gap: 10, alignItems: "center", padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.accent + "10" },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.accent, alignItems: "center", justifyContent: "center" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center" },
  editBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary + "12", borderWidth: 1, borderColor: colors.primary + "30", minWidth: 78 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#D32F2F", minWidth: 78 },
});
