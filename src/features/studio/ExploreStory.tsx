import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StoryViewer } from '../../components/EventStoryViewer';
import { Icon } from '../../components/Icon';
import { squircle } from '../../constants/theme';
import { useNow } from '../../hooks/useNow';
import { useToday } from '../../hooks/useToday';
import type { ExploreOrganizer, OrganizerStoryItem } from '../../services/organizerStories';
import { organizerStoryPage } from '../../utils/stories';
import { addStoryItem, deleteStoryItem, maxStoryItems, type MyOrganizer, type OrganizerEvent } from '../organizer/organizerApi';
import { dayFormat, isUpcoming } from './format';
import type { useExploreStory } from './hooks';
import { studio, studioType } from './theme';
import { Chip, Input, Message, Pill, StudioButton, StudioSheet, studioStyles } from './ui';

type Picked = { uri: string; mimeType?: string | null };

/**
 * „Story in Entdecken“ (SQL 33): die dauerhaften Bilder des Veranstalters. Gäste sehen sie in Entdecken, wenn sie nach
 * Veranstaltern in ihrer Stadt schauen; die Bilder bleiben, bis man sie löscht.
 * Ein eigener Bereich im Profil, unter „Vergangene Events“: ein Streifen mit „Hinzufügen“
 * und allen Bildern. Ein Bild antippen zeigt es groß mit „Löschen“; „Ansehen“ zeigt die Story, wie Gäste sie sehen.
 * Nicht zu verwechseln mit der Story eines Events (24 Stunden, Profilbild mit „+“ auf der Eventseite).
 */
