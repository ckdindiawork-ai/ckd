/**
 * Notifications centre - all personal & broadcast notifications, mark read.
 */
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { EmptyState, TText } from "@/src/components/ui";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { timeAgo } from "@/src/utils/format";

const TYPE_ICON: Record<string, { icon: any; color: string; bg: string }> = {
  announcement: { icon: "megaphone", color: "#fff", bg: colors.energy },
  campaign_new: { icon: "flag", color: "#fff", bg: colors.primary },
  campaign_join: { icon: "checkmark-circle", color: "#fff", bg: colors.success },
  update_like: { icon: "heart", color: "#fff", bg: colors.energy },
  update_comment: { icon: "chatbubble", color: "#fff", bg: colors.primary },
  issue_volunteer: { icon: "hand-left", color: colors.text, bg: colors.accent },
  issue_comment: { icon: "chatbubble", color: "#fff", bg: colors.primary },
  issue_resolved: { icon: "trophy", color: colors.text, bg: colors.accent },
};

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await api.get("/notifications");
    setItems(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePress = async (n: any) => {
    if (!n.read) {
      api.post(`/notifications/${n.id}/read`);
      setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.meta?.campaign_id) router.push(`/campaigns/${n.meta.campaign_id}`);
    else if (n.meta?.issue_id) router.push(`/issues/${n.meta.issue_id}`);
  };

  const markAll = async () => {
    await api.post("/notifications/read-all");
    setItems((arr) => arr.map((x) => ({ ...x, read: true })));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <TText weight="display" style={{ fontSize: 26 }}>सूचनाएँ</TText>
          <TText style={{ color: colors.muted, fontSize: 13 }}>आंदोलन से जुड़ी सभी ख़बरें यहाँ</TText>
        </View>
        {items.some((x) => !x.read) && (
          <Pressable onPress={markAll} testID="notif-mark-all">
            <TText weight="bold" style={{ color: colors.primary, fontSize: 13 }}>सब पढ़ी गई</TText>
          </Pressable>
        )}
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
        ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="कोई सूचना नहीं" body="जब कुछ नया होगा यहाँ दिखेगा।" />}
        renderItem={({ item }) => {
          const meta = TYPE_ICON[item.type] || TYPE_ICON.announcement;
          return (
            <Pressable style={[styles.row, !item.read && styles.unread]} onPress={() => handlePress(item)} testID={`notif-${item.id}`}>
              <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <TText weight="bold" style={{ color: colors.text, fontSize: 14 }}>{item.title}</TText>
                <TText style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{item.body}</TText>
                <TText style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{timeAgo(item.created_at)}</TText>
              </View>
              {!item.read && <View style={styles.dot} />}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  unread: { borderColor: colors.primary + "40", backgroundColor: colors.primary + "06" },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.energy },
});
