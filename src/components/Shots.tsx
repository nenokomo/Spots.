import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, squircle, type } from '../constants/theme';
import type { SnapMedia } from '../utils/stories';
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
 * or how many people posted. While the event runs, a camera button leads to „Poste einen Shot“.
 */
export function Shots({ snaps, live, now, eventTitle }: { snaps: SnapMedia[]; live: boolean; now: number; eventTitle: string }) {
  const { seen, markSeen } = useSeenSnaps();
  const [open, setOpen] = useState<SnapMedia[] | null>(null);
  const [camera, setCamera] = useState(false);
  const unseen = snaps.filter((snap) => !seen[snap.id]);
  const onSeen = useCallback((id: string) => { const snap = snaps.find((item) => item.id === id); if (snap) markSeen(snap); }, [snaps, markSeen]);
  const close = useCallback(() => setOpen(null), []);
  const closeCamera = useCallback(() => setCamera(false), []);

  if (snaps.length === 0 && !live) return null;
  const cover = unseen[0];
  return (
    <View style={styles.block}>
      <Text style={styles.title}>Shots</Text>
      <Text style={styles.note}>Echte Eindrücke von Gästen. Jeden Shot siehst du nur einmal.</Text>
      <View style={styles.actions}>
        <PressableScale disabled={!cover} accessibilityRole="button" accessibilityState={{ disabled: !cover }}
          accessibilityLabel={cover ? 'Neue Shots ansehen' : 'Gerade keine neuen Shots'} onPress={() => setOpen(unseen)} scaleTo={0.97}
          style={[styles.open, !cover && styles.openEmpty]}>
          {cover && <>
            <Image source={cover.source} resizeMode="cover" blurRadius={18} style={StyleSheet.absoluteFill} />
            <LinearGradient pointerEvents="none" colors={['#c922ab55', '#0a090ccc']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </>}
          <View style={[styles.openIcon, !cover && styles.openIconEmpty]}><Icon name="wave" size={20} color={colors.text} /></View>
          <Text style={styles.openTitle}>{cover ? 'Shots ansehen' : 'Keine neuen Shots'}</Text>
          <Text style={styles.openText}>{cover ? 'Antippen und durchklicken' : live ? 'Sei der Erste von heute Nacht' : 'Schau später wieder vorbei'}</Text>
        </PressableScale>
        {live && <PressableScale accessibilityRole="button" accessibilityLabel="Kamera öffnen und einen Shot posten" onPress={() => setCamera(true)} scaleTo={0.97} style={styles.post}>
          <LinearGradient pointerEvents="none" colors={[colors.pink, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.postIcon}><Icon name="camera" size={22} color={colors.text} /></View>
          <Text style={styles.openTitle}>Shot posten</Text>
          <Text style={styles.postText}>Zeig, was gerade abgeht</Text>
        </PressableScale>}
      </View>
      <Modal visible={open !== null} animationType="none" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
        {open && <SnapViewer items={open} author={{ name: 'Shots', label: 'Von Gästen' }} now={now} onSeen={onSeen} onClose={close} reportable hideCount />}
      </Modal>
      <ShotCamera visible={camera} eventTitle={eventTitle} onClose={closeCamera} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: space.xxl, gap: space.xs },
  title: { ...type.title3, color: colors.text },
  note: { ...type.footnote, color: colors.faint },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  open: { flex: 1, height: 132, padding: space.md, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end', gap: 2, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.pink, ...squircle },
  openEmpty: { borderColor: '#ffffff1a', backgroundColor: '#ffffff0a' },
  openIcon: { position: 'absolute', top: space.md, left: space.md, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff26' },
  openIconEmpty: { backgroundColor: '#ffffff12' },
  openTitle: { ...type.headline, color: colors.text },
  openText: { ...type.footnote, color: '#ebebf5cc' },
  post: { flex: 1, height: 132, padding: space.md, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end', gap: 2, ...squircle },
  postIcon: { position: 'absolute', top: space.md, left: space.md, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff33' },
  postText: { ...type.footnote, color: '#ffffffd9' },
});
