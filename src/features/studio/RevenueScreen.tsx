import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { fetchEventStats, type EventStats } from '../organizer/organizerApi';
import { dayFormat } from './format';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { Card, Message, Pill, SectionTitle, StudioButton, StudioPage, studioStyles } from './ui';

/**
 * Verkaufszahlen eines Events. Daten nötig von Jacint: Spots verkauft keine Tickets selbst, deshalb gibt es diese
 * Zahlen noch nicht. Sobald das Backend sie liefert, werden sie hier geladen – die Seite ist dafür fertig aufgebaut.
 */
type Sales = { ticketsSold: number; revenueCents: number };
type SalesByEvent = Record<string, Sales>;

/** Nur in der Entwicklung: Beispielzahlen, um das Design zu beurteilen. Als TEST markiert, nie in einem Release-Build. */
function testSales(rows: EventStats[]): SalesByEvent {
  return Object.fromEntries(rows.map((row, index) => {
    const ticketsSold = 24 + ((index * 37 + row.title.length * 11) % 180);
    return [row.eventId, { ticketsSold, revenueCents: ticketsSold * 1200 }];
  }));
}

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const count = new Intl.NumberFormat('de-DE');

/**
 * /studio/revenue (Reiter „Einnahmen“): eine Seite für Geld und Zahlen (Design Noyan, 23.11.).
 * Oben Einnahmen und verkaufte Tickets, darunter die Reichweite, dann jedes Event mit allen Zahlen in einer Zeile.
 * Reichweite: nur Summen pro Event, nichts über einzelne Personen (SQL 26). Keine erfundenen Zahlen.
 */
export default function RevenueScreen() {
  const { organizer, events } = useStudio();
  const [rows, setRows] = useState<EventStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const organizerId = organizer?.id;

  useEffect(() => {
    if (!organizerId) return;
    let active = true;
    fetchEventStats(organizerId).then((data) => { if (active) { setRows(data); setError(null); } })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); });
    return () => { active = false; };
  }, [organizerId, events]);

  const list = [...(rows ?? [])].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const sales: SalesByEvent | null = __DEV__ && preview && rows ? testSales(rows) : null;
  const total = (key: 'views' | 'saves' | 'ticketClicks') => list.reduce((sum, row) => sum + row[key], 0);
  const sold = sales ? Object.values(sales).reduce((sum, item) => sum + item.ticketsSold, 0) : null;
  const revenue = sales ? Object.values(sales).reduce((sum, item) => sum + item.revenueCents, 0) : null;
  const loading = rows === null && !error;
  const show = (value: number) => loading ? '–' : count.format(value);
  const flyer = (id: string) => events.find((event) => event.id === id)?.imageUrl ?? null;

  return <StudioPage title="Einnahmen" subtitle="Tickets und Zahlen eurer Events.">
    <Message error={error} />

    <View style={styles.hero}>
      <LinearGradient pointerEvents="none" colors={[studio.accentSoft, '#ffffff05']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.heroHead}>
        <Text style={styles.heroLabel}>Einnahmen</Text>
        {sales && <Pill tone="amber" label="TEST · Beispielzahlen" />}
      </View>
      <Text style={styles.heroValue}>{revenue === null ? '–' : euro.format(revenue / 100)}</Text>
      <Text style={styles.heroSub}>{sold === null ? 'Verkaufszahlen gibt es noch nicht' : sold === 1 ? '1 Ticket verkauft' : `${count.format(sold)} Tickets verkauft`}</Text>
      <View style={styles.heroStats}>
        <MiniStat icon="search" label="Aufrufe" value={show(total('views'))} />
        <View style={styles.heroDivider} />
        <MiniStat icon="heart" label="Gemerkt" value={show(total('saves'))} />
        <View style={styles.heroDivider} />
        <MiniStat icon="ticket" label="Ticket-Klicks" value={show(total('ticketClicks'))} />
      </View>
    </View>

    {!sales && <Card>
      <Text style={studioStyles.heading}>Warum steht hier noch kein Betrag?</Text>
      <Text style={studioStyles.muted}>Eure Tickets werden bei eurem Ticket-Anbieter oder an der Abendkasse verkauft. Spots bekommt diese Verkaufszahlen noch nicht. Die Ticket-Klicks zeigen, wie oft Gäste aus Spots zu euren Tickets gegangen sind.</Text>
    </Card>}

    <SectionTitle>Pro Event</SectionTitle>
    {rows && list.length === 0 && <Card><Text style={studioStyles.muted}>Noch keine Events. Legt im Reiter „Events“ euer erstes an.</Text></Card>}
    {list.length > 0 && <Card style={styles.list}>
      {list.map((row, index) => <EventRow key={row.eventId} row={row} sales={sales?.[row.eventId] ?? null} image={flyer(row.eventId)} last={index === list.length - 1} />)}
    </Card>}

    <Text style={styles.footnote}>Aufrufe und Ticket-Klicks zählen pro Gerät höchstens einmal am Tag. „Gemerkt“ zählt Merklisten mit Konto. SHOTS zählen jeden hochgeladenen SHOT von Gästen.</Text>
    {__DEV__ && <StudioButton small variant="ghost" label={preview ? 'TEST · Beispielzahlen ausblenden' : 'TEST · Beispielzahlen zeigen'} onPress={() => setPreview(!preview)} />}
  </StudioPage>;
}

