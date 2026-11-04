import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '../constants/theme';

type Props = { today: string; selectedDate: string | null; eventDays: string[]; onSelect: (date: string) => void };

export function EventCalendar({ today, selectedDate, eventDays, onSelect }: Props) {
  const { fontScale } = useWindowDimensions();
  const rowHeight = Math.max(44, Math.ceil(24 * fontScale + 12));
  const headingHeight = Math.max(44, Math.ceil(24 * fontScale + 16));
  const [startYear, startMonth] = today.slice(0, 7).split('-').map(Number);
  const [selectedYear, selectedMonth] = (selectedDate ?? today).slice(0, 7).split('-').map(Number);
  const initialIndex = Math.max(0, (selectedYear - startYear) * 12 + selectedMonth - startMonth);
  const [monthCount, setMonthCount] = useState(() => Math.max(12, initialIndex + 12));
  let offset = 0;
  const months: { month: string; length: number; offset: number }[] = [];
  for (let index = 0; index < monthCount; index += 1) {
    const date = new Date(Date.UTC(startYear, startMonth - 1 + index, 1));
    const weeks = Math.ceil(((date.getUTCDay() + 6) % 7 + new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()) / 7);
    const length = headingHeight + weeks * rowHeight + 20;
    months.push({ month: date.toISOString().slice(0, 7), length, offset });
    offset += length;
  }

  return <View style={styles.container}>
    <View style={styles.grid}>{['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => <View key={day} style={styles.cell}><Text style={styles.weekday}>{day}</Text></View>)}</View>
    <FlatList
      accessibilityLabel="Kalender, nach unten zu weiteren Monaten scrollen"
      style={styles.monthList}
      data={months}
      keyExtractor={(item) => item.month}
      initialScrollIndex={initialIndex}
      getItemLayout={(_, index) => ({ length: months[index].length, offset: months[index].offset, index })}
      initialNumToRender={3}
      windowSize={5}
      onEndReached={() => setMonthCount((count) => count + 12)}
      onEndReachedThreshold={0.5}
      renderItem={({ item }) => <CalendarMonth today={today} selectedDate={selectedDate} eventDays={eventDays} onSelect={onSelect} month={item.month} rowHeight={rowHeight} headingHeight={headingHeight} />}
    />
    <Text style={styles.legend}>● Demo-Events vorhanden · vergangene Tage sind deaktiviert</Text>
  </View>;
}

function CalendarMonth({ today, selectedDate, eventDays, onSelect, month, rowHeight, headingHeight }: Props & { month: string; rowHeight: number; headingHeight: number }) {
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells = Math.ceil((offset + days) / 7) * 7;
  const title = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);

  return (
    <View style={styles.month}>
      <View style={[styles.heading, { height: headingHeight }]}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      </View>
      <View style={styles.grid}>
        {Array.from({ length: cells }, (_, index) => {
          const day = index - offset + 1;
          if (day < 1 || day > days) return <View key={index} style={[styles.cell, { height: rowHeight }]} />;
          const key = `${month}-${String(day).padStart(2, '0')}`;
          const disabled = key < today;
          const selected = key === selectedDate;
          const hasEvents = eventDays.includes(key);
          const label = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, monthNumber - 1, day)));
          return <View key={index} style={[styles.cell, { height: rowHeight }]}><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hasEvents ? 'Demo-Events für diesen Tag vorhanden' : 'Events für diesen Tag anzeigen'} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => onSelect(key)} style={[styles.day, { height: rowHeight }, key === today && styles.today, selected && styles.selected, disabled && styles.disabled]}><Text style={[styles.dayText, selected && styles.selectedText]}>{day}</Text><View style={[styles.dot, hasEvents && !disabled && styles.eventDot, selected && hasEvents && styles.selectedDot]} /></Pressable></View>;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  monthList: { flex: 1 },
  month: { paddingBottom: 20 },
  heading: { justifyContent: 'center', paddingHorizontal: 8 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
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
