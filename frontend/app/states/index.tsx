/**
 * State grid - 36 states/UTs with badge for issue count. Tap to drill down.
 */
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { TText } from "@/src/components/ui";
import { STATES } from "@/src/data/locations";
import { colors, fonts, radius, spacing } from "@/src/theme";

export default function StatesIndex() {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await api.get("/issues/state-counts");
      setCounts(c || {});
    } catch {
      setCounts({});
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sorted: states with counts first (desc), then alphabetical
  const data = [...STATES].sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b, "hi"));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <LinearGradient colors={[colors.primary, "#1f0d4a"]} style={styles.hero}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.lg, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={styles.back} testID="states-back">
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <TText weight="display" style={{ color: "#fff", fontSize: 22 }}>राज्यवार समस्याएँ</TText>
            <TText style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{STATES.length} राज्य/केंद्र शासित प्रदेश</TText>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={data}
        keyExtractor={(s) => s}
        numColumns={2}
        contentContainerStyle={{ padding: spacing.lg, gap: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const count = counts[item] || 0;
          return (
            <Pressable
              style={[styles.tile, count > 0 && styles.tileActive]}
              onPress={() => router.push(`/states/${encodeURIComponent(item)}`)}
              testID={`state-tile-${item}`}
            >
              <View style={[styles.tileIcon, count > 0 && { backgroundColor: colors.accent }]}>
                <Ionicons name="location" size={20} color={count > 0 ? colors.text : colors.primary} />
              </View>
              <TText weight="bold" style={{ fontSize: 13, color: colors.text, marginTop: 8, textAlign: "center" }} numberOfLines={2}>
                {item}
              </TText>
              <View style={[styles.countBadge, count === 0 && { backgroundColor: colors.bg }]}>
                <TText weight="bold" style={{ fontSize: 11, color: count > 0 ? "#fff" : colors.muted }}>
                  {count} समस्या{count !== 1 ? "एँ" : ""}
                </TText>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: 8 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  tile: { flex: 1, backgroundColor: colors.surface, padding: 14, borderRadius: radius.lg, alignItems: "center", borderWidth: 1, borderColor: colors.border, minHeight: 140 },
  tileActive: { borderColor: colors.primary + "30" },
  tileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center" },
  countBadge: { marginTop: "auto", backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
});
