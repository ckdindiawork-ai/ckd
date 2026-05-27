/**
 * Inline video player wrapping expo-video.
 * Loads the video eagerly so the first frame is visible immediately with
 * native play/pause/seek controls. On web, falls back to a native <video>
 * element if expo-video isn't available. Last-resort: tap-to-open link.
 */
import React, { useEffect, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { colors, radius } from "@/src/theme";
import { TText } from "@/src/components/ui";

export function VideoPlayer({
  uri,
  style,
  height = 220,
}: {
  uri: string;
  style?: StyleProp<ViewStyle>;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);

  // Eagerly create player so the video first-frame shows immediately.
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
  });

  // Web: prefer a native <video> tag which has built-in controls and reliable codec support.
  if (Platform.OS === "web") {
    return (
      <View style={[{ width: "100%", height, borderRadius: radius.md, overflow: "hidden", backgroundColor: "#000" }, style]}>
        {/* eslint-disable-next-line react/no-unknown-property */}
        {React.createElement("video", {
          src: uri,
          controls: true,
          playsInline: true,
          preload: "metadata",
          style: { width: "100%", height: "100%", objectFit: "cover", background: "#000" },
        })}
      </View>
    );
  }

  if (failed) {
    return (
      <Pressable
        onPress={() => Linking.openURL(uri).catch(() => {})}
        style={[styles.fallback, { height }, style]}
      >
        <Ionicons name="videocam" size={28} color={colors.primary} />
        <TText weight="bold" style={{ color: colors.primary, marginTop: 8 }}>वीडियो खोलें</TText>
        <TText style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>ब्राउज़र में देखने के लिए टैप करें</TText>
      </Pressable>
    );
  }

  try {
    return (
      <VideoView
        player={player}
        style={[{ width: "100%", height, borderRadius: radius.md, backgroundColor: "#000" }, style]}
        contentFit="cover"
        allowsFullscreen
        allowsPictureInPicture
        nativeControls
      />
    );
  } catch {
    setTimeout(() => setFailed(true), 0);
    return null;
  }
}

const styles = StyleSheet.create({
  fallback: {
    width: "100%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
