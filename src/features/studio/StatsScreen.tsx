import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { useNow } from '../../hooks/useNow';
import { dayKey } from '../../utils/events';
import { dailyTotals, fetchEventStatsDaily, type EventStats, type EventStatsDay } from '../organizer/organizerApi';
import { count, dayFormat, isUpcoming, share, ticketInsight } from './format';
import { Funnel } from './Funnel';
import { useEventStats, useStudioRefresh } from './hooks';
import { openEvent } from './routes';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { Card, Empty, ErrorNote, Grow, MenuRow, SectionTitle, Segmented, Skeleton, StudioPage, StudioSheet, studioStyles } from './ui';

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
      <Text style={studioStyles.muted}>{picked ? labelOf(picked.day) : `${metrics[metric]} · letzte ${DAYS} Tage`}</Text>
    </View>
    <Grow axis="y" trigger={metric} style={styles.bars}>
      {days.map((day) => {
        const value = day[metric];
        return <Pressable key={day.day} accessibilityRole="button" accessibilityLabel={`${labelOf(day.day)}: ${count.format(value)} ${metrics[metric]}`}
          onPress={() => setSelected(selected === day.day ? null : day.day)} style={styles.barSlot}>
          <View style={[styles.bar, { height: value > 0 ? Math.max(4, (value / max) * 96) : 2 }, value === 0 && styles.barZero, selected === day.day && styles.barOn]} />
        </Pressable>;
      })}
    </Grow>
    <View style={styles.axis}>
      <Text style={styles.axisLabel}>{days[0] ? labelOf(days[0].day) : ''}</Text>
      <Text style={styles.axisLabel}>Heute</Text>
    </View>
  </View>;
}

