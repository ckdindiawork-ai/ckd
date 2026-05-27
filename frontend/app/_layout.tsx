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

// Keep the native splash visible from cold start until icon fonts register.
SplashScreen.preventAutoHideAsync();

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
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F6F5FA" } }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
