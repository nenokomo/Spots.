import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { studio, studioType } from './theme';
import { PickerField, StudioButton, StudioSheet, studioStyles } from './ui';

export type DateTimeFieldProps = {
  label: string; mode: 'date' | 'time';
  /** „TT.MM.JJJJ“ oder „HH:MM“ (Berliner Ortszeit, wie sie der Veranstalter meint). Leer = noch nichts gewählt. */
  value: string; onChange: (value: string) => void; placeholder: string;
  /** Startwert der Auswahl, solange noch nichts gewählt ist, z. B. „23:00“. */
  fallback?: string;
  /** Nur Datum: frühester wählbarer Tag ist heute. */
  fromToday?: boolean;
  /** Kleine Zeile unter dem Feld, z. B. „am nächsten Tag“. */
  note?: string | null; error?: string | null; disabled?: boolean;
  /** In einem Sheet: auf iOS die Auswahl direkt in der Zeile (wie im Kalender), ohne ein zweites Sheet. Braucht einen Wert. */
  inline?: boolean;
};

const pad = (value: number) => String(value).padStart(2, '0');
const dayLabel = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

// Die Auswahl arbeitet mit der Uhr des Handys. Wir lesen nur Tag und Uhrzeit ab (keinen Zeitpunkt),
// damit „23:00“ immer 23:00 in Berlin heißt, egal wo das Handy gerade ist.
function toDate(mode: 'date' | 'time', text: string): Date {
  const now = new Date();
  if (mode === 'date') {
    const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim());
    return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  }
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), match ? Number(match[1]) : 22, match ? Number(match[2]) : 0);
}
const toText = (mode: 'date' | 'time', date: Date) => mode === 'date'
  ? `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}` : `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/**
 * Datum oder Uhrzeit wählen statt tippen (@react-native-community/datetimepicker, in Expo Go enthalten).
 * Android: der Dialog des Systems. iOS: Kalender bzw. Rad in einem Sheet. Web: Textfeld (DateTimeField.web.tsx).
 */
export function DateTimeField({ label, mode, value, onChange, placeholder, fallback, fromToday, note, error, disabled, inline }: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => toDate(mode, value || fallback || ''));
  const today = new Date();
  const minimumDate = mode === 'date' && fromToday ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : undefined;
  const shown = !value.trim() ? null : mode === 'date' ? dayLabel.format(toDate('date', value)) : `${value} Uhr`;

  function show() {
    const start = toDate(mode, value || fallback || '');
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: start, mode, is24Hour: true, minimumDate, onValueChange: (_event, date) => onChange(toText(mode, date)) });
      return;
    }
    setDraft(start);
    setOpen(true);
  }

  if (inline && Platform.OS === 'ios') return <View style={studioStyles.stack}>
    <View style={styles.inline}>
      <Text style={styles.inlineLabel}>{label}</Text>
      <DateTimePicker value={toDate(mode, value || fallback || '')} mode={mode} display="compact" themeVariant="dark" accentColor={studio.accent} locale="de-DE"
        minuteInterval={mode === 'time' ? 5 : undefined} minimumDate={minimumDate} disabled={disabled} onValueChange={(_event, date) => onChange(toText(mode, date))} />
    </View>
    {note && <Text style={studioStyles.muted}>{note}</Text>}
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;

  return <View style={studioStyles.stack}>
    <PickerField label={label} value={shown} placeholder={placeholder} icon={mode === 'date' ? 'calendar' : 'clock'} onPress={show} error={error} disabled={disabled} />
    {note && <Text style={studioStyles.muted}>{note}</Text>}
    {Platform.OS === 'ios' && <StudioSheet visible={open} title={label} onClose={() => setOpen(false)}>
      <DateTimePicker value={draft} mode={mode} display={mode === 'date' ? 'inline' : 'spinner'} themeVariant="dark" accentColor={studio.accent} locale="de-DE"
        minuteInterval={mode === 'time' ? 5 : undefined} minimumDate={minimumDate} onValueChange={(_event, date) => setDraft(date)} />
      <StudioButton label="Übernehmen" onPress={() => { onChange(toText(mode, draft)); setOpen(false); }} />
    </StudioSheet>}
  </View>;
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52, paddingHorizontal: 16, borderRadius: studio.radiusSmall, backgroundColor: '#ffffff0d', borderWidth: 1, borderColor: studio.line },
  inlineLabel: { ...studioType.body, fontSize: 16, color: studio.text },
  error: { ...studioType.small, color: studio.red },
});
