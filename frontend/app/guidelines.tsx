/**
 * Community Guidelines static page.
 */
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, TText } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme";

const RULES = [
  { icon: "people", title: "सम्मान", body: "हर सदस्य का सम्मान करें — जाति, धर्म, लिंग या क्षेत्र के आधार पर भेदभाव सख़्त मना है।" },
  { icon: "shield-checkmark", title: "सच्चाई", body: "ग़लत जानकारी, फ़र्ज़ी ख़बरें या भ्रामक सामग्री पोस्ट न करें।" },
  { icon: "ban", title: "अहिंसा", body: "हिंसा, धमकी, या किसी भी प्रकार की hateful सामग्री बर्दाश्त नहीं।" },
  { icon: "lock-closed", title: "गोपनीयता", body: "किसी का व्यक्तिगत डेटा, फ़ोन नंबर या पता बिना अनुमति साझा न करें।" },
  { icon: "checkmark-circle", title: "रचनात्मक", body: "केवल समस्या नहीं, समाधान भी सुझाइए। आंदोलन सकारात्मक बदलाव के लिए है।" },
  { icon: "flag", title: "रिपोर्ट", body: "नियमों का उल्लंघन देखें तो तुरंत रिपोर्ट करें। हमारी टीम कार्रवाई करेगी।" },
];

export default function Guidelines() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>
        <TText weight="display" style={{ fontSize: 20 }}>समुदाय के नियम</TText>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: 12 }}>
        <Card style={{ backgroundColor: colors.primary, padding: 20 }}>
          <TText weight="display" style={{ color: "#fff", fontSize: 18 }}>क्रांति, अनुशासन से चलती है।</TText>
          <TText style={{ color: "rgba(255,255,255,0.85)", marginTop: 6, lineHeight: 21 }}>एक मज़बूत आंदोलन के लिए कुछ नियम मानने ज़रूरी हैं। CKD पर जुड़ने वाले हर सदस्य से इन नियमों का पालन अपेक्षित है।</TText>
        </Card>
        {RULES.map((r, i) => (
          <Card key={i} style={{ flexDirection: "row", gap: 14 }}>
            <View style={styles.ruleIcon}><Ionicons name={r.icon as any} size={22} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <TText weight="bold" style={{ fontSize: 15 }}>{r.title}</TText>
              <TText style={{ color: colors.muted, marginTop: 4, lineHeight: 20, fontSize: 13 }}>{r.body}</TText>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.lg },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  ruleIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center" },
});
