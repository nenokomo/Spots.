import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { initials } from '../../components/GalleryPost';
import { Icon } from '../../components/Icon';
import { SnapViewer } from '../../components/SnapViewer';
import { useNow } from '../../hooks/useNow';
import { postShot } from '../../services/content';
import type { MyOrganizer, OrganizerEvent } from '../organizer/organizerApi';
import { canPostStory } from './format';
import type { useEventImages } from './hooks';
import { studio } from './theme';
import { MenuRow, Message, StudioButton, StudioSheet, studioStyles } from './ui';

type Picked = { uri: string; mimeType?: string | null };
type Stage = 'menu' | 'source' | 'preview' | 'done';

/** Rundes Profilbild des Veranstalters: Logo oder Anfangsbuchstaben. */
export function Avatar({ organizer, size }: { organizer: Pick<MyOrganizer, 'displayName' | 'avatarUrl'>; size: number }) {
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    {organizer.avatarUrl
      ? <Image source={{ uri: organizer.avatarUrl }} style={StyleSheet.absoluteFill} accessibilityLabel={`Logo von ${organizer.displayName}`} />
      : <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials(organizer.displayName)}</Text>}
  </View>;
}

/**
 * Die Story eines Events (Entscheidung 25.11.): das runde Profilbild mit „+“. Der leuchtende Ring zeigt, dass gerade
 * eine Story läuft. Tippen öffnet zwei Punkte – „Storys ansehen“ und „Story posten“. Das ist der einzige Ort zum Posten.
 * `images` kommt von der Seite (useEventImages), damit Story und Bilderliste dieselben Daten zeigen.
 */
export function EventStory({ organizer, event, images, size = 76 }: { organizer: MyOrganizer; event: OrganizerEvent; images: ReturnType<typeof useEventImages>; size?: number }) {
  const now = useNow();
  const [stage, setStage] = useState<Stage | null>(null);
  const [viewing, setViewing] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const story = images.story;
  const active = story.length > 0;
  const allowed = canPostStory(event, now);
  const close = () => { setStage(null); setPicked(null); setError(null); };

  function watch() {
    close();
    // iOS zeigt nicht zwei Fenster gleichzeitig: erst das Sheet schließen lassen, dann die Story öffnen.
    setTimeout(() => setViewing(true), Platform.OS === 'ios' ? 350 : 0);
  }

  async function pick(camera: boolean) {
    setError(null);
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setError('Bitte erlaubt Spots in den Einstellungen den Zugriff auf die Kamera.'); return; }
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets[0]) return;
      setPicked({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
      setStage('preview');
    } catch { setError('Das Bild konnte nicht geöffnet werden. Bitte erneut versuchen.'); }
  }

  async function post() {
    if (!picked) return;
    setBusy(true); setError(null);
    try {
      await postShot(event.id, picked, { eventStory: true });
      setPicked(null);
      setStage('done');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Posten hat nicht geklappt.'); }
    finally { setBusy(false); }
  }

  const ringSize = size + 12;
  const picture = <View style={[styles.gap, { borderRadius: (size + 6) / 2 }]}><Avatar organizer={organizer} size={size} /></View>;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={active ? 'Story ansehen oder posten' : 'Story posten'} onPress={() => setStage('menu')} hitSlop={6}
      style={({ pressed }) => [{ width: ringSize, height: ringSize }, pressed && styles.pressed]}>
      {active
        ? <LinearGradient colors={[studio.pink, studio.accent, '#7a2bd6', studio.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.ring, styles.ringGlow, { borderRadius: ringSize / 2 }]}>{picture}</LinearGradient>
        : <View style={[styles.ring, styles.ringPlain, { borderRadius: ringSize / 2 }]}>{picture}</View>}
      <View style={styles.plus}><Icon name="plus" size={15} color={studio.onAccent} /></View>
    </Pressable>

    <StudioSheet visible={stage !== null} title={stage === 'preview' ? 'Story posten?' : stage === 'done' ? 'Gepostet' : 'Story'} onClose={busy ? () => {} : close}>
      {stage === 'menu' && <>
        <MenuRow icon="eye" title="Storys ansehen" hint={active ? (story.length === 1 ? '1 Bild' : `${story.length} Bilder`) : 'Noch keine Story'} disabled={!active} onPress={watch} />
        <MenuRow icon="plus" title="Story posten" hint={allowed ? 'Gäste sehen sie 24 Stunden lang' : 'Geht bis zwei Stunden nach dem Ende'} disabled={!allowed} onPress={() => setStage('source')} />
      </>}
      {stage === 'source' && <>
        <MenuRow icon="camera" title="Foto aufnehmen" onPress={() => void pick(true)} />
        <MenuRow icon="image" title="Aus der Mediathek" onPress={() => void pick(false)} />
        <Message error={error} />
      </>}
      {stage === 'preview' && picked && <>
        <View style={styles.preview}><Image source={{ uri: picked.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Ausgewähltes Bild" /></View>
        <Text style={studioStyles.muted}>{event.title}</Text>
        <Message error={error} />
        <StudioButton label="Posten" loading={busy} onPress={() => void post()} />
        <StudioButton variant="ghost" label="Anderes Bild" disabled={busy} onPress={() => { setPicked(null); setStage('source'); }} />
      </>}
      {stage === 'done' && <>
        <Text style={studioStyles.body}>{event.isPublished ? 'Gäste sehen eure Story jetzt 24 Stunden lang auf der Eventseite.' : 'Die Story ist zu sehen, sobald das Event veröffentlicht ist.'}</Text>
        <StudioButton label="Fertig" onPress={close} />
      </>}
    </StudioSheet>

    <Modal visible={viewing} animationType="none" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={() => setViewing(false)}>
      {viewing && <SnapViewer items={story.map((shot) => ({ id: shot.id, source: { uri: shot.url! }, createdAt: shot.createdAt, expiresAt: shot.expiresAt }))}
        author={{ name: organizer.displayName, avatar: <Avatar organizer={organizer} size={34} />, label: 'Story' }} now={now} onClose={() => setViewing(false)} />}
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: studio.panelHigh },
  initials: { fontWeight: '800', color: studio.text, letterSpacing: -0.5 },
  ring: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringGlow: { boxShadow: '0 0 18px 0 #ff4ab866' },
  ringPlain: { borderWidth: 2, borderColor: studio.accentLine, borderStyle: 'dashed' },
  gap: { padding: 3, backgroundColor: studio.bg },
  plus: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.accent, borderWidth: 3, borderColor: studio.bg },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  preview: { alignSelf: 'center', width: 190, height: 338, overflow: 'hidden', borderRadius: studio.radius, backgroundColor: studio.bg },
});
