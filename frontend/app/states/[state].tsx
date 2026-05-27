/**
 * Issues in a single state.
 */
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { Card, EmptyState, Pill, StatusBadge, TText } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme";
import { getCategory, timeAgo } from "@/src/utils/format";

export default function StateIssues() {
  const { state } = useLocalSearchParams<{ state: string }>();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const stateName = decodeURIComponent(state || "");

  const load = useCallback(async () => {
    const data = await api.get(`/issues?state=${encodeURIComponent(stateName)}`);
    setItems(data);
  }, [stateName]);

  useEffect(() => { load(); }, [load]);
  // Refresh whenever this screen regains focus (e.g. after submitting a new issue).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <LinearGradient colors={[colors.primary, "#1f0d4a"]} style={styles.hero}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.lg, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color="#fff" /></Pressable>
          <View style={{ flex: 1 }}>
            <TText weight="display" style={{ color: "#fff", fontSize: 22 }}>{stateName}</TText>
            <TText style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{items.length} समस्याएँ दर्ज</TText>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/report")} style={styles.addBtn} testID="state-report">
            <Ionicons name="add" size={20} color={colors.text} />
          </Pressable>
        </View>
      </LinearGradient>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={{ paddingTop: 40 }}>
            <EmptyState
              icon="leaf-outline"
              title="इस राज्य में अभी कोई समस्या दर्ज नहीं है"
              body="पहली रिपोर्ट दर्ज कर इसकी शुरुआत कीजिए।"
            />
          </View>
        }
        renderItem={({ item }) => {
          const c = getCategory(item.category);
          return (
            <Pressable onPress={() => router.push(`/issues/${item.id}`)} testID={`state-issue-${item.id}`}>
              <Card>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {item.media_url && item.media_type !== "video" ? (
                    <Image source={{ uri: item.media_url }} style={styles.thumb} />
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
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      <TText style={{ color: colors.muted, fontSize: 11 }}>📍 {item.area}, {item.city}</TText>
                      <TText style={{ color: colors.muted, fontSize: 11 }}>•</TText>
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
  hero: { paddingBottom: 8 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  thumb: { width: 84, height: 84, borderRadius: 12 },
  thumbAlt: { width: 84, height: 84, borderRadius: 12, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center" },
});
