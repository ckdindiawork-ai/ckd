/**
 * Home feed - greeting header, featured campaign, ongoing campaigns,
 * announcements, recent local issues.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";
import { Card, Pill, Section, StatusBadge, TText } from "@/src/components/ui";
import { colors, fonts, LOGO_URL, radius, spacing } from "@/src/theme";
import { getCategory, timeAgo } from "@/src/utils/format";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, i, n] = await Promise.all([
        api.get("/campaigns"),
        api.get(`/issues${user?.city ? `?city=${encodeURIComponent(user.city)}` : ""}`),
        api.get("/notifications"),
      ]);
      setCampaigns(c);
      setIssues(i);
      setAnnouncements(n.filter((x: any) => x.type === "announcement").slice(0, 3));
    } catch (e) {
      // noop
    }
  }, [user?.city]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const featured = campaigns[0];
  const otherCampaigns = campaigns.slice(1);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.primary, "#1f0d4a"]} style={styles.header}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerInner}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }}>
              <Image source={{ uri: LOGO_URL }} style={styles.headerLogo} />
              <View style={{ flex: 1 }}>
                <TText weight="bold" style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>नमस्ते क्रांतिकारी,</TText>
                <TText weight="display" style={{ color: "#fff", fontSize: 18 }} numberOfLines={1}>{user?.name || "साथी"}</TText>
              </View>
            </View>
            <View style={styles.pointsPill}>
              <Ionicons name="flame" size={14} color={colors.energy} />
              <TText weight="bold" style={{ color: "#fff", fontSize: 13 }}>{user?.kranti_points || 0}</TText>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured campaign */}
        {featured && (
          <Pressable style={{ padding: spacing.lg }} onPress={() => router.push(`/campaigns/${featured.id}`)} testID="home-featured-campaign">
            <View style={styles.featuredCard}>
              {featured.cover_url && <Image source={{ uri: featured.cover_url }} style={styles.featuredImage} />}
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.featuredGradient} />
              <View style={styles.featuredContent}>
                <Pill label="विशेष अभियान" icon="star" bg={colors.accent} color={colors.text} />
                <TText weight="display" style={styles.featuredTitle} numberOfLines={2}>{featured.title}</TText>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="location" size={12} color="#fff" />
                    <TText style={{ color: "#fff", fontSize: 12 }}>{featured.location}</TText>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="people" size={12} color="#fff" />
                    <TText style={{ color: "#fff", fontSize: 12 }}>{featured.member_count} सदस्य</TText>
                  </View>
                </View>
              </View>
            </View>
          </Pressable>
        )}

        {/* Announcements */}
        {announcements.length > 0 && (
          <Section title="📣 घोषणाएँ">
            <View style={{ paddingHorizontal: spacing.lg, gap: 10 }}>
              {announcements.map((a) => (
                <View key={a.id} style={styles.announceCard}>
                  <View style={styles.announceDot} />
                  <View style={{ flex: 1 }}>
                    <TText weight="bold" style={{ color: colors.primary, fontSize: 14 }}>{a.title}</TText>
                    <TText style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{a.body}</TText>
                    <TText style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{timeAgo(a.created_at)}</TText>
                  </View>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Active Campaigns */}
        <Section title="चल रहे अभियान" action="सभी देखें" onAction={() => router.push("/(tabs)/campaigns")}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 12 }}>
            {otherCampaigns.map((c) => (
              <Pressable key={c.id} style={styles.campCard} onPress={() => router.push(`/campaigns/${c.id}`)} testID={`home-campaign-${c.id}`}>
                {c.cover_url && <Image source={{ uri: c.cover_url }} style={styles.campCover} />}
                <View style={{ padding: 12 }}>
                  <TText weight="bold" style={{ fontSize: 14, color: colors.text }} numberOfLines={2}>{c.title}</TText>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                    <Ionicons name="location" size={11} color={colors.muted} />
                    <TText style={{ color: colors.muted, fontSize: 11 }}>{c.location}</TText>
                    <TText style={{ color: colors.muted, fontSize: 11 }}>•</TText>
                    <TText style={{ color: colors.muted, fontSize: 11 }}>{c.member_count} सदस्य</TText>
                  </View>
                </View>
              </Pressable>
            ))}
            {otherCampaigns.length === 0 && (
              <View style={{ width: 280, padding: 16 }}>
                <TText style={{ color: colors.muted, fontSize: 13 }}>कोई और अभियान नहीं</TText>
              </View>
            )}
          </ScrollView>
        </Section>

        {/* Recent issues */}
        <Section title="आपके शहर की हाल की समस्याएँ" action="सब देखें" onAction={() => router.push("/issues")}>
          <View style={{ paddingHorizontal: spacing.lg, gap: 12 }}>
            {issues.slice(0, 5).map((i) => {
              const cat = getCategory(i.category);
              return (
                <Pressable key={i.id} onPress={() => router.push(`/issues/${i.id}`)} testID={`home-issue-${i.id}`}>
                  <Card>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      {i.media_url ? (
                        <Image source={{ uri: i.media_url }} style={styles.issueThumb} />
                      ) : (
                        <View style={[styles.issueThumb, { backgroundColor: colors.primary + "10", alignItems: "center", justifyContent: "center" }]}>
                          <Ionicons name={cat.icon as any} size={26} color={colors.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Pill label={cat.label} icon={cat.icon as any} />
                          <StatusBadge status={i.status} />
                        </View>
                        <TText weight="bold" style={{ marginTop: 6, fontSize: 14 }} numberOfLines={2}>{i.title}</TText>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="heart" size={12} color={colors.energy} />
                            <TText style={{ color: colors.muted, fontSize: 11 }}>{i.supporter_count}</TText>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="hand-left" size={12} color={colors.primary} />
                            <TText style={{ color: colors.muted, fontSize: 11 }}>{i.helper_count} मदद</TText>
                          </View>
                          <TText style={{ color: colors.muted, fontSize: 11 }}>{timeAgo(i.created_at)}</TText>
                        </View>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
            {issues.length === 0 && (
              <Card>
                <TText style={{ color: colors.muted, textAlign: "center" }}>अभी कोई समस्या नहीं। पहला रिपोर्ट कीजिए!</TText>
              </Card>
            )}
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingBottom: 16 },
  headerInner: { flexDirection: "row", alignItems: "center", padding: spacing.lg, gap: 12 },
  headerLogo: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.accent },
  pointsPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  featuredCard: { borderRadius: 20, overflow: "hidden", height: 200, backgroundColor: colors.primary },
  featuredImage: { width: "100%", height: "100%", position: "absolute" },
  featuredGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "70%" },
  featuredContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16 },
  featuredTitle: { color: "#fff", fontSize: 22, marginTop: 8 },
  announceCard: { backgroundColor: colors.surface, padding: 14, borderRadius: radius.lg, flexDirection: "row", gap: 12, borderLeftWidth: 4, borderLeftColor: colors.energy, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderTopColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border },
  announceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.energy, marginTop: 6 },
  campCard: { width: 240, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  campCover: { width: "100%", height: 120, backgroundColor: colors.primary + "10" },
  issueThumb: { width: 72, height: 72, borderRadius: 12 },
});
