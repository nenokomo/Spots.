import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { count, share } from './format';
import { studio, studioType } from './theme';

/**
 * Trichter eines Events: wie viele haben es gesehen, wie viele gemerkt, wie viele sind zu den Tickets gegangen.
 * Die Balken sind relativ zu „Gesehen“; die Quote steht neben der Zahl. Nur Summen, nichts über einzelne Personen (SQL 26).
 */
export function Funnel({ views, saves, ticketClicks }: { views: number; saves: number; ticketClicks: number }) {
  const rows = [
    { label: 'Gesehen', value: views, quota: null, width: views > 0 ? 1 : 0, colors: [studio.pink, studio.accent] as const },
    { label: 'Gemerkt', value: saves, quota: share(saves, views), width: views > 0 ? Math.min(1, saves / views) : 0, colors: ['#e23ab4', '#9a2aa6'] as const },
    { label: 'Zu den Tickets', value: ticketClicks, quota: share(ticketClicks, views), width: views > 0 ? Math.min(1, ticketClicks / views) : 0, colors: ['#b233b0', '#6d2a98'] as const },
  ];
  return <View style={styles.funnel}>
    {rows.map((row) => <View key={row.label} accessible accessibilityLabel={`${row.label}: ${count.format(row.value)}${row.quota ? `, ${row.quota}` : ''}`} style={styles.row}>
      <View style={styles.head}>
        <Text style={styles.label}>{row.label}</Text>
        {row.quota && <Text style={styles.quota}>{row.quota}</Text>}
        <Text style={styles.value}>{count.format(row.value)}</Text>
      </View>
      <View style={styles.track}>
        {row.value > 0 && <LinearGradient colors={row.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${Math.max(3, row.width * 100)}%` }]} />}
      </View>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  funnel: { gap: 14 },
  row: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  label: { ...studioType.body, flex: 1, color: studio.muted },
  // Text in Textfarben, nicht in der Balkenfarbe: die Farbe gehört dem Balken.
  quota: { ...studioType.small, color: studio.faint, fontWeight: '600' },
  value: { fontSize: 20, lineHeight: 24, fontWeight: '800', letterSpacing: -0.4, color: studio.text, fontVariant: ['tabular-nums'], minWidth: 44, textAlign: 'right' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: studio.panelHigh },
  fill: { height: 10, borderRadius: 5 },
});
