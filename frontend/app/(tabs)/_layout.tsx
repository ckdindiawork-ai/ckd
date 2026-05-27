import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "@/src/api";
import { colors, fonts } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { TText } from "@/src/components/ui";

export default function TabLayout() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/auth/login");
    else if (!user.profile_complete) router.replace("/auth/profile-setup");
  }, [user, loading, router]);

  // Refresh unread notification count whenever a tab gains focus.
  // Cheap call (~80ms); keeps the bell badge accurate without websockets.
  const loadUnread = useCallback(async () => {
    if (!user) return;
    try {
      const list = await api.get("/notifications");
      const count = Array.isArray(list) ? list.filter((n: any) => !n.read).length : 0;
      setUnread(count);
    } catch {
      // ignore — badge just won't update this cycle
    }
  }, [user]);
  useEffect(() => { loadUnread(); }, [loadUnread]);
  useFocusEffect(useCallback(() => { loadUnread(); }, [loadUnread]));

  // Safe bottom inset for gesture-navigation Android phones + iOS home indicator.
  const bottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 24 : 12);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: "rgba(255,255,255,0.62)",
        tabBarStyle: {
          backgroundColor: colors.primary,
          borderTopWidth: 0,
          height: 60 + bottomPad,
          paddingTop: 8,
          paddingBottom: bottomPad,
          paddingHorizontal: 4,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyBold,
          fontSize: 11,
          marginTop: 4,
          marginBottom: 0,
          includeFontPadding: false,
        },
        tabBarItemStyle: { paddingTop: 4, paddingBottom: 0 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "होम",
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? "home" : "home-outline"} color={color} focused={focused} testID="tab-home" />,
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: "अभियान",
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? "megaphone" : "megaphone-outline"} color={color} focused={focused} testID="tab-campaigns" />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "समस्या",
          tabBarIcon: ({ color, focused }) => <TabIcon name="add-circle" color={color} focused={focused} accent testID="tab-report" />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "सूचना",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "notifications" : "notifications-outline"}
              color={color}
              focused={focused}
              badge={unread}
              testID="tab-notifications"
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            // Mark optimistic: when user opens notifications tab, refresh the badge
            // (server will reset on read-all)
            setTimeout(loadUnread, 1200);
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "प्रोफ़ाइल",
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? "person" : "person-outline"} color={color} focused={focused} testID="tab-profile" />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color, focused, accent, badge, testID }: any) {
  if (accent) {
    return (
      <View style={styles.fab} testID={testID}>
        <Ionicons name={name} size={34} color={colors.accent} />
      </View>
    );
  }
  return (
    <View style={focused ? styles.activePill : styles.iconWrap} testID={testID}>
      <Ionicons name={name} size={22} color={color} />
      {badge && badge > 0 ? (
        <View style={styles.badge} testID={`${testID}-badge`}>
          <TText weight="bold" style={styles.badgeText} numberOfLines={1}>
            {badge > 99 ? "99+" : String(badge)}
          </TText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: { paddingHorizontal: 8, paddingVertical: 2 },
  activePill: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(244,180,0,0.20)" },
  fab: {
    marginTop: -22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.primary,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 6 },
    }),
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E63329",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  badgeText: { color: "#fff", fontSize: 10, lineHeight: 12 },
});
