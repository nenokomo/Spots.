import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { Icon } from './Icon';

type Props = { today: string; selectedDate: string | null; eventDays: string[]; onSelect: (date: string) => void };

export function EventCalendar({ today, selectedDate, eventDays, onSelect }: Props) {
  const [month, setMonth] = useState(() => (selectedDate ?? today).slice(0, 7));
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells = Math.ceil((offset + days) / 7) * 7;
  const title = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
  const canGoBack = month > today.slice(0, 7);

  function changeMonth(amount: number) {
    setMonth(new Date(Date.UTC(year, monthNumber - 1 + amount, 1)).toISOString().slice(0, 7));
  }

  return (
    <View>
      <View style={styles.heading}>
        <Pressable accessibilityRole="button" accessibilityLabel="Vorheriger Monat" disabled={!canGoBack} onPress={() => changeMonth(-1)} style={[styles.nav, !canGoBack && styles.disabled]}><Icon name="back" size={19} /></Pressable>
        <Text accessibilityLiveRegion="polite" style={styles.title}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Nächster Monat" onPress={() => changeMonth(1)} style={styles.nav}><Icon name="chevron" size={19} /></Pressable>
      </View>
      <View style={styles.grid}>{['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => <View key={day} style={styles.cell}><Text style={styles.weekday}>{day}</Text></View>)}</View>
      <View style={styles.grid}>
        {Array.from({ length: cells }, (_, index) => {
          const day = index - offset + 1;
          if (day < 1 || day > days) return <View key={index} style={styles.cell} />;
          const key = `${month}-${String(day).padStart(2, '0')}`;
          const disabled = key < today;
          const selected = key === selectedDate;
          const hasEvents = eventDays.includes(key);
          const label = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, monthNumber - 1, day)));
          return <View key={index} style={styles.cell}><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hasEvents ? 'Demo-Events für diesen Tag vorhanden' : 'Events für diesen Tag anzeigen'} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => onSelect(key)} style={[styles.day, key === today && styles.today, selected && styles.selected, disabled && styles.disabled]}><Text style={[styles.dayText, selected && styles.selectedText]}>{day}</Text><View style={[styles.dot, hasEvents && !disabled && styles.eventDot, selected && hasEvents && styles.selectedDot]} /></Pressable></View>;
        })}
      </View>
      <Text style={styles.legend}>● Demo-Events vorhanden · vergangene Tage sind deaktiviert</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  weekday: { color: colors.muted, fontSize: 11 },
  day: { width: '100%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent', gap: 3 },
  today: { borderColor: '#c922ab80' },
  selected: { backgroundColor: colors.accent, borderColor: colors.pink },
  disabled: { opacity: 0.28 },
  dayText: { color: colors.text, fontSize: 13 },
  selectedText: { fontWeight: '800' },
  dot: { height: 4, width: 4, borderRadius: 2, backgroundColor: 'transparent' },
  eventDot: { backgroundColor: colors.pink },
  selectedDot: { backgroundColor: colors.text },
  legend: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 12, textAlign: 'center' },
});
