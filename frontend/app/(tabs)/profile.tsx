/**
 * Profile tab - user info, kranti points, my activity, leaderboard, admin link.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";
import { Button, Card, EmptyState, StatusBadge, TText } from "@/src/components/ui";
import { MembershipCard } from "@/src/components/MembershipCard";
import { useToast } from "@/src/components/Toast";
import { shareMembershipCard } from "@/src/utils/share";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { timeAgo } from "@/src/utils/format";

export default function Profile() {
  const router = useRouter();
  const { user, signOut, refresh } = useAuth();
  const { toast } = useToast();
  const cardRef = useRef<View>(null);
  const [activity, setActivity] = useState<any>({ campaigns: [], issues: [], contributions: [] });
  const [tab, setTab] = useState<"campaigns" | "issues" | "contributions">("campaigns");
  const [refreshing, setRefreshing] = useState(false);
  const [sharingCard, setSharingCard] = useState(false);

  const onShareCard = async () => {
    if (!user) return;
    setSharingCard(true);
    try {
      const res = await shareMembershipCard(cardRef, user.name || "साथी");
      if (res.ok) {
        const msg =
          res.mode === "download" ? "कार्ड डाउनलोड हो गया" :
          res.mode === "clipboard" ? "विवरण क्लिपबोर्ड पर कॉपी हो गया" :
          res.mode === "saved" ? "कार्ड सेव हो गया" :
          "कार्ड साझा हो गया";
        toast.success(msg);
      } else if (res.mode !== "cancelled") {
        toast.error("कार्ड साझा नहीं हो सका");
      }
    } finally {
      setSharingCard(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const a = await api.get("/me/activity");
      setActivity(a);
      await refresh();
    } catch {}
  }, [refresh]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderList = () => {
    const data = activity[tab];
    if (!data || data.length === 0) return <EmptyState icon="leaf-outline" title="अभी कुछ नहीं" body="शुरुआत कीजिए और क्रांति में अपना योगदान दीजिए।" />;
    if (tab === "campaigns") {
      return data.map((c: any) => (
        <Pressable key={c.id} onPress={() => router.push(`/campaigns/${c.id}`)}>
          <Card style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {c.cover_url && <Image source={{ uri: c.cover_url }} style={styles.thumb} />}
              <View style={{ flex: 1 }}>
                <TText weight="bold" numberOfLines={2}>{c.title}</TText>
                <TText style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{c.location} • {c.member_count} सदस्य</TText>
              </View>
            </View>
          </Card>
        </Pressable>
      ));
    }
    return data.map((i: any) => (
      <Pressable key={i.id} onPress={() => router.push(`/issues/${i.id}`)}>
        <Card style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <TText weight="bold" style={{ flex: 1 }} numberOfLines={2}>{i.title}</TText>
            <StatusBadge status={i.status} />
          </View>
          <TText style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{i.city} • {timeAgo(i.created_at)}</TText>
        </Card>
      </Pressable>
    ));
  };

  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <LinearGradient colors={[colors.primary, "#1f0d4a"]} style={styles.headerCard}>
          <View style={styles.avatarWrap}>
            {user.photo_url ? (
              <Image source={{ uri: user.photo_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }]}>
                <TText weight="display" style={{ fontSize: 36, color: colors.text }}>{user.name?.[0]?.toUpperCase() || "?"}</TText>
              </View>
            )}
            {user.role === "admin" && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color={colors.text} />
                <TText weight="bold" style={{ color: colors.text, fontSize: 10 }}>एडमिन</TText>
              </View>
            )}
          </View>
          <TText weight="display" style={{ color: "#fff", fontSize: 22, marginTop: 12 }}>{user.name}</TText>
          <TText style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{user.city} • {user.area}</TText>

          <View style={styles.statsRow}>
            <Stat value={user.kranti_points} label="क्रांति पॉइंट्स" icon="flame" color={colors.accent} />
            <View style={styles.statDiv} />
            <Stat value={activity.campaigns.length} label="अभियान" icon="megaphone" />
            <View style={styles.statDiv} />
            <Stat value={activity.issues.length + activity.contributions.length} label="योगदान" icon="hand-left" />
          </View>
        </LinearGradient>

        <View style={{ padding: spacing.lg }}>
          {/* Membership card */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <TText weight="display" style={{ fontSize: 16 }}>डिजिटल सदस्यता कार्ड</TText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                <TText weight="bold" style={{ color: colors.success, fontSize: 11 }}>सत्यापित</TText>
              </View>
            </View>
            <MembershipCard ref={cardRef} user={user} />
            <Button
              label={sharingCard ? "तैयार हो रहा है..." : "कार्ड डाउनलोड या साझा करें"}
              icon="share-social"
              loading={sharingCard}
              onPress={onShareCard}
              style={{ marginTop: 12 }}
              testID="profile-share-card"
            />
          </View>

          {/* Action cards */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            <ActionTile icon="trophy" label="लीडरबोर्ड" onPress={() => router.push("/leaderboard")} testID="profile-leaderboard" />
            <ActionTile icon="book" label="नियम" onPress={() => router.push("/guidelines")} testID="profile-guidelines" />
            <ActionTile icon="shield" label="गोपनीयता" onPress={() => router.push("/privacy")} testID="profile-privacy" />
          </View>

          {user.role === "admin" && (
            <Pressable style={styles.adminCard} onPress={() => router.push("/admin")} testID="profile-admin-link">
              <View style={styles.adminIcon}>
                <Ionicons name="shield-checkmark" size={22} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <TText weight="bold" style={{ color: "#fff", fontSize: 15 }}>एडमिन पैनल</TText>
                <TText style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>सदस्य, अभियान और सामग्री प्रबंधन</TText>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </Pressable>
          )}

          {/* Tabs */}
          <View style={styles.subTabs}>
            {[
              { k: "campaigns", l: "अभियान" },
              { k: "issues", l: "मेरी समस्याएँ" },
              { k: "contributions", l: "योगदान" },
            ].map((t) => (
              <Pressable key={t.k} onPress={() => setTab(t.k as any)} style={[styles.subTab, tab === t.k && styles.subTabActive]} testID={`profile-tab-${t.k}`}>
                <TText weight="bold" style={{ color: tab === t.k ? colors.text : colors.muted, fontSize: 13 }}>{t.l}</TText>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 12 }}>
            {renderList()}
          </View>

          <Pressable style={styles.logout} onPress={signOut} testID="profile-logout">
            <Ionicons name="log-out-outline" size={18} color={colors.energy} />
            <TText weight="bold" style={{ color: colors.energy }}>लॉग आउट</TText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, icon, color }: { value: number; label: string; icon: any; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {icon && <Ionicons name={icon} size={16} color={color || "#fff"} />}
        <TText weight="display" style={{ color: "#fff", fontSize: 20 }}>{value}</TText>
      </View>
      <TText style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 }}>{label}</TText>
    </View>
  );
}

function ActionTile({ icon, label, onPress, testID }: { icon: any; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable style={styles.tile} onPress={onPress} testID={testID}>
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <TText weight="bold" style={{ fontSize: 12, color: colors.text, marginTop: 6 }}>{label}</TText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerCard: { padding: spacing.xl, alignItems: "center", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  avatarWrap: { position: "relative" },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: colors.accent },
  adminBadge: { position: "absolute", bottom: -4, alignSelf: "center", flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statsRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 14, marginTop: 16, width: "100%" },
  statDiv: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.2)" },
  tile: { flex: 1, backgroundColor: colors.surface, padding: 12, borderRadius: radius.lg, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  tileIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center" },
  adminCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.primary, padding: 14, borderRadius: radius.lg, marginBottom: 16 },
  adminIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  subTabs: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: colors.border },
  subTab: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: "center" },
  subTabActive: { backgroundColor: colors.accent },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, marginTop: 24, marginBottom: 20 },
});