export function ExploreStory({ organizer, events, story }: { organizer: MyOrganizer; events: OrganizerEvent[]; story: ReturnType<typeof useExploreStory> }) {
  const today = useToday();
  const now = useNow();
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
  const close = () => { if (!busy) { setPicked(null); setCaption(''); setLinkId(null); setSelectedId(null); setConfirming(false); setError(null); } };

  // So, wie Entdecken den Veranstalter liest: sichtbare Bilder und das nächste veröffentlichte Event.
  const next = events.filter((event) => event.isPublished && event.status === 'scheduled' && isUpcoming(event, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const explore: ExploreOrganizer = {
    id: organizer.id, slug: organizer.slug, displayName: organizer.displayName, city: organizer.city, avatarUrl: organizer.avatarUrl,
    nextEvent: next ? { id: next.id, title: next.title, startsAt: next.startsAt } : null, story: visible,
  };
  const page = organizerStoryPage(explore, today);

  async function pick() {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [9, 16], quality: 0.8 });
      if (!result.canceled && result.assets[0]) setPicked({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
    } catch { setError('Das Bild konnte nicht geöffnet werden. Bitte erneut versuchen.'); }
  }

  async function add() {
    if (!picked) return;
    setBusy(true); setError(null);
    try {
      await addStoryItem(organizer.id, picked, { caption, eventId: linkId });
      story.reload(); setPicked(null); setCaption(''); setLinkId(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Hinzufügen hat nicht geklappt.'); }
    finally { setBusy(false); }
  }

  async function remove(item: OrganizerStoryItem) {
    setBusy(true); setError(null);
    try { await deleteStoryItem(organizer.id, item); story.reload(); setSelectedId(null); setConfirming(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Löschen hat nicht geklappt.'); }
    finally { setBusy(false); }
  }

  return <View style={styles.box}>
    <View style={styles.head}>
      <View style={styles.headCopy}>
        <Text style={styles.title}>Story in Entdecken</Text>
        <Text style={studioStyles.muted}>{items.length > 0 ? 'So finden euch Gäste in Entdecken. Die Bilder bleiben, bis ihr sie löscht.' : 'Zeigt Gästen in Entdecken, wie es bei euch aussieht. Die Bilder bleiben, bis ihr sie löscht.'}</Text>
      </View>
      {visible.length > 0 && <StudioButton small variant="secondary" icon="eye" label="Ansehen" onPress={() => setViewing(true)} />}
    </View>
    {!picked && !selected && <Message error={story.error ?? error} />}

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} style={styles.stripScroll}>
      <Pressable accessibilityRole="button" accessibilityLabel="Bild zur Story in Entdecken hinzufügen" disabled={story.items === null || full} onPress={() => void pick()}
        style={({ pressed }) => [styles.tile, styles.add, (story.items === null || full) && styles.off, pressed && styles.pressed]}>
        <Icon name="plus" size={26} color={studio.accent} />
        <Text style={styles.addText}>Hinzufügen</Text>
      </Pressable>
      {items.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.caption ?? 'Bild öffnen'} onPress={() => { setError(null); setSelectedId(item.id); }}
        style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
        <Image source={{ uri: item.url }} resizeMode="cover" style={[StyleSheet.absoluteFill, item.hidden && styles.dimmed]} />
        {item.hidden && <View style={styles.hidden}><Text style={styles.hiddenText}>Ausgeblendet</Text></View>}
      </Pressable>)}
    </ScrollView>
    {full && <Text style={studioStyles.faint}>Mehr als {maxStoryItems} Bilder gehen nicht. Löscht eins, um ein neues hinzuzufügen.</Text>}

    <StudioSheet visible={!!picked} title="Bild hinzufügen" onClose={close}>
      {picked && <>
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
      </>}
    </StudioSheet>

    <StudioSheet visible={!!selected} title={confirming ? 'Bild löschen?' : 'Bild'} onClose={close}>
      {selected && <>
        <View style={styles.preview}><Image source={{ uri: selected.url }} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityLabel={selected.caption ?? 'Bild'} /></View>
        {selected.hidden && <Pill tone="red" label="Vom Spots-Team ausgeblendet" />}
        {selected.caption && <Text style={studioStyles.body}>{selected.caption}</Text>}
        {selected.event && <Text style={studioStyles.muted}>{dayFormat.format(new Date(selected.event.startsAt))} · {selected.event.title}</Text>}
        <Message error={error} />
        {confirming
          ? <>
              <StudioButton variant="danger" label="Ja, löschen" loading={busy} onPress={() => void remove(selected)} />
              <StudioButton variant="ghost" label="Abbrechen" disabled={busy} onPress={() => setConfirming(false)} />
            </>
          : <StudioButton variant="danger" icon="trash" label="Bild löschen" onPress={() => setConfirming(true)} />}
      </>}
    </StudioSheet>

    {/* Die Story, wie Gäste sie in Entdecken sehen. Ohne „Melden“: eigene Bilder meldet man nicht. */}
    <Modal visible={viewing} animationType="none" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={() => setViewing(false)}>
      {viewing && <StoryViewer pages={[{ ...page, media: page.media.map((media) => ({ ...media, storyItemId: undefined })) }]} initialId={page.id}
        onClose={() => setViewing(false)} onAction={() => setViewing(false)} />}
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  box: { gap: 12, padding: 16, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, ...squircle },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headCopy: { flex: 1, gap: 4 },
  title: { fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.3, color: studio.text },
  stripScroll: { marginHorizontal: -16 },
  strip: { gap: 8, paddingHorizontal: 16 },
  tile: { width: 92, height: 164, overflow: 'hidden', borderRadius: studio.radiusSmall, backgroundColor: studio.panelHigh },
  add: { alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: studio.accentSoft, borderWidth: 1.5, borderColor: studio.accentLine, borderStyle: 'dashed' },
  addText: { ...studioType.small, fontWeight: '700', color: studio.text },
  off: { opacity: 0.45 },
  dimmed: { opacity: 0.35 },
  hidden: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  hiddenText: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: studio.text },
  preview: { alignSelf: 'center', width: 170, height: 302, overflow: 'hidden', borderRadius: studio.radius, backgroundColor: studio.bg },
  label: { ...studioType.label, color: studio.muted },
  optional: { color: studio.faint, textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  chips: { gap: 8 },
});
