import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts as useHindFonts,
  Hind_400Regular,
  Hind_500Medium,
  Hind_600SemiBold,
  Hind_700Bold,
} from "@expo-google-fonts/hind";
import { Mukta_500Medium, Mukta_700Bold, Mukta_800ExtraBold } from "@expo-google-fonts/mukta";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider } from "@/src/auth";
import { ToastProvider } from "@/src/components/Toast";
import { BUILD_INFO } from "@/src/build-info";

// Keep the native splash visible from cold start until icon fonts register.
SplashScreen.preventAutoHideAsync();

// Banner-log build identity at module load so `adb logcat *:S ReactNativeJS:V`
// shows EXACTLY which commit was compiled into the installed binary.
// This fires once per cold start, before React mounts.
console.log(
  `\n========================================\n` +
  `[CKD-BUILD] v${BUILD_INFO.version} (vc=${BUILD_INFO.versionCode})\n` +
  `[CKD-BUILD] commit=${BUILD_INFO.commit} branch=${BUILD_INFO.branch}\n` +
  `[CKD-BUILD] profile=${BUILD_INFO.profile} runner=${BUILD_INFO.runner}\n` +
  `[CKD-BUILD] easBuildId=${BUILD_INFO.easBuildId || "—"}\n` +
  `[CKD-BUILD] builtAt=${BUILD_INFO.builtAt}\n` +
  `========================================\n`
);

export default function RootLayout() {
  const [iconsLoaded, iconsErr] = useIconFonts();
  const [fontsLoaded] = useHindFonts({
    Hind_400Regular,
    Hind_500Medium,
    Hind_600SemiBold,
    Hind_700Bold,
    Mukta_500Medium,
    Mukta_700Bold,
    Mukta_800ExtraBold,
  });

  useEffect(() => {
    if ((iconsLoaded || iconsErr) && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [iconsLoaded, iconsErr, fontsLoaded]);

  if ((!iconsLoaded && !iconsErr) || !fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F6F5FA" } }} />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
