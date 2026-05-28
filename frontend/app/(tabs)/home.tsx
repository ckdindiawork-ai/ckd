/**
 * Home feed - greeting header, featured campaigns carousel (auto-scrolling),
 * announcements, ongoing campaigns, recent local issues, state browser entry.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";
import { Card, Pill, Section, StatusBadge, TText } from "@/src/components/ui";
import { Skeleton } from "@/src/components/Skeleton";
import { colors, fonts, LOGO_URL, radius, spacing } from "@/src/theme";
import { getCategory, timeAgo } from "@/src/utils/format";

const { width } = Dimensions.get("window");
const CAROUSEL_W = width - spacing.lg * 2;

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [featured, setFeatured] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const carouselRef = useRef<FlatList<any>>(null);

  const load = useCallback(async () => {
    try {
      const [f, c, i, n] = await Promise.all([
        api.get("/campaigns?featured=true&limit=4"),
        api.get("/campaigns"),
        api.get("/issues"),
        api.get("/notifications"),
      ]);
      const featList = f.slice(0, 4);
      setFeatured(featList);
      // Fall back: if no featured, take first campaign(s)
      if (featList.length === 0 && c.length > 0) setFeatured(c.slice(0, Math.min(c.length, 4)));
      setCampaigns(c);
      setIssues(i);
      setAnnouncements(n.filter((x: any) => x.type === "announcement").slice(0, 3));
    } catch {
      // noop
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // Refresh whenever the user opens this tab (so newly created issues show up).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Auto-rotate carousel every 4 seconds.
  useEffect(() => {
    if (featured.length <= 1) return;
    const t = setInterval(() => {
      setCarouselIdx((prev) => {
        const next = (prev + 1) % featured.length;
        carouselRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [featured.length]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

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
        {/* Initial loading — skeleton hero + cards */}
        {initialLoading && featured.length === 0 && campaigns.length === 0 && issues.length === 0 && (
          <View style={{ paddingTop: spacing.lg, paddingHorizontal: spacing.lg }} testID="home-skeleton">
            <Skeleton.Block height={180} radius={16} style={{ marginBottom: 16 }} />
            <Skeleton width={140} height={18} style={{ marginBottom: 12 }} />
            <Skeleton.CampaignCard />
            <Skeleton.CampaignCard />
          </View>
        )}

        {/* Featured campaigns carousel */}
        {featured.length > 0 && (
          <View style={{ paddingTop: spacing.lg }}>
            <FlatList
              ref={carouselRef}
              data={featured}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={CAROUSEL_W + 12}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 12 }}
              onMomentumScrollEnd={(e) => setCarouselIdx(Math.round(e.nativeEvent.contentOffset.x / (CAROUSEL_W + 12)))}
              getItemLayout={(_, idx) => ({ length: CAROUSEL_W + 12, offset: (CAROUSEL_W + 12) * idx, index: idx })}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable onPress={() => router.push(`/campaigns/${item.id}`)} testID={`home-featured-${item.id}`} style={{ width: CAROUSEL_W }}>
                  <View style={styles.featuredCard}>
                    {item.cover_url && <Image source={{ uri: item.cover_url }} style={styles.featuredImage} />}
                    <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={styles.featuredGradient} />
                    <View style={styles.featuredContent}>
                      <Pill label="विशेष अभियान" icon="star" bg={colors.accent} color={colors.text} />
                      <TText weight="display" style={styles.featuredTitle} numberOfLines={2}>{item.title}</TText>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="location" size={12} color="#fff" />
                          <TText style={{ color: "#fff", fontSize: 12 }}>{item.location}</TText>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="people" size={12} color="#fff" />
                          <TText style={{ color: "#fff", fontSize: 12 }}>{item.member_count} सदस्य</TText>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              )}
            />
            {featured.length > 1 && (
              <View style={styles.dots}>
                {featured.map((_, i) => (
                  <View key={i} style={[styles.dot, i === carouselIdx && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* State browser entry */}
        <Pressable style={styles.statesCta} onPress={() => router.push("/states")} testID="home-states-cta">
          <View style={styles.statesIcon}>
            <Ionicons name="map" size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <TText weight="bold" style={{ color: "#fff", fontSize: 15 }}>राज्यवार समस्याएँ देखें</TText>
            <TText style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>हर राज्य की समस्याएँ एक नज़र में</TText>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>

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
            {campaigns.map((c) => (
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
            {campaigns.length === 0 && (
              <View style={{ width: 280, padding: 16 }}>
                <TText style={{ color: colors.muted, fontSize: 13 }}>अभी कोई अभियान नहीं — जल्द ही नए अभियान आएँगे।</TText>
              </View>
            )}
          </ScrollView>
        </Section>

        {/* Recent issues */}
        <Section title="हाल की समस्याएँ" action="सब देखें" onAction={() => router.push("/issues")}>
          <View style={{ paddingHorizontal: spacing.lg, gap: 12 }}>
            {issues.slice(0, 6).map((i) => {
              const cat = getCategory(i.category);
              return (
                <Pressable key={i.id} onPress={() => router.push(`/issues/${i.id}`)} testID={`home-issue-${i.id}`}>
                  <Card>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      {i.media_url && i.media_type !== "video" ? (
                        <Image source={{ uri: i.media_url }} style={styles.issueThumb} />
                      ) : (
                        <View style={[styles.issueThumb, { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }]}>
                          {i.media_type === "video" ? (
                            <Ionicons name="play-circle" size={32} color={colors.accent} />
                          ) : (
                            <Ionicons name={cat.icon as any} size={26} color={colors.accent} />
                          )}
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Pill label={cat.label} icon={cat.icon as any} />
                          <StatusBadge status={i.status} />
                        </View>
                        <TText weight="bold" style={{ marginTop: 6, fontSize: 14 }} numberOfLines={2}>{i.title}</TText>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                          <TText style={{ color: colors.muted, fontSize: 11 }}>📍 {i.area}, {i.city}{i.state ? `, ${i.state}` : ""}</TText>
                          <TText style={{ color: colors.muted, fontSize: 11 }}>•</TText>
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
                <TText style={{ color: colors.muted, textAlign: "center" }}>अभी कोई समस्या नहीं। पहली रिपोर्ट कीजिए!</TText>
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
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary + "30" },
  dotActive: { width: 20, backgroundColor: colors.primary },
  statesCta: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.primary, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: 14, borderRadius: radius.lg },
  statesIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(244,180,0,0.18)", alignItems: "center", justifyContent: "center" },
  announceCard: { backgroundColor: colors.surface, padding: 14, borderRadius: radius.lg, flexDirection: "row", gap: 12, borderLeftWidth: 4, borderLeftColor: colors.energy, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderTopColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border },
  announceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.energy, marginTop: 6 },
  campCard: { width: 240, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  campCover: { width: "100%", height: 120, backgroundColor: colors.primary + "10" },
  issueThumb: { width: 72, height: 72, borderRadius: 12 },
});
