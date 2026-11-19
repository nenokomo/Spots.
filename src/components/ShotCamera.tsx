import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space, type } from '../constants/theme';
import { useAccountSession } from '../features/accounts/useAccountSession';
import { postShot } from '../services/content';
import { Icon } from './Icon';

type Props = { visible: boolean; eventId: string; eventTitle: string; onClose: () => void };
type Notice = { title: string; text: string; signIn?: boolean } | null;

/**
 * „Poste einen Shot“: camera screen for guests at a running event (design: Noyan).
 * Shutter (Jacint): opens the phone camera (expo-image-picker, works in Expo Go), uploads the photo and posts it
 * right away (SQL 17/30). Only with an account. A live preview inside this frame needs expo-camera and a
 * development build later.
 */
export function ShotCamera({ visible, eventId, eventTitle, onClose }: Props) {
  const { session } = useAccountSession();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const native = Platform.OS !== 'web';
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  // Vertical offset of the camera sheet: slides in from below, follows the finger when pulled down.
  const [pull] = useState(() => new Animated.Value(height));

  const close = useCallback(() => {
    Animated.timing(pull, { toValue: height, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: native, isInteraction: false }).start(() => { setNotice(null); onClose(); });
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

  async function shoot() {
    if (busy) return;
    if (!session) {
      setNotice({ title: 'Bitte anmelden', text: 'SHOTS posten und ansehen geht nur mit Konto.', signIn: true });
      return;
    }
    setNotice(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setNotice({ title: 'Kein Kamerazugriff', text: 'Erlaube Spots in den Einstellungen den Zugriff auf die Kamera.' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try {
      await postShot(eventId, result.assets[0]);
      setNotice({ title: 'Dein Shot ist live', text: 'Er ist jetzt 24 Stunden auf der Eventseite zu sehen.' });
      setTimeout(close, 1400);
    } catch (failure) {
      setNotice({ title: 'Hat nicht geklappt', text: failure instanceof Error ? failure.message : 'Bitte erneut versuchen.' });
    } finally {
      setBusy(false);
    }
  }
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
            {busy && <ActivityIndicator color={colors.text} />}
            {notice && <View accessibilityRole="alert" style={styles.notice}>
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              <Text style={styles.noticeText}>{notice.text}</Text>
              {notice.signIn && <Pressable accessibilityRole="button" onPress={() => { close(); router.push('/account'); }} hitSlop={8}>
                <Text style={styles.noticeLink}>Anmelden oder registrieren</Text>
              </Pressable>}
            </View>}
          </View>

          <View style={styles.bottom}>
            <Text style={styles.rules}>Nur während des Events · 24 Std. sichtbar · jeder sieht ihn nur einmal</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Foto aufnehmen" accessibilityState={{ busy }} disabled={busy} onPress={() => void shoot()} style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}>
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
  noticeLink: { ...type.label, color: colors.pink, marginTop: space.xs },
  bottom: { alignItems: 'center', gap: space.md, paddingBottom: space.lg },
  rules: { ...type.footnote, color: '#ebebf5b3', textAlign: 'center', paddingHorizontal: space.xl },
  shutter: { width: 82, height: 82, borderRadius: 41, borderWidth: 5, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  shutterPressed: { transform: [{ scale: 0.92 }] },
  shutterCore: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.pink },
});
