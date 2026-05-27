/**
 * 3-slide onboarding intro. On finish, set ckd_onboarded and route to login.
 */
import React, { useRef, useState } from "react";
import { Dimensions, FlatList, Image, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, spacing } from "@/src/theme";
import { Button, TText } from "@/src/components/ui";
import { storage } from "@/src/utils/storage";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    image: "https://images.pexels.com/photos/36713460/pexels-photo-36713460.jpeg",
    title: "आंदोलन में जुड़िए",
    body: "हज़ारों युवाओं के साथ मिलकर समाज बदलने का सफ़र शुरू करें।",
  },
  {
    image: "https://images.pexels.com/photos/8543585/pexels-photo-8543585.jpeg",
    title: "अभियान चलाइए",
    body: "नदी सफ़ाई, मोहल्ला सफ़ाई, पौधारोपण — हर बदलाव से शुरू होती है क्रांति।",
  },
  {
    image: "https://images.unsplash.com/photo-1560220604-1985ebfe28b1",
    title: "समस्या उठाइए, हल कीजिए",
    body: "अपने शहर की समस्या रिपोर्ट करें, दूसरों की मदद करें, क्रांति पॉइंट्स कमाएँ।",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const ref = useRef<FlatList<any>>(null);
  const [idx, setIdx] = useState(0);

  const finish = async () => {
    await storage.setItem("ckd_onboarded", true);
    router.replace("/auth/login");
  };
  const next = () => {
    if (idx < SLIDES.length - 1) ref.current?.scrollToIndex({ index: idx + 1 });
    else finish();
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", padding: spacing.lg }}>
        <Pressable onPress={finish} testID="onboarding-skip">
          <TText weight="bold" style={{ color: colors.muted }}>छोड़ें</TText>
        </Pressable>
      </View>
      <FlatList
        ref={ref}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={{ width, padding: spacing.xl, alignItems: "center" }}>
            <View style={styles.imageWrap}>
              <Image source={{ uri: item.image }} style={styles.image} />
              <View style={styles.imageOverlay} />
            </View>
            <TText weight="display" style={styles.title}>{item.title}</TText>
            <TText style={styles.body}>{item.body}</TText>
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
        ))}
      </View>
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}>
        <Button label={idx === SLIDES.length - 1 ? "शुरू करें" : "आगे बढ़ें"} icon="arrow-forward" onPress={next} testID="onboarding-next" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  imageWrap: { width: width - 64, height: 320, borderRadius: 24, overflow: "hidden", marginTop: 8 },
  image: { width: "100%", height: "100%" },
  imageOverlay: { position: "absolute", inset: 0, backgroundColor: colors.primary, opacity: 0.08 },
  title: { fontSize: 26, color: colors.text, textAlign: "center", marginTop: 32, fontFamily: fonts.display },
  body: { fontSize: 15, color: colors.muted, textAlign: "center", marginTop: 12, lineHeight: 22, paddingHorizontal: 16 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary + "33" },
  dotActive: { width: 24, backgroundColor: colors.primary },
});
