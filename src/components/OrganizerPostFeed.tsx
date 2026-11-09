import { useMemo, useState } from 'react';
import { Animated, FlatList, Image, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import type { Organizer } from '../data/organizers';
import type { OrganizerPost } from '../data/organizerPosts';

export function OrganizerPostFeed({ organizer, posts, initialIndex, onClose }: { organizer: Organizer; posts: OrganizerPost[]; initialIndex: number; onClose: () => void }) {
  const { width, fontScale } = useWindowDimensions();
  const [feedWidth, setFeedWidth] = useState<number | null>(null);
  const pageWidth = feedWidth ?? width;
  const postWidth = Math.max(1, pageWidth - 24);
  const headerHeight = 64 * fontScale;
  const captionHeight = 110 * fontScale;
  const [offset] = useState(() => new Animated.Value(0));
  const gesture = useMemo(() => PanResponder.create({
    // A rightward swipe dismisses the feed; vertical swipes keep scrolling posts.
    onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => dx > 12 && dx > Math.abs(dy) * 1.5,
    onPanResponderMove: (_, { dx }) => offset.setValue(Math.max(0, dx)),
    onPanResponderRelease: (_, { dx, vx }) => {
      if (dx > 80 || (dx > 30 && vx > 0.7)) onClose();
      else Animated.spring(offset, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(offset, { toValue: 0, useNativeDriver: true }).start(),
  }), [offset, onClose]);
  const rowHeight = headerHeight + postWidth + captionHeight + 16;
  return <SafeAreaView style={styles.screen} onAccessibilityEscape={onClose} accessibilityViewIsModal onLayout={({ nativeEvent }) => setFeedWidth(nativeEvent.layout.width)}>
    <Animated.View style={[styles.fill, { transform: [{ translateX: offset }] }]} {...gesture.panHandlers}>
    <View style={styles.toolbar}><View><Text style={styles.title}>Beiträge</Text><Text style={styles.meta}>Nach rechts wischen zum Schließen</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Beiträge schließen" onPress={onClose} style={styles.close}><View style={styles.handle} /></Pressable></View>
    <FlatList key={`${pageWidth}-${fontScale}`} data={posts} keyExtractor={post => post.id} initialScrollIndex={initialIndex} getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
      renderItem={({ item }) => <View style={{ height: rowHeight, paddingHorizontal: 12, paddingBottom: 16 }}><View style={styles.post}>
        <View style={[styles.author, { height: headerHeight }]}><Image source={organizer.image} style={styles.avatar} /><View style={styles.copy}><Text style={styles.authorName}>{organizer.name}</Text></View></View>
        <View style={{ width: postWidth, height: postWidth }}><Image source={item.image} style={styles.image} resizeMode="cover" accessibilityLabel="Beitragsbild – Symbolfoto" /></View>
        <View style={[styles.caption, { height: captionHeight }]}><Text style={styles.captionText}><Text style={styles.authorName}>{organizer.name} </Text>{item.caption}</Text>{item.isDemo && <Text style={styles.disclaimer}>Symbolfoto · Kein echter Veranstalterbeitrag</Text>}</View>
      </View></View>} />
    </Animated.View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  post: { borderRadius: 18, overflow: 'hidden', backgroundColor: colors.surface },
  fill: { flex: 1 }, handle: { width: 28, height: 4, borderRadius: 2, backgroundColor: colors.muted },
  screen: { flex: 1, backgroundColor: colors.background }, toolbar: { minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, backgroundColor: colors.surface }, avatar: { width: 36, height: 36, borderRadius: 18 }, copy: { flex: 1 },
  authorName: { color: colors.text, fontSize: 14, fontWeight: '700', lineHeight: 21 }, meta: { color: colors.muted, fontSize: 11, lineHeight: 17 }, image: { width: '100%', height: '100%' },
  caption: { paddingHorizontal: 14, paddingVertical: 14, gap: 8, backgroundColor: colors.surface }, captionText: { color: colors.text, fontSize: 13, lineHeight: 20 }, disclaimer: { color: colors.muted, fontSize: 10, lineHeight: 16 },
});
