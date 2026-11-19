import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { OrganizerStoryItem } from '../../services/organizerStories';
import { addStoryItem, deleteStoryItem, fetchMyStoryItems, maxStoryItems } from '../organizer/organizerApi';
import { dayFormat } from './format';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { Card, Input, Message, Pill, SectionTitle, StudioButton, StudioPage, studioStyles } from './ui';

type Picked = { uri: string; mimeType?: string | null };

/**
 * /studio/story: Entdecken-Story des Clubs (SQL 33). Einfache, funktionale Oberfläche – Design offen für Noyan.
 * Bilder bleiben, bis der Club sie löscht; optional mit Text und einem eigenen Event (vergangen oder kommend).
 */
export default function StoryScreen() {
  const { organizer, events } = useStudio();
  const [items, setItems] = useState<OrganizerStoryItem[] | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [caption, setCaption] = useState('');
  const [eventId, setEventId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const organizerId = organizer?.id;
  const back = () => router.canGoBack() ? router.back() : router.replace('/studio');

  const load = useCallback(() => {
    if (!organizerId) return;
    fetchMyStoryItems(organizerId).then(setItems, (failure: unknown) => { setItems([]); setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); });
  }, [organizerId]);
  useEffect(load, [load]);

  if (!organizer) return <StudioPage title="Entdecken-Story" trailing={<StudioButton small variant="secondary" label="Zurück" onPress={back} />}>
    <Text style={studioStyles.muted}>Bitte zuerst die Angaben zum Club ergänzen.</Text>
  </StudioPage>;

  async function pick() {
    setError(null); setNotice(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [9, 16], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPicked({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
  }
  async function post() {
    if (!picked || !organizerId) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await addStoryItem(organizerId, picked, { caption, eventId });
      setPicked(null); setCaption(''); setEventId(null);
      setNotice('Gepostet.');
      load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Posten hat nicht geklappt.'); }
    finally { setBusy(false); }
  }
  async function remove(item: OrganizerStoryItem) {
    if (!organizerId) return;
    setBusy(true); setError(null); setNotice(null);
    try { await deleteStoryItem(organizerId, item); load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Löschen hat nicht geklappt.'); }
    finally { setBusy(false); }
  }

  const choices = [...events].filter((event) => event.status !== 'cancelled').sort((a, b) => b.startsAt.localeCompare(a.startsAt)).slice(0, 30);
  const full = (items?.length ?? 0) >= maxStoryItems;

  return <StudioPage title="Entdecken-Story" bottomInset={40}
    subtitle="Eure Kachel in Entdecken: Eindrücke von vergangenen Events oder Vorfreude auf kommende. Die Bilder bleiben, bis ihr sie löscht."
    trailing={<StudioButton small variant="secondary" label="Zurück" onPress={back} />}>
    {organizer.reviewStatus !== 'approved' && <Card tone="amber"><Text style={studioStyles.body}>Ihr könnt schon posten. Sichtbar wird die Story, sobald das Spots-Team euren Club freigegeben hat.</Text></Card>}

    <SectionTitle>Neues Bild</SectionTitle>
    <Card>
      <View style={styles.newRow}>
        <View style={styles.preview}>{picked ? <Image source={{ uri: picked.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Ausgewähltes Bild" /> : <Text style={styles.empty}>9:16</Text>}</View>
        <View style={styles.side}>
          <Text style={studioStyles.muted}>JPG, PNG oder WebP, höchstens 5 MB. Über seine Adresse öffentlich abrufbar.</Text>
          <StudioButton small variant="secondary" icon="camera" label={picked ? 'Anderes Bild' : 'Bild wählen'} disabled={busy || full} onPress={() => void pick()} />
        </View>
      </View>
      <Input label="Text" optional value={caption} onChange={setCaption} placeholder="z. B. So war's letzten Samstag" maxLength={200} editable={!busy} />
      <Text style={styles.label}>Zu welchem Event?  <Text style={styles.optional}>freiwillig</Text></Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Kein Event" selected={eventId === null} onPress={() => setEventId(null)} />
        {choices.map((event) => <Chip key={event.id} label={`${dayFormat.format(new Date(event.startsAt))} · ${event.title}`} selected={eventId === event.id} onPress={() => setEventId(event.id)} />)}
      </ScrollView>
      <StudioButton label="In die Story posten" loading={busy && !!picked} disabled={!picked || busy || full} onPress={() => void post()} />
      {full && <Text style={studioStyles.muted}>Die Story hat schon {maxStoryItems} Bilder. Löscht ein altes, um ein neues zu posten.</Text>}
      <Message error={error} text={notice} />
    </Card>

    <SectionTitle>{`In der Story (${items?.length ?? 0}/${maxStoryItems})`}</SectionTitle>
    {items === null && <Text style={studioStyles.muted}>Lädt …</Text>}
    {items?.length === 0 && <Card><Text style={studioStyles.muted}>Noch keine Bilder. Ohne Story zeigt Entdecken euer Logo und euren Namen.</Text></Card>}
    {items?.map((item) => <Card key={item.id} style={styles.item}>
      <Image source={{ uri: item.url }} style={styles.thumb} resizeMode="cover" accessibilityLabel={item.caption ?? 'Story-Bild'} />
      <View style={styles.side}>
        {item.hidden && <Pill tone="red" label="Vom Spots-Team ausgeblendet" />}
        {item.caption && <Text style={studioStyles.body}>{item.caption}</Text>}
        {item.event && <Text style={studioStyles.muted}>{dayFormat.format(new Date(item.event.startsAt))} · {item.event.title}</Text>}
        <Text style={studioStyles.muted}>Gepostet am {dayFormat.format(new Date(item.createdAt))}</Text>
        <StudioButton small variant="danger" label="Löschen" disabled={busy} onPress={() => void remove(item)} />
      </View>
    </Card>)}
  </StudioPage>;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress}
    style={[styles.chip, selected && styles.chipActive]}>
    <Text numberOfLines={1} style={[styles.chipLabel, selected && styles.chipLabelActive]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  newRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  preview: { width: 90, height: 160, overflow: 'hidden', borderRadius: studio.radiusSmall, backgroundColor: studio.bg, borderWidth: 1, borderColor: studio.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  empty: { ...studioType.label, color: studio.faint },
  side: { flex: 1, gap: 8 },
  label: { ...studioType.label, color: studio.muted },
  optional: { color: studio.faint },
  chips: { gap: 8 },
  chip: { maxWidth: 260, minHeight: 38, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: studio.line, backgroundColor: studio.panelHigh },
  chipActive: { backgroundColor: studio.lime, borderColor: studio.lime },
  chipLabel: { ...studioType.small, color: studio.text },
  chipLabelActive: { color: studio.limeInk, fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'flex-start' },
  thumb: { width: 72, height: 128, borderRadius: studio.radiusSmall, backgroundColor: studio.bg },
});
