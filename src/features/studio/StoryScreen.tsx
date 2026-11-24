import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { useNow } from '../../hooks/useNow';
import { postShot } from '../../services/content';
import type { OrganizerStoryItem } from '../../services/organizerStories';
import { addStoryItem, deleteStoryItem, fetchMyStoryItems, maxStoryItems } from '../organizer/organizerApi';
import { dayFormat } from './format';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { Card, Input, Message, Pill, SectionTitle, Segmented, StudioButton, StudioPage, studioStyles } from './ui';

type Picked = { uri: string; mimeType?: string | null };
const targets = { explore: 'Entdecken', event: 'Eventseite' } as const;
type Target = keyof typeof targets;

/**
 * /studio/story (Reiter „Story“): der einzige Ort im Studio, an dem gepostet wird (Design Noyan, 23.11.).
 * Ein Ablauf für beide Arten: zuerst wählen, wo das Bild erscheint, dann Bild wählen und posten.
 * - Entdecken (SQL 33): Kachel unter „Veranstalter in <Stadt>“. Bleibt, bis der Club löscht; optional Text und verlinktes Event.
 * - Eventseite (Event-Story, SQL 33): 24 Stunden auf der Seite eines Events, ab dem Anlegen bis zwei Stunden nach dem Ende.
 */
