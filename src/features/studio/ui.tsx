import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Icon';
import { studio, studioType } from './theme';

// Bausteine der Studio-Oberfläche. Klein gehalten, damit Noyan sie später leicht umgestalten kann.

export function StudioPage({ title, subtitle, trailing, children, bottomInset = 96 }: { title: string; subtitle?: string; trailing?: ReactNode; children: ReactNode; bottomInset?: number }) {
  const insets = useSafeAreaInsets();
  return <ScrollView style={styles.page} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
    contentContainerStyle={[styles.pageContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + bottomInset }]}>
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.mark}>SPOTS <Text style={styles.markAccent}>STUDIO</Text></Text>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {trailing}
    </View>
    {children}
  </ScrollView>;
}

export function Card({ children, tone, style }: { children: ReactNode; tone?: 'lime' | 'amber' | 'red' | 'green'; style?: StyleProp<ViewStyle> }) {
  const toneStyle = tone ? { borderColor: { lime: studio.lime, amber: studio.amber, red: studio.red, green: studio.green }[tone] } : null;
  return <View style={[styles.card, toneStyle, style]}>{children}</View>;
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return <View style={styles.sectionRow}><Text style={styles.section}>{children}</Text>{action}</View>;
}

type ButtonProps = { label: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName; loading?: boolean; disabled?: boolean; small?: boolean };
export function StudioButton({ label, onPress, variant = 'primary', icon, loading, disabled, small }: ButtonProps) {
  const ink = variant === 'primary' ? studio.limeInk : variant === 'danger' ? studio.red : studio.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
    disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [styles.button, small && styles.buttonSmall, styles[variant], (disabled && !loading) && styles.disabled, pressed && styles.pressed]}>
    {loading ? <ActivityIndicator color={ink} /> : <>
      {icon && <Icon name={icon} size={small ? 16 : 18} color={ink} />}
      <Text style={[styles.buttonLabel, small && styles.buttonLabelSmall, { color: ink }]}>{label}</Text>
    </>}
  </Pressable>;
}

export function Pill({ label, tone = 'muted' }: { label: string; tone?: 'lime' | 'amber' | 'red' | 'green' | 'muted' }) {
  const palette = { lime: [studio.limeSoft, studio.lime], amber: [studio.amberSoft, studio.amber], red: [studio.redSoft, studio.red],
    green: [studio.greenSoft, studio.green], muted: [studio.panelHigh, studio.muted] }[tone];
  return <View style={[styles.pill, { backgroundColor: palette[0] }]}><Text style={[styles.pillLabel, { color: palette[1] }]}>{label}</Text></View>;
}

export function Kpi({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return <View style={styles.kpi}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={styles.kpiValue}>{value}</Text>
    {hint && <Text style={styles.kpiHint}>{hint}</Text>}
  </View>;
}

type InputProps = {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; optional?: boolean;
  keyboard?: 'default' | 'numbers-and-punctuation' | 'url' | 'number-pad' | 'phone-pad' | 'email-address';
  multiline?: boolean; maxLength?: number; editable?: boolean; secure?: boolean; autoComplete?: 'email' | 'new-password' | 'current-password' | 'tel' | 'postal-code' | 'name' | 'street-address' | 'off';
};
export function Input({ label, value, onChange, placeholder, optional, keyboard = 'default', multiline, maxLength, editable = true, secure, autoComplete }: InputProps) {
  const plain = keyboard === 'url' || keyboard === 'email-address' || secure;
  return <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}{optional && <Text style={styles.optional}>  freiwillig</Text>}</Text>
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={studio.faint} accessibilityLabel={label}
      autoCapitalize={plain ? 'none' : 'sentences'} autoCorrect={false} keyboardType={keyboard} multiline={multiline} maxLength={maxLength}
      editable={editable} secureTextEntry={secure} autoComplete={autoComplete}
      style={[styles.input, multiline && styles.multiline, !editable && styles.disabled]} />
  </View>;
}

export function Segmented<T extends string>({ options, value, onChange }: { options: Record<T, string>; value: T; onChange: (value: T) => void }) {
  return <View style={styles.segmented}>
    {(Object.keys(options) as T[]).map((key) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: value === key }}
      onPress={() => onChange(key)} style={[styles.segment, value === key && styles.segmentActive]}>
      <Text style={[styles.segmentLabel, value === key && styles.segmentLabelActive]}>{options[key]}</Text>
    </Pressable>)}
  </View>;
}

export function Message({ error, text }: { error?: string | null; text?: string | null }) {
  if (error) return <Text accessibilityRole="alert" style={styles.error}>{error}</Text>;
  if (text) return <Text accessibilityLiveRegion="polite" style={styles.ok}>{text}</Text>;
  return null;
}

export const studioStyles = StyleSheet.create({
  muted: { ...studioType.small, color: studio.muted },
  body: { ...studioType.body, color: studio.text },
  heading: { ...studioType.heading, color: studio.text },
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 100 },
  stack: { gap: 12 },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: studio.bg },
  pageContent: { paddingHorizontal: studio.page, gap: studio.gap * 1.25, maxWidth: 820, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1, gap: 6 },
  mark: { ...studioType.mark, color: studio.text },
  markAccent: { color: studio.pink },
  title: { ...studioType.title, color: studio.text },
  subtitle: { ...studioType.body, color: studio.muted },
  card: { gap: 12, padding: 18, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  section: { ...studioType.label, color: studio.faint },
  button: { minHeight: 48, borderRadius: studio.radiusSmall, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonSmall: { minHeight: 38, paddingHorizontal: 14 },
  primary: { backgroundColor: studio.lime },
  secondary: { backgroundColor: studio.panelHigh, borderWidth: 1, borderColor: studio.line },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: studio.redSoft, borderWidth: 1, borderColor: studio.red },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  buttonLabel: { fontSize: 15, fontWeight: '700' },
  buttonLabelSmall: { fontSize: 13 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillLabel: { ...studioType.label, fontSize: 10 },
  kpi: { flex: 1, minWidth: 130, gap: 2, padding: 16, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line },
  kpiLabel: { ...studioType.label, color: studio.faint },
  kpiValue: { ...studioType.number, color: studio.text },
  kpiHint: { ...studioType.small, color: studio.muted },
  field: { gap: 6 },
  fieldLabel: { ...studioType.label, color: studio.muted },
  optional: { color: studio.faint, textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  input: { ...studioType.body, color: studio.text, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderRadius: studio.radiusSmall,
    backgroundColor: studio.bg, borderWidth: 1, borderColor: studio.line },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: studio.radiusSmall + 2, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line },
  segment: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: studio.radiusSmall - 2 },
  segmentActive: { backgroundColor: studio.panelHigh },
  segmentLabel: { fontSize: 14, fontWeight: '600', color: studio.muted },
  segmentLabelActive: { color: studio.text },
  error: { ...studioType.small, color: studio.red },
  ok: { ...studioType.small, color: studio.green },
});
