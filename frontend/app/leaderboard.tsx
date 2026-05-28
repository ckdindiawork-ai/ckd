/**
 * City-wise leaderboard of Kranti Points.
 */
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Card, TText } from "@/src/components/ui";
import { CITIES, colors, spacing } from "@/src/theme";

export default function Leaderboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [city, setCity] = useState(user?.city || "");

  const load = useCallback(async () => {
    const data = await api.get(`/leaderboard${city ? `?city=${encodeURIComponent(city)}` : ""}`);
    setItems(data);
  }, [city]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <LinearGradient colors={[colors.primary, "#1f0d4a"]} style={styles.hero}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.lg }}>
          <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color="#fff" /></Pressable>
        </View>
        <View style={{ alignItems: "center", padding: spacing.lg, paddingTop: 0 }}>
          <View style={styles.trophyBox}><Ionicons name="trophy" size={32} color={colors.accent} /></View>
          <TText weight="display" style={{ color: "#fff", fontSize: 26, marginTop: 12 }}>लीडरबोर्ड</TText>
          <TText style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>सबसे ज़्यादा क्रांति पॉइंट्स वाले क्रांतिकारी</TText>
        </View>
      </LinearGradient>
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          <Pressable onPress={() => setCity("")} style={[styles.chip, !city && styles.chipActive]}><TText weight="bold" style={{ color: !city ? "#fff" : colors.primary, fontSize: 12, includeFontPadding: false }}>सारे भारत</TText></Pressable>
          {CITIES.map((c) => (
            <Pressable key={c} onPress={() => setCity(c)} style={[styles.chip, city === c && styles.chipActive]}>
              <TText weight="bold" style={{ color: city === c ? "#fff" : colors.primary, fontSize: 12, includeFontPadding: false }}>{c}</TText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 8, paddingBottom: 40 }}
        renderItem={({ item, index }) => {
          const isMe = item.id === user?.id;
          const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
          return (
            <Card style={[{ flexDirection: "row", alignItems: "center", gap: 12 }, isMe && { borderColor: colors.accent, borderWidth: 2 }]}>
              <View style={[styles.rank, index < 3 && styles.rankTop]}>
                {medal ? <TText style={{ fontSize: 20 }}>{medal}</TText> : <TText weight="display" style={{ color: colors.primary }}>{index + 1}</TText>}
              </View>
              <View style={styles.avatar}>
                {item.photo_url ? <Image source={{ uri: item.photo_url }} style={{ width: "100%", height: "100%", borderRadius: 22 }} /> : <TText weight="bold" style={{ color: colors.primary }}>{item.name?.[0]}</TText>}
              </View>
              <View style={{ flex: 1 }}>
                <TText weight="bold" style={{ fontSize: 14 }}>{item.name}{isMe && " (आप)"}</TText>
                <TText style={{ color: colors.muted, fontSize: 11 }}>{item.city}</TText>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="flame" size={14} color={colors.energy} />
                <TText weight="display" style={{ color: colors.primary, fontSize: 16 }}>{item.kranti_points}</TText>
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: 16 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  trophyBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(244,180,0,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.accent },
  chip: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 14, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.primary + "60", backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBar: { backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBarContent: { paddingHorizontal: spacing.lg, paddingVertical: 10, gap: 6, alignItems: "center" },
  rank: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "10", alignItems: "center", justifyContent: "center" },
  rankTop: { backgroundColor: colors.accent + "20" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center" },
});