export default function StoryScreen() {
  const { organizer, events } = useStudio();
  const now = useNow();
  const [target, setTarget] = useState<Target>('explore');
  const [items, setItems] = useState<OrganizerStoryItem[] | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [caption, setCaption] = useState('');
  const [linkId, setLinkId] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const organizerId = organizer?.id;

  const load = useCallback(() => {
    if (!organizerId) return;
    fetchMyStoryItems(organizerId).then(setItems, (failure: unknown) => { setItems([]); setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); });
  }, [organizerId]);
  useEffect(load, [load]);

  if (!organizer) return null;

  // Eventseite: wie die Datenbank bis zwei Stunden nach dem Ende (ohne Ende: acht Stunden nach Beginn).
  const open = events.filter((event) => event.status === 'scheduled'
    && (event.endsAt ? Date.parse(event.endsAt) : Date.parse(event.startsAt) + 8 * 3_600_000) + 2 * 3_600_000 > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const chosen = open.find((event) => event.id === chosenId) ?? open[0] ?? null;
  // Entdecken: ein eigenes Event verlinken, vergangen oder kommend.
  const links = events.filter((event) => event.status !== 'cancelled').sort((a, b) => b.startsAt.localeCompare(a.startsAt)).slice(0, 30);
  const full = (items?.length ?? 0) >= maxStoryItems;
  const blocked = target === 'explore' ? full : !chosen;
  const approved = organizer.reviewStatus === 'approved';

  function switchTarget(next: Target) { setTarget(next); setPicked(null); setError(null); setNotice(null); }

  async function pick() {
    setError(null); setNotice(null);
    const result = await ImagePicker.launchImageLibraryAsync(target === 'explore'
      ? { mediaTypes: ['images'], allowsEditing: true, aspect: [9, 16], quality: 0.8 }
      : { mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPicked({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
  }

  async function post() {
    if (!picked || !organizerId || (target === 'event' && !chosen)) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      if (target === 'event' && chosen) {
        await postShot(chosen.id, picked, { eventStory: true });
        setNotice(chosen.isPublished ? 'Gepostet. 24 Stunden auf der Eventseite zu sehen.' : 'Gepostet. Zu sehen, sobald das Event live ist.');
      } else {
        await addStoryItem(organizerId, picked, { caption, eventId: linkId });
        setCaption(''); setLinkId(null);
        setNotice(approved ? 'Gepostet. Zu sehen in Entdecken.' : 'Gepostet. Zu sehen, sobald euer Club freigegeben ist.');
        load();
      }
      setPicked(null);
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

  return <StudioPage title="Story" subtitle="Ein Bild posten. Ihr wählt, wo es erscheint.">
    <Card>
      <Text style={styles.label}>Wo soll es erscheinen?</Text>
      <Segmented options={targets} value={target} onChange={switchTarget} />
      <Text style={studioStyles.muted}>{target === 'explore'
        ? `In Entdecken, als eure Kachel unter „Veranstalter in ${organizer.city ?? 'eurer Stadt'}“. Das Bild bleibt, bis ihr es löscht.`
        : 'Auf der Seite eines Events, zum Beispiel Line-up oder Aufbau. Das Bild bleibt 24 Stunden.'}</Text>

      {target === 'event' && (open.length > 0 ? <>
        <Text style={styles.label}>Welches Event?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {open.map((event) => <Chip key={event.id} label={`${dayFormat.format(new Date(event.startsAt))} · ${event.title}`} selected={chosen?.id === event.id} onPress={() => setChosenId(event.id)} />)}
        </ScrollView>
      </> : <Text style={studioStyles.body}>Gerade gibt es kein Event, zu dem ihr posten könnt. Legt im Reiter „Events“ eines an.</Text>)}

      <View style={styles.newRow}>
        <View style={styles.preview}>{picked
          ? <Image source={{ uri: picked.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Ausgewähltes Bild" />
          : <Icon name="camera" size={22} color={studio.faint} />}</View>
        <View style={styles.side}>
          <StudioButton small variant="secondary" icon="camera" label={picked ? 'Anderes Bild' : 'Bild wählen'} disabled={busy || blocked} onPress={() => void pick()} />
          <Text style={studioStyles.muted}>{target === 'explore' ? 'JPG, PNG oder WebP, höchstens 5 MB. Über seine Adresse öffentlich abrufbar.' : 'Ein Foto aus eurer Mediathek, höchstens 20 MB.'}</Text>
        </View>
      </View>

      {target === 'explore' && <>
        <Input label="Text" optional value={caption} onChange={setCaption} placeholder="z. B. So war's letzten Samstag" maxLength={200} editable={!busy} />
        {links.length > 0 && <>
          <Text style={styles.label}>Event verlinken  <Text style={styles.optional}>freiwillig</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="Kein Event" selected={linkId === null} onPress={() => setLinkId(null)} />
            {links.map((event) => <Chip key={event.id} label={`${dayFormat.format(new Date(event.startsAt))} · ${event.title}`} selected={linkId === event.id} onPress={() => setLinkId(event.id)} />)}
          </ScrollView>
        </>}
      </>}

      <StudioButton label="Posten" loading={busy && !!picked} disabled={!picked || busy || blocked} onPress={() => void post()} />
      {target === 'explore' && full && <Text style={studioStyles.muted}>Die Story hat schon {maxStoryItems} Bilder. Löscht ein altes, um ein neues zu posten.</Text>}
      {target === 'explore' && !approved && <Text style={studioStyles.muted}>Ihr könnt schon posten. Sichtbar wird die Story, sobald das Spots-Team euren Club freigegeben hat.</Text>}
      <Message error={error} text={notice} />
    </Card>

    {target === 'explore' ? <>
      <SectionTitle>{`In Entdecken (${items?.length ?? 0}/${maxStoryItems})`}</SectionTitle>
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
    </> : <Text style={studioStyles.muted}>Gepostete Bilder seht ihr auf der Seite des Events unter „Bilder zu diesem Event“. Dort könnt ihr sie auch ausblenden.</Text>}
  </StudioPage>;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress}
    style={[styles.chip, selected && styles.chipActive]}>
    <Text numberOfLines={1} style={[styles.chipLabel, selected && styles.chipLabelActive]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  newRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  preview: { width: 90, height: 160, overflow: 'hidden', borderRadius: studio.radiusSmall, backgroundColor: studio.bg, borderWidth: 1, borderColor: studio.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  side: { flex: 1, gap: 8 },
  label: { ...studioType.label, color: studio.muted },
  optional: { color: studio.faint, textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  chips: { gap: 8 },
  chip: { maxWidth: 260, minHeight: 38, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: studio.line, backgroundColor: studio.panelHigh },
  chipActive: { backgroundColor: studio.accent, borderColor: studio.accent },
  chipLabel: { ...studioType.small, color: studio.text },
  chipLabelActive: { color: studio.onAccent, fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'flex-start' },
  thumb: { width: 72, height: 128, borderRadius: studio.radiusSmall, backgroundColor: studio.bg },
});