function MiniStat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return <View style={styles.mini}>
    <View style={styles.miniHead}><Icon name={icon} size={13} color={studio.accent} /><Text numberOfLines={1} style={styles.miniLabel}>{label}</Text></View>
    <Text style={styles.miniValue}>{value}</Text>
  </View>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return <Text style={styles.stat}><Text style={styles.statValue}>{count.format(value)}</Text> {label}</Text>;
}

/** Ein Event mit allen Zahlen in einer Zeile. Rechts Einnahmen und Tickets, sobald es Verkaufszahlen gibt. Tippen öffnet das Event. */
function EventRow({ row, sales, image, last }: { row: EventStats; sales: Sales | null; image: string | null; last: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={row.title}
    onPress={() => router.push({ pathname: '/studio/event/[id]', params: { id: row.eventId } })}
    style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && styles.pressed]}>
    {image ? <Image source={{ uri: image }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]}><Icon name="calendar" size={18} color={studio.faint} /></View>}
    <View style={styles.rowCopy}>
      <Text numberOfLines={1} style={styles.rowName}>{row.title}</Text>
      <Text style={styles.rowMeta}>{dayFormat.format(new Date(row.startsAt))}{row.isPublished ? '' : ' · Entwurf'}</Text>
      <View style={styles.rowStats}>
        <Stat value={row.views} label="Aufrufe" />
        <Stat value={row.saves} label="Gemerkt" />
        <Stat value={row.ticketClicks} label="Ticket-Klicks" />
        <Stat value={row.snaps} label="SHOTS" />
      </View>
    </View>
    {sales && <View style={styles.rowSales}>
      <Text style={styles.rowRevenue}>{euro.format(sales.revenueCents / 100)}</Text>
      <Text style={styles.rowSold}>{sales.ticketsSold === 1 ? '1 Ticket' : `${count.format(sales.ticketsSold)} Tickets`}</Text>
    </View>}
  </Pressable>;
}

const styles = StyleSheet.create({
  hero: { gap: 4, padding: 20, borderRadius: studio.radius, overflow: 'hidden', borderWidth: 1, borderColor: studio.accentLine, backgroundColor: studio.panel },
  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 22 },
  heroLabel: { ...studioType.label, color: studio.pink },
  heroValue: { ...studioType.number, fontSize: 52, lineHeight: 58, color: studio.text },
  heroSub: { ...studioType.body, color: studio.muted },
  heroStats: { flexDirection: 'row', alignItems: 'stretch', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: studio.line },
  heroDivider: { width: 1, backgroundColor: studio.line, marginHorizontal: 12 },
  mini: { flex: 1, gap: 4 },
  miniHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  miniLabel: { ...studioType.label, fontSize: 10, color: studio.faint, flexShrink: 1 },
  miniValue: { ...studioType.number, fontSize: 22, lineHeight: 26, color: studio.text },
  list: { gap: 0, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: studio.line },
  pressed: { opacity: 0.7 },
  thumb: { width: 48, height: 60, borderRadius: 10, backgroundColor: studio.panelHigh },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, gap: 3 },
  rowName: { ...studioType.body, fontWeight: '700', color: studio.text },
  rowMeta: { ...studioType.small, fontSize: 12, color: studio.muted },
  rowStats: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2, marginTop: 4 },
  stat: { ...studioType.small, fontSize: 12, color: studio.muted },
  statValue: { fontWeight: '700', color: studio.text, fontVariant: ['tabular-nums'] },
  rowSales: { alignItems: 'flex-end', gap: 2 },
  rowRevenue: { ...studioType.number, fontSize: 20, lineHeight: 24, color: studio.text },
  rowSold: { ...studioType.small, fontSize: 12, color: studio.pink },
  footnote: { ...studioType.small, fontSize: 12, color: studio.faint },
});
