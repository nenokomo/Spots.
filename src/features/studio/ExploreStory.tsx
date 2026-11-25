import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StoryViewer } from '../../components/EventStoryViewer';
import { OrganizerStoryTile } from '../../components/OrganizerStoryTile';
import { useNow } from '../../hooks/useNow';
import { useToday } from '../../hooks/useToday';
import type { ExploreOrganizer, OrganizerStoryItem } from '../../services/organizerStories';
import { organizerStoryPage } from '../../utils/stories';
import { addStoryItem, deleteStoryItem, maxStoryItems, type MyOrganizer, type OrganizerEvent } from '../organizer/organizerApi';
import { dayFormat, isUpcoming } from './format';
import type { useExploreStory } from './hooks';
import { RingAvatar } from './Story';
import { studio, studioType } from './theme';
import { Chip, Input, MenuRow, Message, Pill, StudioButton, StudioSheet, studioStyles } from './ui';

type Picked = { uri: string; mimeType?: string | null };
type Stage = 'menu' | 'add' | 'manage';
type Props = {
  organizer: MyOrganizer; events: OrganizerEvent[]; story: ReturnType<typeof useExploreStory>; size?: number;
  /** Das Sheet wird von der Seite gesteuert, damit auch „Noch offen“ es öffnen kann. */
  open: boolean; onOpen: (open: boolean) => void;
};

/**
 * „Story in Entdecken“ (SQL 33): die dauerhaften Bilder des Veranstalters. Gäste sehen sie in Entdecken als Kachel,
 * wenn sie nach Veranstaltern in ihrer Stadt schauen; sie bleiben, bis man sie löscht.
 * Dieselbe Geste wie am Event: das Profilbild mit „+“. Tippen zeigt oben **dieselbe Kachel wie in Entdecken** und darunter
 * „Story ansehen“ (wie ein Gast), „Bild hinzufügen“ und „Bilder verwalten“.
 * Nicht zu verwechseln mit der Story eines Events (24 Stunden, Profilbild mit „+“ auf der Eventseite).
 */
