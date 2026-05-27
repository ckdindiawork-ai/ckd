/**
 * Privacy Policy page.
 */
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, TText } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme";

export default function Privacy() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>
        <TText weight="display" style={{ fontSize: 20 }}>गोपनीयता नीति</TText>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 14, paddingBottom: 40 }}>
        <Card>
          <TText weight="display" style={{ fontSize: 18 }}>हम क्या इकट्ठा करते हैं?</TText>
          <TText style={{ marginTop: 8, lineHeight: 22 }}>• मोबाइल नंबर (पहचान के लिए){"\n"}• नाम, ईमेल (वैकल्पिक){"\n"}• शहर और इलाक़ा (पूरा पता नहीं){"\n"}• प्रोफ़ाइल फ़ोटो (वैकल्पिक){"\n"}• आपके पोस्ट, टिप्पणी, फ़ोटो</TText>
        </Card>
        <Card>
          <TText weight="display" style={{ fontSize: 18 }}>हम क्या नहीं करते?</TText>
          <TText style={{ marginTop: 8, lineHeight: 22 }}>• आपका मोबाइल नंबर सार्वजनिक नहीं करते{"\n"}• आपका पूरा पता नहीं माँगते{"\n"}• GPS ट्रैकिंग नहीं करते{"\n"}• विज्ञापनदाताओं को डेटा नहीं बेचते</TText>
        </Card>
        <Card>
          <TText weight="display" style={{ fontSize: 18 }}>आपके अधिकार</TText>
          <TText style={{ marginTop: 8, lineHeight: 22 }}>आप अपना खाता कभी भी डिलीट कर सकते हैं। आपका डेटा हटाने का अनुरोध privacy@ckd.in पर भेजें।</TText>
        </Card>
        <Card style={{ backgroundColor: colors.primary }}>
          <TText weight="bold" style={{ color: "#fff" }}>संपर्क: privacy@ckd.in</TText>
          <TText style={{ color: "rgba(255,255,255,0.85)", marginTop: 4, fontSize: 13 }}>अंतिम अद्यतन: फ़रवरी 2026</TText>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.lg },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
});
