import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import type { OrganizerStoryItem } from '../../services/organizerStories';
import { addStoryItem, deleteStoryItem, fetchMyStoryItems, maxStoryItems, type MyOrganizer, type OrganizerEvent } from '../organizer/organizerApi';
import { dayFormat } from './format';
import { studio, studioType } from './theme';
import { Chip, Empty, Input, Message, Pill, SectionTitle, StudioButton, StudioSheet, studioStyles } from './ui';

type Picked = { uri: string; mimeType?: string | null };

/**
 * „Bilder“ im Profil: dauerhafte Bilder des Veranstalters (SQL 33). Sie erscheinen in Entdecken und bleiben, bis man sie löscht.
 * Früher hieß das „Story → Entdecken“; „Story“ heißt jetzt nur noch, was nach 24 Stunden verschwindet (Glossar im Plan).
 */
export function Gallery({ organizer, events }: { organizer: MyOrganizer; events: OrganizerEvent[] }) {
  const [items, setItems] = useState<OrganizerStoryItem[] | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [caption, setCaption] = useState('');
  const [linkId, setLinkId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const organizerId = organizer.id;

  const load = useCallback(() => {
    fetchMyStoryItems(organizerId).then(setItems, (failure: unknown) => { setItems([]); setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); });
  }, [organizerId]);
  useEffect(load, [load]);

  const full = (items?.length ?? 0) >= maxStoryItems;
  const selected = items?.find((item) => item.id === selectedId) ?? null;
  const links = events.filter((event) => event.status !== 'cancelled').sort((a, b) => b.startsAt.localeCompare(a.startsAt)).slice(0, 20);
  const closeAdd = () => { if (!busy) { setPicked(null); setCaption(''); setLinkId(null); setError(null); } };
  const closeItem = () => { if (!busy) { setSelectedId(null); setConfirming(false); setError(null); } };

  async function pick() {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [9, 16], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPicked({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
  }

  async function add() {
    if (!picked) return;
    setBusy(true); setError(null);
    try {
      await addStoryItem(organizerId, picked, { caption, eventId: linkId });
      setPicked(null); setCaption(''); setLinkId(null);
      load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Hinzufügen hat nicht geklappt.'); }
    finally { setBusy(false); }
  }

  async function remove(item: OrganizerStoryItem) {
    setBusy(true); setError(null);
    try { await deleteStoryItem(organizerId, item); setSelectedId(null); setConfirming(false); load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Löschen hat nicht geklappt.'); }
    finally { setBusy(false); }
  }

  return <>
    <SectionTitle action={items && items.length > 0 ? <Text style={studioStyles.faint}>{items.length}/{maxStoryItems}</Text> : undefined}>Bilder</SectionTitle>
    {!picked && !selected && <Message error={error} />}
    {items?.length === 0
      ? <Empty icon="image" title="Noch keine Bilder" text="Bilder zeigen Gästen in Entdecken, wie es bei euch aussieht. Sie bleiben, bis ihr sie löscht.">
          <StudioButton small icon="plus" label="Bild hinzufügen" onPress={() => void pick()} />
        </Empty>
      : <View style={styles.grid}>
          {items && !full && <Pressable accessibilityRole="button" accessibilityLabel="Bild hinzufügen" onPress={() => void pick()} style={({ pressed }) => [styles.tile, styles.add, pressed && styles.pressed]}>
            <Icon name="plus" size={24} color={studio.accent} />
          </Pressable>}
          {items?.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.caption ?? 'Bild öffnen'} onPress={() => { setError(null); setSelectedId(item.id); }}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
            <Image source={{ uri: item.url }} resizeMode="cover" style={[StyleSheet.absoluteFill, item.hidden && styles.dimmed]} />
            {item.hidden && <View style={styles.hidden}><Text style={styles.hiddenText}>Ausgeblendet</Text></View>}
          </Pressable>)}
        </View>}

    <StudioSheet visible={!!picked} title="Bild hinzufügen" onClose={closeAdd}>
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

    <StudioSheet visible={!!selected} title={confirming ? 'Bild löschen?' : 'Bild'} onClose={closeItem}>
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
          : <StudioButton variant="danger" icon="trash" label="Löschen" onPress={() => setConfirming(true)} />}
      </>}
    </StudioSheet>
  </>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31.5%', aspectRatio: 9 / 16, overflow: 'hidden', borderRadius: studio.radiusSmall, backgroundColor: studio.panelHigh },
  add: { alignItems: 'center', justifyContent: 'center', backgroundColor: studio.accentSoft, borderWidth: 1, borderColor: studio.accentLine, borderStyle: 'dashed' },
  dimmed: { opacity: 0.35 },
  hidden: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  hiddenText: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: studio.text },
  preview: { alignSelf: 'center', width: 170, height: 302, overflow: 'hidden', borderRadius: studio.radius, backgroundColor: studio.bg },
  label: { ...studioType.label, color: studio.muted },
  optional: { color: studio.faint, textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  chips: { gap: 8 },
});
