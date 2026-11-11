import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { colors } from '../constants/theme';

type Props = { today: string; selectedDate: string | null; eventDays: string[]; onSelect: (date: string) => void };

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const ROWS = 6; // fixed so every month page has the same height; short months leave the last row empty
const ROW = 46;
const PAGE = ROWS * ROW;
const monthTitle = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayLabel = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function monthKey(startYear: number, startMonth: number, index: number) {
  return new Date(Date.UTC(startYear, startMonth - 1 + index, 1)).toISOString().slice(0, 7);
}

/**
 * Month calendar for the date sheet: centered title, weekday row, one month per page.
 * Change months by swiping up/down; each swipe snaps to a whole month.
 */
export function EventCalendar({ today, selectedDate, eventDays, onSelect }: Props) {
  const [startYear, startMonth] = today.slice(0, 7).split('-').map(Number);
  const [selectedYear, selectedMonth] = (selectedDate ?? today).slice(0, 7).split('-').map(Number);
  const initialIndex = Math.max(0, (selectedYear - startYear) * 12 + selectedMonth - startMonth);
  const [current, setCurrent] = useState(initialIndex);
  const [monthCount, setMonthCount] = useState(() => Math.max(12, initialIndex + 12));
  const months = useMemo(() => Array.from({ length: monthCount }, (_, index) => monthKey(startYear, startMonth, index)), [monthCount, startYear, startMonth]);
  const eventSet = useMemo(() => new Set(eventDays), [eventDays]);
  const [titleYear, titleMonth] = months[current].split('-').map(Number);

  // Title follows the visible month while scrolling (wheel and touch alike).
  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.max(0, Math.round(event.nativeEvent.contentOffset.y / PAGE));
    setCurrent((value) => (value === index ? value : index));
  }

  return (
    <View>
      <View style={styles.heading}>
        <Text accessibilityLiveRegion="polite" accessibilityRole="header" style={styles.title}>{monthTitle.format(new Date(Date.UTC(titleYear, titleMonth - 1, 1)))}</Text>
      </View>
      <View style={styles.grid}>{WEEKDAYS.map((day) => <View key={day} style={styles.weekdayCell}><Text style={styles.weekday}>{day}</Text></View>)}</View>
      <FlatList
        accessibilityLabel="Kalender, nach oben oder unten wischen für andere Monate"
        style={styles.pages}
        data={months}
        keyExtractor={(item) => item}
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={PAGE}
        showsVerticalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: PAGE, offset: PAGE * index, index })}
        initialNumToRender={2}
        windowSize={3}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onEndReached={() => setMonthCount((count) => count + 12)}
        onEndReachedThreshold={1}
        renderItem={({ item }) => <Month month={item} today={today} selectedDate={selectedDate} eventSet={eventSet} onSelect={onSelect} />}
      />
      <Text style={styles.legend}><Text style={styles.legendDot}>●</Text> Tage mit Events · vergangene Tage sind deaktiviert</Text>
    </View>
  );
}

function Month({ month, today, selectedDate, eventSet, onSelect }: { month: string; today: string; selectedDate: string | null; eventSet: Set<string>; onSelect: (date: string) => void }) {
  const [year, monthNumber] = month.split('-').map(Number);
  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells = Math.ceil((offset + days) / 7) * 7;

  return (
    <View style={[styles.grid, { height: PAGE }]}>
      {Array.from({ length: cells }, (_, index) => {
        const day = index - offset + 1;
        if (day < 1 || day > days) return <View key={index} style={styles.cell} />;
        const key = `${month}-${String(day).padStart(2, '0')}`;
        const disabled = key < today;
        const selected = key === selectedDate;
        const hasEvents = eventSet.has(key);
        return (
          <View key={index} style={styles.cell}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={dayLabel.format(new Date(Date.UTC(year, monthNumber - 1, day)))}
              accessibilityHint={hasEvents ? 'Events für diesen Tag vorhanden' : 'Events für diesen Tag anzeigen'}
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onSelect(key)}
              style={[styles.day, key === today && styles.today, selected && styles.selected, disabled && styles.disabled]}
            >
              <Text style={[styles.dayText, selected && styles.selectedText]}>{day}</Text>
              <View style={[styles.dot, hasEvents && !disabled && styles.eventDot, selected && hasEvents && styles.selectedDot]} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  disabled: { opacity: 0.28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' },
  weekdayCell: { width: '14.285714%', height: 36, alignItems: 'center', justifyContent: 'center' },
  weekday: { color: colors.muted, fontSize: 11 },
  pages: { height: PAGE },
  cell: { width: '14.285714%', height: ROW, alignItems: 'center', justifyContent: 'center', padding: 1 },
  day: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent', gap: 3 },
  today: { borderColor: '#c922ab80' },
  selected: { backgroundColor: colors.accent, borderColor: colors.pink },
  dayText: { color: colors.text, fontSize: 13 },
  selectedText: { fontWeight: '800' },
  dot: { height: 4, width: 4, borderRadius: 2, backgroundColor: 'transparent' },
  eventDot: { backgroundColor: colors.pink },
  selectedDot: { backgroundColor: colors.text },
  legend: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 12, textAlign: 'center' },
  legendDot: { color: '#d9c6e6' },
});
