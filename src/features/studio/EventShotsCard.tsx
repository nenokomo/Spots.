import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { onSnapsChanged } from '../../services/content';
import { fetchEventShots, setShotHidden, type StudioShot } from '../organizer/organizerApi';
import { timeFormat } from './format';
import { studio } from './theme';
import { Card, Message, Pill, StudioButton, studioStyles } from './ui';

/**
 * Bilder der letzten 24 Stunden zu einem eigenen Event: Event-Story des Clubs und Shots von Gästen.
 * Der Club kann sie ausblenden und wieder zeigen (SQL 17). Was das Spots-Team gesperrt hat, bleibt gesperrt (SQL 34).
 * Einfache Oberfläche – Design offen für Noyan.
 */
export function EventShotsCard({ eventId }: { eventId: string }) {
  const [shots, setShots] = useState<StudioShot[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchEventShots(eventId).then((rows) => { setShots(rows); }, (failure: unknown) => { setShots([]); setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); });
  }, [eventId]);
  useEffect(load, [load]);
  // Nach „Foto posten“ (Event-Story) die Liste neu laden.
  useEffect(() => onSnapsChanged((changed) => { if (changed === eventId) load(); }), [eventId, load]);

  async function toggle(shot: StudioShot) {
    setBusy(shot.id); setError(null);
    try { await setShotHidden(shot.id, !shot.hidden); load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.'); }
    finally { setBusy(null); }
  }

  return <Card>
    <Text style={studioStyles.heading}>Bilder zu diesem Event</Text>
    <Text style={studioStyles.muted}>Eure Event-Story und die Shots von Gästen der letzten 24 Stunden. Unpassende Bilder könnt ihr ausblenden.</Text>
    {shots === null && <Text style={studioStyles.muted}>Lädt …</Text>}
    {shots?.length === 0 && <Text style={studioStyles.muted}>Gerade keine Bilder.</Text>}
    {shots?.map((shot) => <View key={shot.id} style={styles.row}>
      {shot.url ? <Image source={{ uri: shot.url }} style={styles.thumb} resizeMode="cover" accessibilityLabel={shot.byOrganizer ? 'Bild der Event-Story' : 'Shot von einem Gast'} /> : <View style={styles.thumb} />}
      <View style={styles.side}>
        <Text style={studioStyles.body}>{shot.byOrganizer ? 'Event-Story' : 'Shot von einem Gast'} · {timeFormat.format(new Date(shot.createdAt))} Uhr</Text>
        {shot.teamLocked ? <Pill tone="red" label="Vom Spots-Team gesperrt" /> : shot.hidden ? <Pill tone="amber" label="Ausgeblendet" /> : <Pill tone="accent" label="Sichtbar" />}
        {!shot.teamLocked && <StudioButton small variant={shot.hidden ? 'secondary' : 'danger'} label={shot.hidden ? 'Wieder zeigen' : 'Ausblenden'}
          loading={busy === shot.id} disabled={!!busy} onPress={() => void toggle(shot)} />}
      </View>
    </View>)}
    <Message error={error} />
  </Card>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  thumb: { width: 64, height: 112, borderRadius: studio.radiusSmall, backgroundColor: studio.bg },
  side: { flex: 1, gap: 8, alignItems: 'flex-start' },
});
