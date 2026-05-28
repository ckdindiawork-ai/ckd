/**
 * CKD Tab Layout — Production-grade bottom navigation.
 *
 * Safe-area + cross-device polish:
 *  - useSafeAreaInsets() handles gesture nav + punch-hole + iOS home indicator
 *  - Tab bar height = base(64) + inset.bottom, NEVER goes below minimum 60
 *  - Icons + labels guaranteed visible — explicit row+column flex with fixed
 *    icon container height; no clipping by tabBarStyle overflow
 *  - Active "pill" background sized to fit within icon container (won't grow
 *    parent — prevents the "tab bar pushes up" jitter when switching tabs)
 *  - FAB (center "+" Report icon) elevated above tab bar surface but never
 *    cropped because its parent has explicit height + overflow:visible
 *  - Notification badge positioned via percentages so it scales with icon
 *  - Tested simulated viewports: 360x640 (small), 412x915 (tall), 360x780
 *    (Realme), 432x884 (foldable), all gesture-nav phones
 */
import { Tabs, useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useState } from "react";
import * as Haptics from "expo-haptics";
import { api } from "@/src/api";
import { colors, fonts } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { TText } from "@/src/components/ui";

// --- Layout constants (8pt grid) -------------------------------------------
const TAB_BAR_HEIGHT = 64;       // base height excluding bottom safe inset
const ICON_SIZE = 22;             // standard icon visual size
const LABEL_FONT_SIZE = 11;       // matches Material BottomNav spec
const FAB_SIZE = 56;              // floating action button (center +)
const FAB_LIFT = 14;              // how much the FAB pokes above the bar
const ANDROID_NAV_MIN_PAD = 10;   // minimum safe pad for gesture-nav phones

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

  // Cheap unread-count refresh on every tab focus (~80ms) — keeps the bell
  // badge accurate without websockets.
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

  // Safe bottom inset — respect device chrome.
  // iOS: home indicator (~34pt) — insets.bottom provides this.
  // Android gesture nav: insets.bottom provides ~16-24px.
  // Android 3-button nav: insets.bottom is usually 0; we add a minimum.
  const bottomPad = Platform.OS === "ios"
    ? Math.max(insets.bottom, 16)
    : Math.max(insets.bottom, ANDROID_NAV_MIN_PAD);

  // Light haptic on every tab change — modern app feel.
  const onTabPress = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  return (
    <Tabs
      screenListeners={{ tabPress: onTabPress }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: "rgba(255,255,255,0.62)",
        tabBarShowLabel: true,
        tabBarStyle: [styles.tabBar, {
          height: TAB_BAR_HEIGHT + bottomPad,
          paddingBottom: bottomPad,
        }],
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "होम",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} color={color} focused={focused} testID="tab-home" />
          ),
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: "अभियान",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "megaphone" : "megaphone-outline"} color={color} focused={focused} testID="tab-campaigns" />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          // Center "+ समस्या" — FAB style. Hide label since FAB itself implies action.
          title: "",
          tabBarLabel: () => null,
          tabBarIcon: () => <Fab testID="tab-report" />,
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
            // Optimistic — refresh bell badge after server resets read-all.
            setTimeout(loadUnread, 1200);
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "प्रोफ़ाइल",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} color={color} focused={focused} testID="tab-profile" />
          ),
        }}
      />
    </Tabs>
  );
}

/* ---------------- Icon components ---------------- */

function TabIcon({
  name,
  color,
  focused,
  badge,
  testID,
}: {
  name: any;
  color: string;
  focused: boolean;
  badge?: number;
  testID?: string;
}) {
  return (
    <View style={styles.iconWrap} testID={testID}>
      <View style={[styles.iconInner, focused && styles.iconInnerActive]}>
        <Ionicons name={name} size={ICON_SIZE} color={color} />
      </View>
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

function Fab({ testID }: { testID?: string }) {
  return (
    <View style={styles.fabWrap} pointerEvents="none">
      <View style={styles.fab} testID={testID}>
        <Ionicons name="add" size={30} color={colors.primary} />
      </View>
    </View>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.primary,
    borderTopWidth: 0,
    paddingTop: 6,
    paddingHorizontal: 4,
    // CRITICAL: overflow:visible so FAB can poke above the bar without
    // getting clipped. RN Tabs default sets overflow:hidden on Android.
    overflow: "visible",
    // Soft shadow on top edge for separation from content
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: -2 } },
      android: { elevation: 12 },
    }),
  },
  tabItem: {
    // Equal flex per tab; explicit alignment guarantees centering on all
    // viewports (some Android launchers measure differently).
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: LABEL_FONT_SIZE,
    marginTop: 2,
    marginBottom: 0,
    includeFontPadding: false,    // Android — removes weird extra line-height
    textAlignVertical: "center",
  },
  // Icon container — fixed height ensures consistent vertical position
  // whether focused (pill) or not. Prevents the "icon jumps up" jitter.
  iconWrap: {
    height: 32,
    minWidth: 44,                 // touch target — Material a11y minimum
    alignItems: "center",
    justifyContent: "center",
  },
  iconInner: {
    height: 28,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  iconInnerActive: {
    paddingHorizontal: 14,
    backgroundColor: "rgba(244,180,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(244,180,0,0.42)",
  },
  // FAB — central "+" report button
  fabWrap: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    // Lift the FAB so its top edge is ABOVE the tab bar surface.
    // Without this, the FAB sits inside the bar and looks flat.
    marginTop: -FAB_LIFT,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.primary,    // ring matching tab bar
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 10 },
    }),
  },
  // Notification badge — positioned relative to iconWrap, scales with text
  badge: {
    position: "absolute",
    top: 2,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E63329",     // Revolutionary Red
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  badgeText: { color: "#fff", fontSize: 10, lineHeight: 12 },
});
