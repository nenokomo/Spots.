import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '../constants/theme';

type Props = { today: string; selectedDate: string | null; eventDays: string[]; onSelect: (date: string) => void };

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const ROWS = 6; // every month gets six week rows, so all pages have the same height
const HEADER = 64;
const monthName = new Intl.DateTimeFormat('de-DE', { month: 'long', timeZone: 'UTC' });
const dayLabel = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function monthKey(startYear: number, startMonth: number, index: number) {
  return new Date(Date.UTC(startYear, startMonth - 1 + index, 1)).toISOString().slice(0, 7);
}

/**
 * Month view in the style of Apple Calendar: exactly one month fills the area,
 * scrolling vertically snaps to the next or previous month.
 */
export function EventCalendar({ today, selectedDate, eventDays, onSelect }: Props) {
  const [pageHeight, setPageHeight] = useState(0);
  const [startYear, startMonth] = today.slice(0, 7).split('-').map(Number);
  const [selectedYear, selectedMonth] = (selectedDate ?? today).slice(0, 7).split('-').map(Number);
  const initialIndex = Math.max(0, (selectedYear - startYear) * 12 + selectedMonth - startMonth);
  const [monthCount, setMonthCount] = useState(() => Math.max(12, initialIndex + 12));
  const months = useMemo(() => Array.from({ length: monthCount }, (_, index) => monthKey(startYear, startMonth, index)), [monthCount, startYear, startMonth]);
  const eventSet = useMemo(() => new Set(eventDays), [eventDays]);

  return (
    <View style={styles.container}>
      <View style={styles.weekdays}>{WEEKDAYS.map((day, index) => <Text key={day} style={[styles.weekday, index >= 5 && styles.weekend]}>{day}</Text>)}</View>
      <View style={styles.pages} onLayout={({ nativeEvent }) => setPageHeight(Math.floor(nativeEvent.layout.height))}>
        {pageHeight > 0 && <FlatList
          accessibilityLabel="Kalender, nach unten wischen für den nächsten Monat"
          data={months}
          keyExtractor={(item) => item}
          pagingEnabled
          decelerationRate="fast"
          snapToInterval={pageHeight}
          showsVerticalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
          initialNumToRender={2}
          windowSize={3}
          onEndReached={() => setMonthCount((count) => count + 12)}
          onEndReachedThreshold={1}
          renderItem={({ item }) => <Month month={item} height={pageHeight} today={today} selectedDate={selectedDate} eventSet={eventSet} onSelect={onSelect} />}
        />}
      </View>
      <View style={styles.legend}><View style={styles.legendDot} /><Text style={styles.legendText}>Tage mit Events · nach unten wischen für den nächsten Monat</Text></View>
    </View>
  );
}

function Month({ month, height, today, selectedDate, eventSet, onSelect }: { month: string; height: number; today: string; selectedDate: string | null; eventSet: Set<string>; onSelect: (date: string) => void }) {
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const rowHeight = Math.max(40, Math.floor((height - HEADER) / ROWS));
  const currentYear = Number(today.slice(0, 4));

  return (
    <View style={{ height }}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.month}>{monthName.format(first)}</Text>
        {year !== currentYear && <Text style={styles.year}>{year}</Text>}
      </View>
      <View style={styles.grid}>
        {Array.from({ length: ROWS * 7 }, (_, index) => {
          const day = index - offset + 1;
          if (day < 1 || day > days) return <View key={index} style={[styles.cell, { height: rowHeight }]} />;
          const key = `${month}-${String(day).padStart(2, '0')}`;
          const past = key < today;
          const isToday = key === today;
          const selected = key === selectedDate;
          const hasEvents = eventSet.has(key);
          return (
            <View key={index} style={[styles.cell, { height: rowHeight }, index % 7 === 0 && styles.rowStart]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${dayLabel.format(new Date(Date.UTC(year, monthNumber - 1, day)))}${hasEvents ? ', Events vorhanden' : ''}`}
                accessibilityState={{ selected, disabled: past }}
                disabled={past}
                onPress={() => onSelect(key)}
                hitSlop={4}
                style={styles.dayTouch}
              >
                <View style={[styles.circle, selected && styles.circleSelected, isToday && !selected && styles.circleToday]}>
                  <Text style={[styles.day, past && styles.dayPast, isToday && styles.dayToday, selected && styles.daySelected]}>{day}</Text>
                </View>
                <View style={[styles.dot, hasEvents && !past && styles.dotVisible]} />
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  weekdays: { flexDirection: 'row', paddingBottom: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  weekday: { flex: 1, textAlign: 'center', ...type.footnote, fontSize: 12, fontWeight: '600', color: colors.muted },
  weekend: { color: colors.faint },
  pages: { flex: 1, overflow: 'hidden' },
  header: { height: HEADER, flexDirection: 'row', alignItems: 'baseline', gap: space.sm, paddingTop: space.lg, paddingHorizontal: space.xs },
  month: { ...type.title, color: colors.text },
  year: { ...type.title3, color: colors.faint },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285714%', alignItems: 'center', justifyContent: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ffffff12' },
  rowStart: {},
  dayTouch: { alignItems: 'center', paddingTop: space.xs, gap: 3 },
  circle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  circleSelected: { backgroundColor: colors.accent },
  circleToday: { borderWidth: 1.5, borderColor: colors.pink },
  day: { ...type.callout, fontSize: 17, color: colors.text },
  dayPast: { color: '#ffffff40' },
  dayToday: { color: colors.pink, fontWeight: '700' },
  daySelected: { color: colors.text, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
  dotVisible: { backgroundColor: colors.pink },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingTop: space.sm },
  legendDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.pink },
  legendText: { ...type.footnote, fontSize: 11, color: colors.faint },
});
