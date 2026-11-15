import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, space, squircle, type } from '../../constants/theme';

// Einfache Formular-Bausteine für den Veranstalter-Bereich. Design offen für Noyan.

export function httpsOrNull(value: string): string | null | 'invalid' {
  const raw = value.trim();
  if (!raw) return null;
  try { return new URL(raw).protocol === 'https:' && !/\s/.test(raw) ? raw : 'invalid'; } catch { return 'invalid'; }
}

type FieldProps = {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string;
  keyboard?: 'numbers-and-punctuation' | 'url'; multiline?: boolean; maxLength?: number; editable?: boolean;
};
export function Field({ label, value, onChange, placeholder, keyboard, multiline, maxLength, editable = true }: FieldProps) {
  return <View style={formStyles.field}>
    <Text style={formStyles.label}>{label}</Text>
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.faint}
      accessibilityLabel={label} autoCapitalize={keyboard === 'url' ? 'none' : 'sentences'} autoCorrect={false}
      keyboardType={keyboard ?? 'default'} multiline={multiline} maxLength={maxLength} editable={editable}
      style={[formStyles.input, multiline && formStyles.multiline]} />
  </View>;
}

export function Choices<T extends string>({ label, options, value, onChange }: { label: string; options: Record<T, string>; value: T; onChange: (value: T) => void }) {
  return <View style={formStyles.field}>
    <Text style={formStyles.label}>{label}</Text>
    <View style={formStyles.row}>
      {(Object.keys(options) as T[]).map((item) => (
        <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: value === item }} onPress={() => onChange(item)}
          style={[formStyles.choice, value === item && formStyles.choiceActive]}>
          <Text style={[formStyles.choiceLabel, value === item && formStyles.choiceActiveLabel]}>{options[item]}</Text>
        </Pressable>
      ))}
    </View>
  </View>;
}

export const formStyles = StyleSheet.create({
  field: { gap: space.xs },
  label: { ...type.overline, fontSize: 11, color: colors.faint },
  input: { ...type.body, color: colors.text, minHeight: 44, paddingHorizontal: space.md, paddingVertical: space.sm,
    borderRadius: radius.md, backgroundColor: colors.surfaceHigh, ...squircle },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 90 },
  choice: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: colors.surfaceHigh },
  choiceActive: { backgroundColor: colors.text },
  choiceLabel: { ...type.footnote, color: colors.muted },
  choiceActiveLabel: { color: colors.background, fontWeight: '600' },
  hint: { ...type.footnote, color: colors.muted },
  error: { ...type.footnote, color: colors.danger },
  card: { gap: space.xs, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...squircle },
  cardTitle: { ...type.headline, color: colors.text },
  meta: { ...type.footnote, color: colors.muted },
});
