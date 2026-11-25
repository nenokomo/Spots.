import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { useNow } from '../../hooks/useNow';
import { dayKey } from '../../utils/events';
import { dailyTotals, fetchEventStatsDaily, type EventStats, type EventStatsDay } from '../organizer/organizerApi';
import { count, dayFormat, isUpcoming, share } from './format';
import { Funnel } from './Funnel';
import { useEventStats } from './hooks';
import { openEvent } from './routes';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { Card, Chip, Empty, Message, SectionTitle, Segmented, StudioPage, studioStyles } from './ui';

const metrics = { views: 'Aufrufe', saves: 'Gemerkt', ticketClicks: 'Tickets' } as const;
type Metric = keyof typeof metrics;
const DAYS = 30;
const chartDay = new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: '2-digit' });
const labelOf = (day: string) => chartDay.format(new Date(`${day}T12:00:00Z`));

/**
 * Verlauf der letzten 30 Tage als Balken: eine Kennzahl, eine Achse, eine Farbe. Tippen auf einen Tag zeigt seinen Wert
 * (statt einer Zahl an jedem Balken). Tage ohne Wert bleiben als feiner Strich sichtbar.
 */
function History({ days, metric }: { days: Omit<EventStatsDay, 'eventId'>[]; metric: Metric }) {
  const [selected, setSelected] = useState<string | null>(null);
  const values = days.map((day) => day[metric]);
  const max = Math.max(1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);
  const picked = days.find((day) => day.day === selected) ?? null;
  return <View style={styles.history}>
    <View style={styles.readout}>
      <Text style={styles.readoutValue}>{count.format(picked ? picked[metric] : total)}</Text>
      <Text style={studioStyles.muted}>{picked ? labelOf(picked.day) : `${metrics[metric]} in ${DAYS} Tagen`}</Text>
    </View>
    <View style={styles.bars}>
      {days.map((day) => {
        const value = day[metric];
        return <Pressable key={day.day} accessibilityRole="button" accessibilityLabel={`${labelOf(day.day)}: ${count.format(value)} ${metrics[metric]}`}
          onPress={() => setSelected(selected === day.day ? null : day.day)} style={styles.barSlot}>
          <View style={[styles.bar, { height: value > 0 ? Math.max(4, (value / max) * 96) : 2 }, value === 0 && styles.barZero, selected === day.day && styles.barOn]} />
        </Pressable>;
      })}
    </View>
    <View style={styles.axis}>
      <Text style={styles.axisLabel}>{days[0] ? labelOf(days[0].day) : ''}</Text>
      <Text style={styles.axisLabel}>Heute</Text>
    </View>
  </View>;
}