export function ExploreStory({ organizer, events, story, size = 92, open, onOpen }: Props) {
  const today = useToday();
  const now = useNow();
  const [stage, setStage] = useState<Stage>('menu');
  const [picked, setPicked] = useState<Picked | null>(null);
  const [caption, setCaption] = useState('');
  const [linkId, setLinkId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = story.items ?? [];
  const visible = items.filter((item) => !item.hidden);
  const full = items.length >= maxStoryItems;
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const links = events.filter((event) => event.status !== 'cancelled').sort((a, b) => b.startsAt.localeCompare(a.startsAt)).slice(0, 20);
  const reset = () => { setStage('menu'); setPicked(null); setCaption(''); setLinkId(null); setSelectedId(null); setConfirming(false); setError(null); };
  const close = () => { if (!busy) { onOpen(false); reset(); } };

  // So, wie Entdecken den Veranstalter liest: sichtbare Bilder und das nächste veröffentlichte Event.
  const next = events.filter((event) => event.isPublished && event.status === 'scheduled' && isUpcoming(event, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const explore: ExploreOrganizer = {
    id: organizer.id, slug: organizer.slug, displayName: organizer.displayName, city: organizer.city, avatarUrl: organizer.avatarUrl,
    nextEvent: next ? { id: next.id, title: next.title, startsAt: next.startsAt } : null, story: visible,
  };
  const page = organizerStoryPage(explore, today);

  function watch() {
    close();
    // iOS zeigt nicht zwei Fenster gleichzeitig: erst das Sheet schließen lassen, dann die Story öffnen.
    setTimeout(() => setViewing(true), Platform.OS === 'ios' ? 400 : 0);
  }

  async function pick() {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [9, 16], quality: 0.8 });
      if (!result.canceled && result.assets[0]) { setPicked({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType }); setStage('add'); }
    } catch { setError('Das Bild konnte nicht geöffnet werden. Bitte erneut versuchen.'); }
  }

  async function add() {
    if (!picked) return;
    setBusy(true); setError(null);
    try {
      await addStoryItem(organizer.id, picked, { caption, eventId: linkId });
      story.reload(); reset();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Hinzufügen hat nicht geklappt.'); }
    finally { setBusy(false); }
  }

  async function remove(item: OrganizerStoryItem) {
    setBusy(true); setError(null);
    try { await deleteStoryItem(organizer.id, item); story.reload(); setSelectedId(null); setConfirming(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Löschen hat nicht geklappt.'); }
    finally { setBusy(false); }
  }

  return <>
    <RingAvatar organizer={organizer} size={size} active={visible.length > 0} label="Story in Entdecken ansehen oder Bild hinzufügen" onPress={() => onOpen(true)} />

    <StudioSheet visible={open} title={stage === 'add' ? 'Bild hinzufügen' : stage === 'manage' ? 'Bilder verwalten' : 'Story in Entdecken'} onClose={close}>
      {stage === 'menu' && <>
        <View style={styles.top}>
          <View pointerEvents="none" style={styles.tileBox}><OrganizerStoryTile organizer={explore} today={today} onOpen={() => {}} /></View>
          <View style={styles.topCopy}>
            <Text style={studioStyles.heading}>So seht ihr in Entdecken aus</Text>
            <Text style={studioStyles.muted}>{visible.length > 0 ? 'Die Bilder bleiben, bis ihr sie löscht.' : 'Ohne Bilder zeigt die Kachel euer Logo.'}</Text>
          </View>
        </View>
        <Message error={story.error ?? error} />
        <MenuRow icon="eye" title="Story ansehen" hint={visible.length === 0 ? 'Noch keine Bilder' : visible.length === 1 ? '1 Bild' : `${visible.length} Bilder`} disabled={visible.length === 0} onPress={watch} />
        <MenuRow icon="plus" title="Bild hinzufügen" hint={full ? `Mehr als ${maxStoryItems} Bilder gehen nicht` : undefined} disabled={story.items === null || full} onPress={() => void pick()} />
        {items.length > 0 && <MenuRow icon="image" title="Bilder verwalten" onPress={() => { setError(null); setStage('manage'); }} />}
      </>}

      {stage === 'add' && picked && <>
        <View style={styles.preview}><Image source={{ uri: picked.uri }} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityLabel="Ausgewähltes Bild" /></View>
        <Input label="Text" optional value={caption} onChange={setCaption} placeholder="z. B. So war's letzten Samstag" maxLength={200} editable={!busy} />
        {links.length > 0 && <View style={studioStyles.stack}>
          <Text style={styles.label}>Event dazu  <Text style={styles.optional}>freiwillig</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {links.map((event) => <Chip key={event.id} label={`${dayFormat.format(new Date(event.startsAt))} · ${event.title}`} selected={linkId === event.id} disabled={busy}
              onPress={() => setLinkId(linkId === event.id ? null : event.id)} />)}
          </ScrollView>
        </View>}
        <Message error={error} />
        <StudioButton label="Hinzufügen" loading={busy} onPress={() => void add()} />
        <StudioButton variant="ghost" label="Zurück" disabled={busy} onPress={reset} />
      </>}

      {stage === 'manage' && <>
        <View style={styles.grid}>
          {items.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: item.id === selectedId }} accessibilityLabel={item.caption ?? 'Bild auswählen'}
            onPress={() => { setError(null); setConfirming(false); setSelectedId(item.id === selectedId ? null : item.id); }} style={({ pressed }) => [styles.tile, item.id === selectedId && styles.tileOn, pressed && styles.pressed]}>
            <Image source={{ uri: item.url }} resizeMode="cover" style={[StyleSheet.absoluteFill, item.hidden && styles.dimmed]} />
            {item.hidden && <View style={styles.hidden}><Text style={styles.hiddenText}>Ausgeblendet</Text></View>}
          </Pressable>)}
        </View>
        {selected && <>
          {selected.hidden && <Pill tone="red" label="Vom Spots-Team ausgeblendet" />}
          {selected.caption && <Text style={studioStyles.body}>{selected.caption}</Text>}
          {selected.event && <Text style={studioStyles.muted}>{dayFormat.format(new Date(selected.event.startsAt))} · {selected.event.title}</Text>}
          {confirming
            ? <StudioButton variant="danger" label="Ja, löschen" loading={busy} onPress={() => void remove(selected)} />
            : <StudioButton variant="danger" icon="trash" label="Bild löschen" onPress={() => setConfirming(true)} />}
        </>}
        <Message error={error} />
        <StudioButton variant="ghost" label="Zurück" disabled={busy} onPress={reset} />
      </>}
    </StudioSheet>

    {/* Die Story, wie Gäste sie in Entdecken sehen. Ohne „Melden“: eigene Bilder meldet man nicht. */}
    <Modal visible={viewing} animationType="none" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={() => setViewing(false)}>
      {viewing && <StoryViewer pages={[{ ...page, media: page.media.map((media) => ({ ...media, storyItemId: undefined })) }]} initialId={page.id}
        onClose={() => setViewing(false)} onAction={() => setViewing(false)} />}
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  top: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  // Gleiche Proportion wie die Kachel in Entdecken (Breite : Höhe = 0,62).
  tileBox: { width: 112, height: 181 },
  topCopy: { flex: 1, gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31.5%', aspectRatio: 9 / 16, overflow: 'hidden', borderRadius: studio.radiusSmall, backgroundColor: studio.panelHigh, borderWidth: 2, borderColor: 'transparent' },
  tileOn: { borderColor: studio.accent },
  dimmed: { opacity: 0.35 },
  hidden: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  hiddenText: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: studio.text },
  preview: { alignSelf: 'center', width: 150, height: 267, overflow: 'hidden', borderRadius: studio.radius, backgroundColor: studio.bg },
  label: { ...studioType.label, color: studio.muted },
  optional: { color: studio.faint, textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  chips: { gap: 8 },
});
