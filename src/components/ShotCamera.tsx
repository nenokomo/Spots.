import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space, type } from '../constants/theme';
import { Icon } from './Icon';

type Props = { visible: boolean; eventTitle: string; onClose: () => void };

/**
 * „Poste einen Shot“: camera screen for guests at a running event.
 * DESIGN ONLY: there is no camera preview or upload yet. Jacint builds the real camera (expo-camera,
 * development build), the account check and the upload; until then the shutter says so honestly.
 */
export function ShotCamera({ visible, eventTitle, onClose }: Props) {
  const [notice, setNotice] = useState(false);
  const close = () => { setNotice(false); onClose(); };
  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <View style={styles.screen}>
        {/* Stand-in for the live camera picture. */}
        <LinearGradient pointerEvents="none" colors={['#1d1420', '#0d0b10', '#000000']} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.frame}>
          {['tl', 'tr', 'bl', 'br'].map((corner) => <View key={corner} style={[styles.corner, styles[corner as 'tl']]} />)}
        </View>
        <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
          <View style={styles.top}>
            <Pressable accessibilityRole="button" accessibilityLabel="Kamera schließen" onPress={close} hitSlop={8} style={styles.round}><Icon name="close" color={colors.text} /></Pressable>
            <View style={styles.heading}>
              <Text style={styles.title}>Poste einen Shot</Text>
              <Text numberOfLines={1} style={styles.event}>{eventTitle}</Text>
            </View>
            <View style={styles.round} />
          </View>

          <View style={styles.center}>
            {notice && <View accessibilityRole="alert" style={styles.notice}>
              <Text style={styles.noticeTitle}>Kamera kommt bald</Text>
              <Text style={styles.noticeText}>Hier kannst du bald direkt von der Party einen Shot posten.</Text>
            </View>}
          </View>

          <View style={styles.bottom}>
            <Text style={styles.rules}>Nur während des Events · 24 Std. sichtbar · jeder sieht ihn nur einmal</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Foto aufnehmen" onPress={() => setNotice(true)} style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}>
              <View style={styles.shutterCore} />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const CORNER = 28;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
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
  bottom: { alignItems: 'center', gap: space.lg, paddingBottom: space.xl },
  rules: { ...type.footnote, color: '#ebebf5b3', textAlign: 'center', paddingHorizontal: space.xl },
  shutter: { width: 82, height: 82, borderRadius: 41, borderWidth: 5, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  shutterPressed: { transform: [{ scale: 0.92 }] },
  shutterCore: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.pink },
});
