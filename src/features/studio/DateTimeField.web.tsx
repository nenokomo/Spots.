import { Text, View } from 'react-native';
import type { DateTimeFieldProps } from './DateTimeField';
import { Input, studioStyles } from './ui';

/** Web-Vorschau: Die Auswahl des Systems gibt es dort nicht, deshalb ein Textfeld mit demselben Format. */
export function DateTimeField({ label, mode, value, onChange, note, error, disabled }: DateTimeFieldProps) {
  return <View style={studioStyles.stack}>
    <Input label={label} value={value} onChange={onChange} placeholder={mode === 'date' ? 'TT.MM.JJJJ' : 'HH:MM'} keyboard="numbers-and-punctuation" editable={!disabled} error={error} />
    {note && <Text style={studioStyles.muted}>{note}</Text>}
  </View>;
}
