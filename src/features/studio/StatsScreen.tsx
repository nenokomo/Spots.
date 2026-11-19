import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { fetchEventStats, type EventStats } from '../organizer/organizerApi';
import { dayFormat } from './format';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { Card, Kpi, Message, SectionTitle, Segmented, StudioButton, StudioPage, studioStyles } from './ui';

const metrics = { views: 'Aufrufe', saves: 'Gemerkt', ticketClicks: 'Ticket-Klicks', snaps: 'SHOTS' } as const;
const icons = { views: 'search', saves: 'heart', ticketClicks: 'ticket', snaps: 'camera' } as const;
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

  return <StudioPage title="Zahlen" bottomInset={40} subtitle="Summen pro Event. Aufrufe und Ticket-Klicks zählen pro Gerät höchstens einmal am Tag."
    trailing={<StudioButton small variant="secondary" label="Zurück" onPress={() => router.canGoBack() ? router.back() : router.replace('/studio')} />}>
    <View style={studioStyles.row}>
      {(Object.keys(metrics) as Metric[]).map((key) => <Kpi key={key} icon={icons[key]} label={metrics[key]} value={rows ? total(key) : '–'} />)}
    </View>

    {/* Umsatz: Spots verkauft (noch) keine Tickets selbst, daher keine Umsatzzahlen – nur ehrlich die Ticket-Klicks. */}
    <SectionTitle>Umsatz & Tickets</SectionTitle>
    <Card tone="accent">
      <View style={styles.revenueRow}>
        <View style={studioStyles.flex}>
          <Text style={styles.revenueLabel}>Ticket-Klicks gesamt</Text>
          <Text style={styles.revenueValue}>{rows ? total('ticketClicks') : '–'}</Text>
        </View>
        <View style={styles.revenueIcon}><Icon name="ticket" size={22} color={studio.accent} /></View>
      </View>
      <Text style={studioStyles.muted}>So oft haben Gäste in Spots auf „Tickets“ getippt und sind zu eurem Ticket-Anbieter gegangen. Verkauft wird dort, deshalb sehen wir keinen Umsatz. Sobald Tickets direkt über Spots verkauft werden, erscheint der Umsatz hier.</Text>
    </Card>

    <SectionTitle>Pro Event</SectionTitle>
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
      <View style={styles.track}><LinearGradient colors={studio.accentFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.bar, { width: `${Math.round((row[metric] / max) * 100)}%` }]} /></View>
    </Card>)}
    <Text style={studioStyles.muted}>„Gemerkt“ zählt Merklisten mit Konto; wer ohne Konto merkt, bleibt auf dem eigenen Gerät. SHOTS zählen jeden hochgeladenen SHOT von Gästen, auch wenn er nach 24 Stunden verschwindet.</Text>
  </StudioPage>;
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 2 },
  value: { ...studioType.number, fontSize: 26, lineHeight: 30, color: studio.text },
  track: { height: 8, borderRadius: 4, backgroundColor: studio.panelHigh, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  revenueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  revenueLabel: { ...studioType.label, color: studio.faint },
  revenueValue: { ...studioType.number, fontSize: 40, lineHeight: 46, color: studio.text },
  revenueIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.accentSoft },
});
