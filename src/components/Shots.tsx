import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, squircle, type } from '../constants/theme';
import type { SnapMedia } from '../utils/stories';
import { DiscoBall } from './DiscoBall';
import { Icon } from './Icon';
import { ShotCamera } from './ShotCamera';
import { SnapViewer } from './SnapViewer';
import { PressableScale } from './ui/PressableScale';

// Device-only memory of opened shots: id → expiry. Entries disappear with the snap after 24 h.
const storageKey = 'spots.seen-shots.v1';

function useSeenSnaps() {
  const [seen, setSeen] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey).then((raw) => {
      const value: unknown = raw ? JSON.parse(raw) : {};
      if (!active || !value || typeof value !== 'object') return;
      setSeen(Object.fromEntries(Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && Date.parse(entry[1]) > Date.now())));
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const markSeen = useCallback((snap: SnapMedia) => {
    setSeen((previous) => {
      if (previous[snap.id]) return previous;
      const next = { ...previous, [snap.id]: snap.expiresAt };
      void AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);
  return { seen, markSeen };
}

/**
 * Shots: photos posted by visitors (anyone with an account, only while the event runs). Not the organizer's
 * event story. They stay on the event page for 24 hours, but each one can be opened only once, so a single
 * bad moment cannot be replayed again and again. Remembered on this device only; every shot can be reported.
 * Deliberately no list and no numbers: one button opens all new shots, nobody sees how many there are
 * or how many people posted. Always shown, so every event page looks the same; the camera opens only while the event runs.
 */
export function Shots({ snaps, live, ended, now, eventTitle }: { snaps: SnapMedia[]; live: boolean; ended: boolean; now: number; eventTitle: string }) {
  const { seen, markSeen } = useSeenSnaps();
  const [open, setOpen] = useState<SnapMedia[] | null>(null);
  const [camera, setCamera] = useState(false);
  const unseen = snaps.filter((snap) => !seen[snap.id]);
  const onSeen = useCallback((id: string) => { const snap = snaps.find((item) => item.id === id); if (snap) markSeen(snap); }, [snaps, markSeen]);
  const close = useCallback(() => setOpen(null), []);
  const closeCamera = useCallback(() => setCamera(false), []);

  const cover = unseen[0];
  return (
    <View style={styles.block}>
      <Text style={styles.title}>SHOTS</Text>

      {/* Always the same layout on every event page. Posting works only while the event runs; before and after,
          the photo button stays visible but calm and says when it opens. */}
      <PressableScale disabled={!live} accessibilityRole="button" accessibilityState={{ disabled: !live }}
        accessibilityLabel={live ? 'Kamera öffnen und einen Shot posten' : ended ? 'Shots posten ist vorbei' : 'Shots posten geht, sobald das Event läuft'}
        onPress={() => setCamera(true)} scaleTo={0.98} style={styles.post}>
        <Image source={POST_IMAGE} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
        <LinearGradient pointerEvents="none" colors={live ? ['#0a090cf2', '#0a090c99', '#c922ab73'] : ['#0a090cf7', '#0a090cd9', '#0a090cb3']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <View style={styles.postCopy}>
          <Text style={styles.postTitle}>Poste einen SHOT</Text>
          <Text style={styles.postText}>{live ? 'Zeig allen, was hier gerade abgeht.' : ended ? 'Das Event ist vorbei.' : 'Geht los, sobald das Event läuft.'}</Text>
        </View>
        <View style={[styles.postButton, !live && styles.postButtonOff]}><Icon name="camera" size={24} color={live ? colors.accent : colors.faint} /></View>
      </PressableScale>

      {/* Watching: a big button with a spinning, bouncing disco ball. No numbers anywhere. */}
      <PressableScale disabled={!cover} accessibilityRole="button" accessibilityState={{ disabled: !cover }}
        accessibilityLabel={cover ? 'Neue Shots ansehen' : 'Gerade keine neuen Shots'} onPress={() => setOpen(unseen)} scaleTo={0.98} style={[styles.view, !cover && styles.viewEmpty]}>
        {/* Background: the first new shot, slightly blurred and faded, so you only get a hint of it. */}
        {cover
          ? <>
              <Image source={cover.source} resizeMode="cover" blurRadius={8} style={StyleSheet.absoluteFill} />
              <LinearGradient pointerEvents="none" colors={['#0a090ca6', '#0a090c8c', '#2a1222b3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            </>
          : <LinearGradient pointerEvents="none" colors={['#18171b', '#141317']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
        <DiscoBall size={80} dim={!cover} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.viewTitle}>{cover ? 'SHOTS ansehen' : 'Keine neuen SHOTS'}</Text>
          <Text numberOfLines={2} style={styles.viewText}>{cover ? 'Echte Eindrücke von Gästen.' : live ? 'Sei der Erste von heute Nacht!' : ended ? 'Für dieses Event gibt es keine neuen.' : 'Gibt es, sobald das Event läuft.'}</Text>
          <Text style={styles.viewHint}>Jeden SHOT siehst du nur einmal</Text>
        </View>
      </PressableScale>

      <Modal visible={open !== null} animationType="none" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
        {open && <SnapViewer items={open} author={{ name: 'SHOTS', label: 'Von Gästen' }} now={now} onSeen={onSeen} onClose={close} reportable hideCount />}
      </Modal>
      <ShotCamera visible={camera} eventTitle={eventTitle} onClose={closeCamera} />
    </View>
  );
}

// Decorative symbol photo (Unsplash, see assets/events/README.md); it never stands for this event.
const POST_IMAGE = require('../../assets/events/nightlife.jpg');
const styles = StyleSheet.create({
  block: { marginTop: space.xxl, gap: space.md },
  title: { ...type.title3, color: colors.text },
  post: { height: 124, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, ...squircle },
  postCopy: { flex: 1, minWidth: 0, gap: 4 },
  postTitle: { fontSize: 22, lineHeight: 27, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
  postText: { ...type.footnote, color: '#ffffffd9' },
  postButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, boxShadow: '0 0 20px 3px #ff4ab88c' },
  postButtonOff: { backgroundColor: '#ffffff1f', boxShadow: 'none' },
  view: { height: 124, flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.lg, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.accentLine, ...squircle },
  viewEmpty: { borderColor: '#ffffff14' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  viewTitle: { fontSize: 22, lineHeight: 27, fontWeight: '800', letterSpacing: -0.4, color: colors.text, textShadowColor: '#000000aa', textShadowRadius: 8 },
  viewText: { ...type.footnote, color: '#ffffffe6', textShadowColor: '#000000aa', textShadowRadius: 6 },
  viewHint: { ...type.footnote, fontSize: 11, fontWeight: '600', color: colors.pink },
});
