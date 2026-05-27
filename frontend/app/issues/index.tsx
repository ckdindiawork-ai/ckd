/**
 * All issues feed with city + category filters.
 */
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Card, EmptyState, Pill, StatusBadge, TText } from "@/src/components/ui";
import { CATEGORIES, colors, spacing } from "@/src/theme";
import { getCategory, timeAgo } from "@/src/utils/format";

export default function IssuesList() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [cat, setCat] = useState<string>("");
  const [cityOnly, setCityOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    if (cityOnly && user?.city) params.set("city", user.city);
    const data = await api.get(`/issues${params.toString() ? `?${params}` : ""}`);
    setItems(data);
  }, [cat, cityOnly, user?.city]);

  useEffect(() => { load(); }, [load]);
  // Refresh on focus so newly reported issues appear immediately.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>
        <View>
          <TText weight="display" style={{ fontSize: 22 }}>सभी समस्याएँ</TText>
          <TText style={{ color: colors.muted, fontSize: 12 }}>नागरिकों की आवाज़</TText>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8, paddingVertical: 8 }}>
        <Pressable onPress={() => setCityOnly(!cityOnly)} style={[styles.chip, cityOnly && styles.chipActive]} testID="issues-filter-city">
          <Ionicons name="location" size={12} color={cityOnly ? "#fff" : colors.primary} />
          <TText weight="bold" style={{ color: cityOnly ? "#fff" : colors.primary, fontSize: 12 }}>{user?.city || "मेरा शहर"}</TText>
        </Pressable>
        <Pressable onPress={() => setCat("")} style={[styles.chip, !cat && styles.chipActive]}><TText weight="bold" style={{ color: !cat ? "#fff" : colors.primary, fontSize: 12 }}>सभी</TText></Pressable>
        {CATEGORIES.map((c) => (
          <Pressable key={c.value} onPress={() => setCat(c.value)} style={[styles.chip, cat === c.value && styles.chipActive]} testID={`issues-filter-${c.value}`}>
            <Ionicons name={c.icon as any} size={12} color={cat === c.value ? "#fff" : colors.primary} />
            <TText weight="bold" style={{ color: cat === c.value ? "#fff" : colors.primary, fontSize: 12 }}>{c.label}</TText>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
        ListEmptyComponent={<EmptyState icon="search-outline" title="कोई समस्या नहीं मिली" body="फ़िल्टर बदलें या नई समस्या रिपोर्ट करें।" />}
        renderItem={({ item }) => {
          const c = getCategory(item.category);
          return (
            <Pressable onPress={() => router.push(`/issues/${item.id}`)} testID={`issue-${item.id}`}>
              <Card>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {item.media_url && item.media_type !== "video" ? (
                    <Image source={{ uri: item.media_url }} style={{ width: 84, height: 84, borderRadius: 12 }} />
                  ) : (
                    <View style={[styles.thumbAlt]}>
                      {item.media_type === "video" ? (
                        <Ionicons name="play-circle" size={32} color={colors.accent} />
                      ) : (
                        <Ionicons name={c.icon as any} size={28} color={colors.primary} />
                      )}
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Pill label={c.label} icon={c.icon as any} />
                      <StatusBadge status={item.status} />
                    </View>
                    <TText weight="bold" numberOfLines={2} style={{ marginTop: 6, fontSize: 14 }}>{item.title}</TText>
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                      <TText style={{ color: colors.muted, fontSize: 11 }}>📍 {item.area}, {item.city}</TText>
                      <TText style={{ color: colors.muted, fontSize: 11 }}>{timeAgo(item.created_at)}</TText>
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.lg },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary },
  thumbAlt: { width: 84, height: 84, borderRadius: 12, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center" },
});
