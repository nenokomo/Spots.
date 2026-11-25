import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { createPost, deletePost, maxPostImages, setPostPublished, type MyOrganizer } from '../organizer/organizerApi';
import { feedback } from './feel';
import { longFormat } from './format';
import type { usePosts } from './hooks';
import { studio, studioType } from './theme';
import { Empty, Input, Message, Pill, Skeleton, StudioButton, StudioSheet, studioStyles } from './ui';

type Picked = { uri: string; mimeType?: string | null };
type Stage = 'list' | 'new';

/**
 * Beiträge des Veranstalters (SQL 15, 19, 39): Text mit bis zu zehn Bildern, wie im Feed auf der Veranstalterseite.
 * Öffnet sich über „Beiträge“ im Profil. Ein Sheet mit drei Ansichten: alle Beiträge, ein neuer Beitrag, ein Beitrag
 * mit „Zurückziehen“ / „Wieder zeigen“ und „Löschen“ (mit Rückfrage). Zurückgezogene Beiträge sieht nur der Veranstalter.
 */
export function PostsSheet({ visible, organizer, posts, onClose }: { visible: boolean; organizer: MyOrganizer; posts: ReturnType<typeof usePosts>; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [body, setBody] = useState('');
  const [images, setImages] = useState<Picked[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const items = posts.items ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const approved = organizer.reviewStatus === 'approved';
  const back = () => { setStage('list'); setSelectedId(null); setConfirming(false); setError(null); };
  const close = () => { if (busy) return; back(); setBody(''); setImages([]); onClose(); };

  async function pick() {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: maxPostImages - images.length, quality: 0.8 });
      if (result.canceled) return;
      setImages((current) => [...current, ...result.assets.map((asset) => ({ uri: asset.uri, mimeType: asset.mimeType }))].slice(0, maxPostImages));
    } catch { setError('Die Bilder konnten nicht geöffnet werden. Bitte erneut versuchen.'); }
  }

  async function run(key: string, task: () => Promise<unknown>, done: string, then: () => void) {
    setBusy(key); setError(null);
    try { await task(); feedback.success(done); posts.reload(); then(); }
    catch (failure) { feedback.error(); setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.'); }
    finally { setBusy(null); }
  }

  const publish = () => {
    if (!body.trim()) { setError('Bitte einen Text für den Beitrag schreiben.'); return; }
    void run('new', () => createPost(organizer.id, { body, images, publish: true }), 'Beitrag veröffentlicht.', () => { setBody(''); setImages([]); back(); });
  };

  const title = selected ? (confirming ? 'Beitrag löschen?' : 'Beitrag') : stage === 'new' ? 'Neuer Beitrag' : 'Beiträge';
  return <StudioSheet visible={visible} title={title} onClose={close}>
    {stage === 'list' && !selected && <>
      <StudioButton icon="plus" label="Neuer Beitrag" onPress={() => { setError(null); setStage('new'); }} />
      <Message error={posts.error} />
      {posts.items === null && <><Skeleton height={76} /><Skeleton height={76} /></>}
      {posts.items?.length === 0 && <Empty icon="image" title="Noch keine Beiträge" text="Zeigt Gästen, was bei euch los ist: ein Rückblick, das Line-up, neue Öffnungszeiten." />}
      {items.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Beitrag öffnen: ${item.body.slice(0, 60)}`} onPress={() => { setError(null); setSelectedId(item.id); }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        {item.images[0] ? <Image source={{ uri: item.images[0] }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]}><Icon name="edit" size={18} color={studio.faint} /></View>}
        <View style={styles.rowCopy}>
          <Text numberOfLines={2} style={studioStyles.body}>{item.body}</Text>
          <View style={styles.rowMeta}>
            <Text style={studioStyles.faint}>{longFormat.format(new Date(item.createdAt))}</Text>
            {!item.isPublished && <Pill label="Zurückgezogen" tone="amber" />}
          </View>
        </View>
        <Icon name="chevron" size={15} color={studio.faint} />
      </Pressable>)}
    </>}

    {stage === 'new' && <>
      <Input label="Text" value={body} onChange={setBody} placeholder="Was gibt es Neues?" multiline maxLength={5000} editable={!busy} />
      <View style={studioStyles.stack}>
        <Text style={styles.label}>Bilder  <Text style={styles.optional}>freiwillig, bis zu {maxPostImages}</Text></Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {images.length < maxPostImages && <Pressable accessibilityRole="button" accessibilityLabel="Bilder hinzufügen" disabled={!!busy} onPress={() => void pick()} style={({ pressed }) => [styles.tile, styles.add, pressed && styles.pressed]}>
            <Icon name="plus" size={24} color={studio.accent} />
          </Pressable>}
          {images.map((image, index) => <View key={`${image.uri}-${index}`} style={styles.tile}>
            <Image source={{ uri: image.uri }} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityLabel={`Bild ${index + 1}`} />
            <Pressable accessibilityRole="button" accessibilityLabel={`Bild ${index + 1} entfernen`} disabled={!!busy} hitSlop={8} onPress={() => setImages(images.filter((_, position) => position !== index))} style={styles.remove}>
              <Icon name="close" size={13} color={studio.text} />
            </Pressable>
          </View>)}
        </ScrollView>
      </View>
      {!approved && <Text style={studioStyles.muted}>Gäste sehen den Beitrag, sobald Spots euch freigegeben hat.</Text>}
      <Message error={error} />
      <StudioButton label="Veröffentlichen" loading={busy === 'new'} onPress={publish} />
      <StudioButton variant="ghost" label="Zurück" disabled={!!busy} onPress={back} />
    </>}

    {selected && <>
      {selected.images.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {selected.images.map((uri, index) => <Image key={uri} source={{ uri }} resizeMode="cover" style={styles.big} accessibilityLabel={`Bild ${index + 1} von ${selected.images.length}`} />)}
      </ScrollView>}
      <Text style={studioStyles.body}>{selected.body}</Text>
      <View style={styles.rowMeta}>
        <Text style={studioStyles.faint}>{longFormat.format(new Date(selected.createdAt))}</Text>
        <Pill label={selected.isPublished ? 'Sichtbar' : 'Zurückgezogen'} tone={selected.isPublished ? 'accent' : 'amber'} />
      </View>
      <Message error={error} />
      {confirming
        ? <>
            <StudioButton variant="danger" label="Ja, löschen" loading={busy === 'delete'} onPress={() => void run('delete', () => deletePost(selected.id), 'Beitrag gelöscht.', back)} />
            <StudioButton variant="ghost" label="Abbrechen" disabled={!!busy} onPress={() => setConfirming(false)} />
          </>
        : <>
            <StudioButton variant="secondary" label={selected.isPublished ? 'Zurückziehen' : 'Wieder zeigen'} loading={busy === 'toggle'} disabled={!!busy}
              onPress={() => void run('toggle', () => setPostPublished(selected.id, !selected.isPublished), selected.isPublished ? 'Beitrag zurückgezogen.' : 'Beitrag ist wieder sichtbar.', () => {})} />
            <StudioButton variant="danger" icon="trash" label="Löschen" disabled={!!busy} onPress={() => setConfirming(true)} />
            <StudioButton variant="ghost" label="Zurück" disabled={!!busy} onPress={back} />
          </>}
    </>}
  </StudioSheet>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 76, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line },
  rowCopy: { flex: 1, gap: 4 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 48, height: 60, borderRadius: 10, backgroundColor: studio.panelHigh },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  label: { ...studioType.label, color: studio.muted },
  optional: { color: studio.faint, textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  strip: { gap: 8 },
  // Beiträge sind 4:5, wie im Feed der Veranstalterseite.
  tile: { width: 80, height: 100, overflow: 'hidden', borderRadius: studio.radiusSmall, backgroundColor: studio.panelHigh },
  add: { alignItems: 'center', justifyContent: 'center', backgroundColor: studio.accentSoft, borderWidth: 1.5, borderColor: studio.accentLine, borderStyle: 'dashed' },
  remove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a090ccc' },
  big: { width: 160, height: 200, borderRadius: studio.radiusSmall, backgroundColor: studio.panelHigh },
});
