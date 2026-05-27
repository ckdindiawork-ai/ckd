/**
 * Campaigns list tab - all active campaigns with filter by city.
 */
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Card, EmptyState, TText, Pill } from "@/src/components/ui";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { formatDate } from "@/src/utils/format";

export default function Campaigns() {
  const router = useRouter();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "city">("all");

  const load = useCallback(async () => {
    const q = filter === "city" && user?.city ? `?city=${encodeURIComponent(user.city)}` : "";
    const data = await api.get(`/campaigns${q}`);
    setCampaigns(data);
  }, [filter, user?.city]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <TText weight="display" style={{ fontSize: 26 }}>अभियान</TText>
          <TText style={{ color: colors.muted, fontSize: 13 }}>आंदोलन की रीढ़ — जुड़िए और बदलाव लाइए</TText>
        </View>
        {user?.role === "admin" && (
          <Pressable style={styles.addBtn} onPress={() => router.push("/admin/campaigns")} testID="campaigns-admin-create">
            <Ionicons name="add" size={20} color={colors.text} />
            <TText weight="bold" style={{ color: colors.text, fontSize: 13 }}>नया</TText>
          </Pressable>
        )}
      </View>

      <View style={styles.filters}>
        <Pressable onPress={() => setFilter("all")} style={[styles.fchip, filter === "all" && styles.fchipActive]} testID="campaigns-filter-all">
          <TText weight="bold" style={{ color: filter === "all" ? "#fff" : colors.primary, fontSize: 13 }}>सभी</TText>
        </Pressable>
        <Pressable onPress={() => setFilter("city")} style={[styles.fchip, filter === "city" && styles.fchipActive]} testID="campaigns-filter-city">
          <Ionicons name="location" size={12} color={filter === "city" ? "#fff" : colors.primary} />
          <TText weight="bold" style={{ color: filter === "city" ? "#fff" : colors.primary, fontSize: 13 }}>{user?.city || "मेरा शहर"}</TText>
        </Pressable>
      </View>

      <FlatList
        data={campaigns}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
        ListEmptyComponent={<EmptyState icon="megaphone-outline" title="कोई अभियान नहीं" body="जल्द ही नए अभियान शुरू होंगे।" />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/campaigns/${item.id}`)} testID={`campaign-card-${item.id}`}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {item.cover_url && <Image source={{ uri: item.cover_url }} style={styles.cover} />}
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  <Pill label={item.location} icon="location" />
                  <Pill label={formatDate(item.date)} icon="calendar" bg={colors.accent + "30"} color="#7a5a00" />
                </View>
                <TText weight="bold" style={{ fontSize: 17, color: colors.text }} numberOfLines={2}>{item.title}</TText>
                <TText style={{ color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 20 }} numberOfLines={2}>{item.description}</TText>
                <View style={styles.metaRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="people" size={14} color={colors.primary} />
                    <TText weight="bold" style={{ color: colors.primary, fontSize: 13 }}>{item.member_count} सदस्य जुड़े</TText>
                  </View>
                  <View style={styles.joinBtn}>
                    <TText weight="bold" style={{ color: colors.text, fontSize: 12 }}>विस्तार से देखें</TText>
                    <Ionicons name="arrow-forward" size={14} color={colors.text} />
                  </View>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: 12 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  filters: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.lg, marginBottom: 8 },
  fchip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: colors.primary, flexDirection: "row", alignItems: "center", gap: 4 },
  fchipActive: { backgroundColor: colors.primary },
  cover: { width: "100%", height: 160, backgroundColor: colors.primary + "10" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  joinBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
