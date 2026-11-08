import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Animated, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';

export function EventPhotoViewer({ images, initialIndex, onClose }: { images: ImageSourcePropType[]; initialIndex: number; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const [offset] = useState(() => new Animated.Value(0));
  const gesture = useMemo(() => PanResponder.create({
    // Capture only vertical movement; horizontal gestures stay with the pager.
    onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.5,
    onPanResponderMove: (_, { dy }) => offset.setValue(dy),
    onPanResponderRelease: (_, { dy, vy }) => {
      if (Math.abs(dy) > 80 || (Math.abs(dy) > 30 && Math.abs(vy) > 0.7)) onClose();
      else Animated.spring(offset, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(offset, { toValue: 0, useNativeDriver: true }).start(),
  }), [offset, onClose]);

  return <SafeAreaView style={styles.viewer} onAccessibilityEscape={onClose} accessibilityViewIsModal>
    <View style={styles.toolbar}><Text style={styles.counter}>Symbolfoto · {index + 1} / {images.length}</Text><Pressable accessibilityRole="button" accessibilityLabel="Großansicht schließen" onPress={onClose} style={styles.close}><View style={styles.handle} /></Pressable></View>
    <Animated.View style={[styles.fill, { transform: [{ translateY: offset }] }]} {...gesture.panHandlers}>
      <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces={false} directionalLockEnabled style={styles.fill}
        onLayout={() => pager.current?.scrollTo({ x: index * width, animated: false })}
        onMomentumScrollEnd={({ nativeEvent }) => setIndex(Math.max(0, Math.min(images.length - 1, Math.round(nativeEvent.contentOffset.x / width))))}>
        {images.map((source, photoIndex) => <View key={photoIndex} style={[styles.page, { width }]}><Image source={source} style={styles.image} resizeMode="contain" accessibilityLabel={`Symbolfoto ${photoIndex + 1}, kein Foto dieses Demo-Events`} /></View>)}
      </ScrollView>
    </Animated.View>
    <Text style={styles.hint}>Seitlich wischen zum Blättern · Hoch oder runter zum Schließen</Text>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  counter: { color: colors.text, fontSize: 12 },
  handle: { width: 28, height: 4, borderRadius: 2, backgroundColor: colors.muted },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  page: { height: '100%' },
  image: { width: '100%', height: '100%' },
  hint: { color: colors.muted, fontSize: 11, textAlign: 'center', padding: 16 },
});
