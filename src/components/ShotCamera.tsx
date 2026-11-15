import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space, type } from '../constants/theme';
import { Icon } from './Icon';

type Props = { visible: boolean; eventTitle: string; onClose: () => void };

/**
 * „Poste einen Shot“: camera screen for guests at a running event.
 * DESIGN ONLY: there is no camera preview or upload yet. Jacint builds the real camera (expo-camera,
 * development build), the account check and the upload; until then the shutter says so honestly.
 */
export function ShotCamera({ visible, eventTitle, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const native = Platform.OS !== 'web';
  const [notice, setNotice] = useState(false);
  // Vertical offset of the camera sheet: slides in from below, follows the finger when pulled down.
  const [pull] = useState(() => new Animated.Value(height));

  const close = useCallback(() => {
    Animated.timing(pull, { toValue: height, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: native, isInteraction: false }).start(() => { setNotice(false); onClose(); });
  }, [pull, height, native, onClose]);

  useEffect(() => {
    if (!visible) return;
    pull.setValue(height);
    const animation = Animated.spring(pull, { toValue: 0, damping: 26, stiffness: 260, mass: 0.9, useNativeDriver: native, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [visible, pull, height, native]);

  // Pull down anywhere to close, like the stories; buttons keep their own taps.
  const gesture = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => dy > 10 && Math.abs(dy) > Math.abs(dx) * 1.3,
    onPanResponderMove: (_, { dy }) => pull.setValue(Math.max(0, dy)),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 90 || (dy > 25 && vy > 0.5)) close();
      else Animated.spring(pull, { toValue: 0, damping: 22, stiffness: 320, mass: 0.8, useNativeDriver: native }).start();
    },
    onPanResponderTerminate: () => Animated.spring(pull, { toValue: 0, useNativeDriver: native }).start(),
  }), [pull, close, native]);

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, { opacity: pull.interpolate({ inputRange: [0, height * 0.6], outputRange: [1, 0], extrapolate: 'clamp' }) }]} />
      <Animated.View {...gesture.panHandlers} style={[styles.screen, { transform: [{ translateY: pull }] }]}>
        {/* Stand-in for the live camera picture. */}
        <LinearGradient pointerEvents="none" colors={['#1d1420', '#0d0b10', '#000000']} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.frame}>
          {['tl', 'tr', 'bl', 'br'].map((corner) => <View key={corner} style={[styles.corner, styles[corner as 'tl']]} />)}
        </View>
        <View style={[styles.fill, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom }]}>
          <View style={styles.grabber} />
          <View style={styles.top}>
            <Pressable accessibilityRole="button" accessibilityLabel="Kamera schließen" onPress={close} hitSlop={10} style={styles.round}><Icon name="close" color={colors.text} /></Pressable>
            <View style={styles.heading}>
              <Text style={styles.title}>Poste einen SHOT</Text>
              <Text numberOfLines={1} style={styles.event}>{eventTitle}</Text>
            </View>
            <View style={styles.roundSpacer} />
          </View>

          <View style={styles.center}>
            {notice && <View accessibilityRole="alert" style={styles.notice}>
              <Text style={styles.noticeTitle}>Kamera kommt bald</Text>
              <Text style={styles.noticeText}>Hier kannst du bald direkt von der Party einen SHOT posten.</Text>
            </View>}
          </View>

          <View style={styles.bottom}>
            <Text style={styles.rules}>Nur während des Events · 24 Std. sichtbar · jeder sieht ihn nur einmal</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Foto aufnehmen" onPress={() => setNotice(true)} style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}>
              <View style={styles.shutterCore} />
            </Pressable>
            <Text style={styles.hint}>Zum Schließen nach unten ziehen</Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const CORNER = 28;
const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#000000' },
  dim: { backgroundColor: '#000000' },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#ffffff4d', marginBottom: space.sm },
  roundSpacer: { width: 44, height: 44 },
  hint: { ...type.footnote, fontSize: 11, color: colors.faint },
  fill: { flex: 1 },
  frame: { position: 'absolute', top: '18%', bottom: '24%', left: 28, right: 28 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#ffffff59' },
  tl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 10 },
  tr: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 10 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 10 },
  br: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 10 },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff1f' },
  heading: { flex: 1, alignItems: 'center' },
  title: { ...type.headline, color: colors.text },
  event: { ...type.footnote, color: colors.faint },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl },
  notice: { alignItems: 'center', gap: space.xs, padding: space.lg, borderRadius: 18, backgroundColor: '#1c1b1fe6' },
  noticeTitle: { ...type.headline, color: colors.text },
  noticeText: { ...type.footnote, color: colors.muted, textAlign: 'center' },
  bottom: { alignItems: 'center', gap: space.md, paddingBottom: space.lg },
  rules: { ...type.footnote, color: '#ebebf5b3', textAlign: 'center', paddingHorizontal: space.xl },
  shutter: { width: 82, height: 82, borderRadius: 41, borderWidth: 5, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  shutterPressed: { transform: [{ scale: 0.92 }] },
  shutterCore: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.pink },
});