/** Ein Event im Vergleich: Aufrufe und wie viele davon zu den Tickets gegangen sind. Tippen öffnet die Eventseite. */
function CompareRow({ row, image, last }: { row: EventStats; image: string | null; last: boolean }) {
  const quota = share(row.ticketClicks, row.views);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${row.title} öffnen`} onPress={() => openEvent(row.eventId)}
    style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && styles.pressed]}>
    {image ? <Image source={{ uri: image }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]}><Icon name="calendar" size={16} color={studio.faint} /></View>}
    <View style={styles.rowCopy}>
      <Text numberOfLines={1} style={styles.rowName}>{row.title}</Text>
      <Text style={studioStyles.muted}>{dayFormat.format(new Date(row.startsAt))}{row.isPublished ? '' : ' · Entwurf'}</Text>
    </View>
    <View style={styles.rowNumbers}>
      <Text style={styles.rowValue}>{count.format(row.views)}</Text>
      <Text style={studioStyles.faint}>{quota ? `${quota} zu Tickets` : 'Aufrufe'}</Text>
    </View>
  </Pressable>;
}

/**
 * Reiter „Zahlen“ (docs/STUDIO-UMBAU-PLAN.md): pro Event der Trichter Gesehen → Gemerkt → Zu den Tickets, der Verlauf der
 * letzten 30 Tage und der Vergleich der Events. Nur was wirklich gezählt wird (SQL 26/38) – Einnahmen kommen dazu,
 * sobald es Verkaufszahlen gibt. Keine erfundenen Zahlen.
 */
export default function StatsScreen() {
  const { organizer, events } = useStudio();
  const now = useNow();
  const stats = useEventStats(organizer?.id, events);
  const [daily, setDaily] = useState<EventStatsDay[] | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('views');
  const [privacy, setPrivacy] = useState(false);
  const organizerId = organizer?.id;

  useEffect(() => {
    if (!organizerId) return;
    let active = true;
    fetchEventStatsDaily(organizerId, DAYS).then((rows) => { if (active) setDaily(rows); }, () => { if (active) setDaily([]); });
    return () => { active = false; };
  }, [organizerId, events]);

  if (!organizer) return null;
  const rows = [...(stats.rows ?? [])].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  // Vorgewählt: das nächste Event, sonst das letzte. „Alle“ bleibt als Summe wählbar.
  const upcoming = [...rows].reverse().find((row) => isUpcoming({ startsAt: row.startsAt, endsAt: events.find((event) => event.id === row.eventId)?.endsAt ?? null }, now));
  const selectedId = choice ?? upcoming?.eventId ?? rows[0]?.eventId ?? 'all';
  const selected = rows.find((row) => row.eventId === selectedId) ?? null;
  const sum = (key: 'views' | 'saves' | 'ticketClicks' | 'snaps') => selected ? selected[key] : rows.reduce((total, row) => total + row[key], 0);
  const days = dailyTotals((daily ?? []).filter((row) => !selected || row.eventId === selected.eventId), dayKey(new Date(now)), DAYS);
  const flyer = (id: string) => events.find((event) => event.id === id)?.imageUrl ?? null;

  return <StudioPage title="Zahlen">
    <Message error={stats.error} />
    {stats.rows === null && !stats.error && <ActivityIndicator color={studio.accent} />}
    {stats.rows && rows.length === 0 && <Empty icon="chart" title="Noch keine Zahlen" text="Sobald ihr ein Event veröffentlicht habt, seht ihr hier, wie es ankommt." />}

    {rows.length > 0 && <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
        {rows.slice(0, 15).map((row) => <Chip key={row.eventId} label={`${dayFormat.format(new Date(row.startsAt))} · ${row.title}`} selected={selectedId === row.eventId} onPress={() => setChoice(row.eventId)} />)}
        <Chip label="Alle Events" selected={selectedId === 'all'} onPress={() => setChoice('all')} />
      </ScrollView>

      <Card>
        <Funnel views={sum('views')} saves={sum('saves')} ticketClicks={sum('ticketClicks')} />
        <View style={styles.shots}>
          <Icon name="camera" size={16} color={studio.faint} />
          <Text style={styles.shotsLabel}>Shots von Gästen</Text>
          <Text style={styles.shotsValue}>{count.format(sum('snaps'))}</Text>
        </View>
      </Card>

      <SectionTitle>Verlauf</SectionTitle>
      <Card>
        <Segmented options={metrics} value={metric} onChange={setMetric} />
        {daily === null ? <ActivityIndicator color={studio.accent} /> : <History key={`${selectedId}-${metric}`} days={days} metric={metric} />}
      </Card>

      {rows.length > 1 && <>
        <SectionTitle>Vergleich</SectionTitle>
        <Card style={styles.list}>
          {rows.map((row, index) => <CompareRow key={row.eventId} row={row} image={flyer(row.eventId)} last={index === rows.length - 1} />)}
        </Card>
      </>}

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: privacy }} onPress={() => setPrivacy(!privacy)} style={styles.privacy}>
        <Icon name="info" size={16} color={studio.faint} />
        <Text style={styles.privacyText}>{privacy
          ? 'Aufrufe und Ticket-Klicks zählen pro Gerät höchstens einmal am Tag. „Gemerkt“ zählt Merklisten mit Konto. Über einzelne Personen speichern wir nichts.'
          : 'Datensparsam gezählt'}</Text>
      </Pressable>
    </>}
  </StudioPage>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  chipScroll: { marginHorizontal: -studio.page },
  chips: { gap: 8, paddingHorizontal: studio.page },
  shots: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: studio.line },
  shotsLabel: { ...studioType.body, flex: 1, color: studio.muted },
  shotsValue: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: studio.text, fontVariant: ['tabular-nums'] },
  history: { gap: 8 },
  readout: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  readoutValue: { ...studioType.number, fontSize: 28, lineHeight: 32, color: studio.text },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 100, borderBottomWidth: 1, borderBottomColor: studio.line },
  barSlot: { flex: 1, height: 100, justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: studio.accent },
  barZero: { backgroundColor: studio.panelHigh },
  barOn: { backgroundColor: studio.text },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { ...studioType.small, fontSize: 12, color: studio.faint },
  list: { gap: 0, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: studio.line },
  thumb: { width: 40, height: 50, borderRadius: 8, backgroundColor: studio.panelHigh },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, gap: 2 },
  rowName: { ...studioType.body, fontWeight: '700', color: studio.text },
  rowNumbers: { alignItems: 'flex-end', gap: 2 },
  rowValue: { fontSize: 18, lineHeight: 22, fontWeight: '800', color: studio.text, fontVariant: ['tabular-nums'] },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
  privacyText: { ...studioType.small, flex: 1, color: studio.faint },
});
