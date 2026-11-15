import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fetchEventStats, type EventStats } from '../organizer/organizerApi';
import { dayFormat } from './format';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { Card, Kpi, Message, Segmented, StudioPage, studioStyles } from './ui';

const metrics = { views: 'Aufrufe', saves: 'Gemerkt', ticketClicks: 'Ticket-Klicks', snaps: 'Snaps' } as const;
type Metric = keyof typeof metrics;

/** Nur Summen pro Event, nichts über einzelne Personen (SQL 26). */
export default function StatsScreen() {
  const { organizer, events } = useStudio();
  const [rows, setRows] = useState<EventStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('views');
  const organizerId = organizer?.id;

  useEffect(() => {
    if (!organizerId) return;
    let active = true;
    fetchEventStats(organizerId).then((data) => { if (active) { setRows(data); setError(null); } })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); });
    return () => { active = false; };
  }, [organizerId, events]);

  const total = (key: Metric) => (rows ?? []).reduce((sum, row) => sum + row[key], 0);
  const sorted = [...(rows ?? [])].sort((a, b) => b[metric] - a[metric]);
  const max = Math.max(1, ...sorted.map((row) => row[metric]));

  return <StudioPage title="Statistik" subtitle="Summen pro Event. Aufrufe und Ticket-Klicks zählen pro Gerät höchstens einmal am Tag.">
    <View style={studioStyles.row}>
      {(Object.keys(metrics) as Metric[]).map((key) => <Kpi key={key} label={metrics[key]} value={rows ? total(key) : '–'} />)}
    </View>
    <Message error={error} />
    <Segmented options={metrics} value={metric} onChange={setMetric} />
    {rows && rows.length === 0 && <Card><Text style={studioStyles.muted}>Noch keine Events, noch keine Zahlen.</Text></Card>}
    {sorted.map((row) => <Card key={row.eventId}>
      <View style={styles.head}>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={studioStyles.heading}>{row.title}</Text>
          <Text style={studioStyles.muted}>{dayFormat.format(new Date(row.startsAt))}{row.isPublished ? '' : ' · Entwurf'}</Text>
        </View>
        <Text style={styles.value}>{row[metric]}</Text>
      </View>
      <View style={styles.track}><View style={[styles.bar, { width: `${Math.round((row[metric] / max) * 100)}%` }]} /></View>
    </Card>)}
    <Text style={studioStyles.muted}>„Gemerkt“ zählt Merklisten mit Konto; wer ohne Konto merkt, bleibt auf dem eigenen Gerät. Snaps zählen jeden hochgeladenen Snap, auch wenn er nach 24 Stunden verschwindet.</Text>
  </StudioPage>;
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 2 },
  value: { ...studioType.number, fontSize: 26, lineHeight: 30, color: studio.text },
  track: { height: 6, borderRadius: 3, backgroundColor: studio.bg, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3, backgroundColor: studio.lime },
});