/** Ein Event im Vergleich: Aufrufe und wie viele davon zu den Tickets gegangen sind. Tippen öffnet die Eventseite. */
function CompareRow({ row, state, image, last }: { row: EventStats; state: string; image: string | null; last: boolean }) {
  const quota = share(row.ticketClicks, row.views);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${row.title} öffnen`} onPress={() => openEvent(row.eventId)}
    style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && styles.pressed]}>
    {image ? <Image source={{ uri: image }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]}><Icon name="calendar" size={16} color={studio.faint} /></View>}
    <View style={styles.rowCopy}>
      <Text numberOfLines={1} style={styles.rowName}>{row.title}</Text>
      <Text style={studioStyles.muted}>{dayFormat.format(new Date(row.startsAt))}{state}</Text>
    </View>
    <View style={styles.rowNumbers}>
      <Text style={styles.rowValue}>{count.format(row.views)}</Text>
      <Text style={studioStyles.faint}>{quota ? `${quota} zu Tickets` : 'Aufrufe'}</Text>
    </View>
  </Pressable>;
}

/**
 * Tab „Zahlen“ (docs/STUDIO-UMBAU-PLAN.md): oben ein Knopf zur Wahl des Events, dann ein Satz Erkenntnis, der Trichter
 * Gesehen → Gemerkt → Zu den Tickets, der Verlauf der letzten 30 Tage und der Vergleich der Events. Nur was wirklich gezählt wird (SQL 26/38) – Einnahmen kommen dazu,
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
  const [picking, setPicking] = useState(false);
  const refresh = useStudioRefresh();
  const organizerId = organizer?.id;

  useEffect(() => {
    if (!organizerId) return;
    let active = true;
    fetchEventStatsDaily(organizerId, DAYS).then((rows) => { if (active) setDaily(rows); }, () => { if (active) setDaily([]); });
    return () => { active = false; };
  }, [organizerId, events]);

  if (!organizer) return null;
  const rows = [...(stats.rows ?? [])].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  // Vorgewählt: das nächste veröffentlichte Event, sonst das letzte veröffentlichte, sonst das neueste. „Alle“ bleibt wählbar.
  const eventOf = (id: string) => events.find((event) => event.id === id);
  const live = rows.filter((row) => row.isPublished && eventOf(row.eventId)?.status !== 'cancelled');
  const upcoming = [...live].reverse().find((row) => isUpcoming({ startsAt: row.startsAt, endsAt: eventOf(row.eventId)?.endsAt ?? null }, now));
  const selectedId = choice ?? upcoming?.eventId ?? live[0]?.eventId ?? rows[0]?.eventId ?? 'all';
  /** „Entwurf“ oder „Abgesagt“ hinter dem Datum; veröffentlichte Events brauchen keinen Zusatz. */
  const stateOf = (row: EventStats) => eventOf(row.eventId)?.status === 'cancelled' ? ' · Abgesagt' : row.isPublished ? '' : ' · Entwurf';
  const selected = rows.find((row) => row.eventId === selectedId) ?? null;
  const sum = (key: 'views' | 'saves' | 'ticketClicks' | 'snaps') => selected ? selected[key] : rows.reduce((total, row) => total + row[key], 0);
  const days = dailyTotals((daily ?? []).filter((row) => !selected || row.eventId === selected.eventId), dayKey(new Date(now)), DAYS);
  const flyer = (id: string) => events.find((event) => event.id === id)?.imageUrl ?? null;
  const insight = ticketInsight(sum('views'), sum('ticketClicks'), selected ? rows.filter((row) => row.eventId !== selected.eventId) : []);
  const choose = (id: string) => { setChoice(id); setPicking(false); };

  return <StudioPage title="Zahlen" onRefresh={refresh.onRefresh} refreshing={refresh.refreshing}>
    {stats.error && <ErrorNote message={stats.error} onRetry={refresh.onRefresh} busy={refresh.refreshing} />}
    {stats.rows === null && !stats.error && <>
      <Skeleton height={60} radius={studio.radius} />
      <Skeleton height={230} radius={studio.radius} />
      <Skeleton height={210} radius={studio.radius} />
    </>}
    {stats.rows && rows.length === 0 && <Empty icon="chart" title="Noch keine Zahlen" text="Sobald ihr ein Event veröffentlicht habt, seht ihr hier, wie es ankommt." />}

    {rows.length > 0 && <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Event wählen: ${selected ? selected.title : 'Alle Events'}`} onPress={() => setPicking(true)}
        style={({ pressed }) => [styles.picker, pressed && styles.pressed]}>
        <View style={styles.pickerCopy}>
          <Text numberOfLines={1} style={styles.pickerTitle}>{selected ? selected.title : 'Alle Events'}</Text>
          {selected && <Text style={studioStyles.muted}>{dayFormat.format(new Date(selected.startsAt))}{stateOf(selected)}</Text>}
        </View>
        <Icon name="down" size={18} color={studio.muted} />
      </Pressable>

      <Card>
        <Text style={styles.insight}>{insight}</Text>
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
        {daily === null ? <Skeleton height={150} /> : <History key={`${selectedId}-${metric}`} days={days} metric={metric} />}
      </Card>

      {rows.length > 1 && <>
        <SectionTitle>Vergleich</SectionTitle>
        <Card style={styles.list}>
          {rows.map((row, index) => <CompareRow key={row.eventId} row={row} state={stateOf(row)} image={flyer(row.eventId)} last={index === rows.length - 1} />)}
        </Card>
      </>}

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: privacy }} onPress={() => setPrivacy(!privacy)} style={styles.privacy}>
        <Icon name="info" size={16} color={studio.faint} />
        <Text style={styles.privacyText}>{privacy
          ? 'Aufrufe und Ticket-Klicks zählen pro Gerät höchstens einmal am Tag. „Gemerkt“ zählt Merklisten mit Konto. Über einzelne Personen speichern wir nichts.'
          : 'Datensparsam gezählt'}</Text>
      </Pressable>
    </>}

    <StudioSheet visible={picking} title="Event wählen" onClose={() => setPicking(false)}>
      <MenuRow icon="chart" title="Alle Events" hint="Alles zusammen" onPress={() => choose('all')} />
      {rows.map((row) => <MenuRow key={row.eventId} icon="calendar" title={row.title} hint={`${dayFormat.format(new Date(row.startsAt))}${stateOf(row)}`} onPress={() => choose(row.eventId)} />)}
    </StudioSheet>
  </StudioPage>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 18, paddingVertical: 10, borderRadius: studio.radius, backgroundColor: studio.panelHigh, borderWidth: 1, borderColor: studio.line },
  pickerCopy: { flex: 1, gap: 2 },
  pickerTitle: { fontSize: 18, lineHeight: 23, fontWeight: '700', letterSpacing: -0.2, color: studio.text },
  insight: { fontSize: 18, lineHeight: 25, fontWeight: '700', letterSpacing: -0.2, color: studio.text },
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
