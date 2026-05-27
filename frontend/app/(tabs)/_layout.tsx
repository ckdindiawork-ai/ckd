import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
import { useEffect } from "react";
import { colors, fonts, spacing } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function TabLayout() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/auth/login");
    else if (!user.profile_complete) router.replace("/auth/profile-setup");
  }, [user, loading, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: "rgba(255,255,255,0.55)",
        tabBarStyle: {
          backgroundColor: colors.primary,
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11, marginTop: 2 },
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
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? "notifications" : "notifications-outline"} color={color} focused={focused} testID="tab-notifications" />,
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

function TabIcon({ name, color, focused, accent, testID }: any) {
  if (accent) {
    return (
      <View style={styles.fab} testID={testID}>
        <Ionicons name={name} size={36} color={colors.accent} />
      </View>
    );
  }
  return (
    <View style={focused ? styles.activePill : null} testID={testID}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  activePill: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(244,180,0,0.18)" },
  fab: { marginTop: -18, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.primary },
});
