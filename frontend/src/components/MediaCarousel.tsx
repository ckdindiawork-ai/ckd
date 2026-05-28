/**
 * MediaCarousel — swipe gallery for campaign / issue media.
 *
 * Design goals (Phase 2/P3):
 *   - Smooth horizontal swipe on entry-level Android (no jank)
 *   - Memory safe: only ±1 image around current index is decoded
 *   - Disk cache via expo-image (built-in)
 *   - Single-tap → opens fullscreen viewer (TODO Phase 2.5 / 5)
 *   - Video items show static thumbnail + play overlay; tap to expand
 *   - Pagination dots only (no thumbnail strip — saves rendering on low-end)
 *
 * Implementation:
 *   - Uses FlatList with pagingEnabled (works everywhere, no extra deps)
 *   - getItemLayout for instant scroll
 *   - keyExtractor stable per media URL
 *
 * API:
 *   <MediaCarousel
 *     items={[{ type: 'image', url: '...' }, { type: 'video', url: '...', thumbnail_url: '...' }]}
 *     onPressItem={(item, idx) => router.push(...)}
 *   />
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "@/src/theme";
import { Skeleton } from "@/src/components/Skeleton";

export type MediaItem = {
  type: "image" | "video";
  url: string;
  thumbnail_url?: string;
  order?: number;
  is_cover?: boolean;
};

const { width: SCREEN_W } = Dimensions.get("window");
// Carousel default occupies most of the screen width minus screen padding.
const CARD_W = SCREEN_W;
const CARD_H = Math.round(SCREEN_W * 0.62);  // 16:10 aspect — universal feel

export function MediaCarousel({
  items,
  onPressItem,
  height,
  testID = "media-carousel",
}: {
  items: MediaItem[];
  onPressItem?: (item: MediaItem, index: number) => void;
  /** Override card height — defaults to ~62% of screen width. */
  height?: number;
  testID?: string;
}) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<MediaItem>>(null);
  const cardH = height || CARD_H;

  // Normalize + sort items (handle legacy items missing order)
  const sorted = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [items]);

  const onScroll = useCallback((e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / CARD_W);
    if (newIndex !== index && newIndex >= 0 && newIndex < sorted.length) {
      setIndex(newIndex);
    }
  }, [index, sorted.length]);

  const renderItem = useCallback(({ item, index: idx }: { item: MediaItem; index: number }) => {
    const isVisible = Math.abs(idx - index) <= 1;
    const thumb = item.type === "video" ? (item.thumbnail_url || item.url) : item.url;
    return (
      <Pressable
        onPress={() => onPressItem?.(item, idx)}
        style={[styles.card, { width: CARD_W, height: cardH }]}
        testID={`${testID}-item-${idx}`}
      >
        {isVisible ? (
          <ExpoImage
            source={{ uri: thumb }}
            style={StyleSheet.absoluteFill as any}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            recyclingKey={`${idx}-${item.url}`}
            placeholder={null}
            placeholderContentFit="cover"
          />
        ) : (
          <Skeleton width="100%" height={cardH} radius={0} />
        )}
        {item.type === "video" && isVisible && (
          <View style={styles.playOverlay} pointerEvents="none">
            <View style={styles.playBtn}>
              <Ionicons name="play" size={28} color="#fff" />
            </View>
          </View>
        )}
      </Pressable>
    );
  }, [index, cardH, onPressItem, testID]);

  if (sorted.length === 0) return null;

  // Single item — no carousel chrome
  if (sorted.length === 1) {
    return (
      <View style={[styles.singleWrap, { height: cardH }]}>
        {renderItem({ item: sorted[0], index: 0 })}
      </View>
    );
  }

  return (
    <View testID={testID}>
      <FlatList
        ref={listRef}
        data={sorted}
        renderItem={renderItem}
        keyExtractor={(item, idx) => `${idx}-${item.url.slice(-24)}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: CARD_W, offset: CARD_W * i, index: i })}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
        decelerationRate="fast"
      />
      {/* Pagination dots */}
      <View style={styles.dotsWrap} pointerEvents="none">
        {sorted.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>
      {/* Position counter pill */}
      <View style={styles.counter} pointerEvents="none">
        <Ionicons name="images" size={11} color="#fff" />
        <View style={{ width: 4 }} />
        <ExpoImageCounter index={index + 1} total={sorted.length} />
      </View>
    </View>
  );
}

function ExpoImageCounter({ index, total }: { index: number; total: number }) {
  // Imperative-friendly tiny text — separate component so it's easy to
  // swap for animation later.
  const { TText } = require("@/src/components/ui");
  return (
    <TText weight="bold" style={styles.counterText}>{`${index} / ${total}`}</TText>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  singleWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  dotsWrap: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.accent,
  },
  counter: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  counterText: { color: "#fff", fontSize: 11, fontFamily: "monospace" },
});

export default MediaCarousel;
