import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Icon';
import { Backdrop } from '../../components/Screen';
import { SectionTitle as NeonTitle } from '../../components/ui/Section';
import { squircle } from '../../constants/theme';
import { studio, studioType } from './theme';

// Bausteine der Studio-Oberfläche im Spots-Look (Design Noyan). Gleiche Schnittstellen wie vorher.

/** Small „SPOTS STUDIO“ mark: the Studio badge on every page. */
export function StudioMark() {
  return <View style={styles.markRow}>
    <Text style={styles.mark}>SPOTS</Text>
    <LinearGradient colors={studio.accentFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}><Text style={styles.badgeText}>STUDIO</Text></LinearGradient>
  </View>;
}

/** Seite im Studio. `footer` bleibt unten stehen (z. B. „Speichern“ im Event), der Rest scrollt. */
export function StudioPage({ title, subtitle, trailing, children, footer, bottomInset = 120 }: { title: string; subtitle?: string; trailing?: ReactNode; children: ReactNode; footer?: ReactNode; bottomInset?: number }) {
  const insets = useSafeAreaInsets();
  return <View style={styles.page}>
    <Backdrop />
    <ScrollView style={styles.fill} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.pageContent, { paddingTop: insets.top + 16, paddingBottom: footer ? 24 : insets.bottom + bottomInset }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <StudioMark />
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {trailing}
      </View>
      {children}
    </ScrollView>
    {footer && <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}><View style={styles.footerInner}>{footer}</View></View>}
  </View>;
}

/** Aufklappbarer Bereich: eine Zeile, die ihren Inhalt öffnet. Der Inhalt lädt beim ersten Öffnen und behält danach seine Eingaben. */
export function Fold({ icon, title, hint, defaultOpen = false, children }: { icon: IconName; title: string; hint?: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(defaultOpen);
  return <View style={styles.fold}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={title}
      onPress={() => { setOpen(!open); setMounted(true); }} style={({ pressed }) => [styles.foldHead, open && styles.foldHeadOpen, pressed && styles.foldPressed]}>
      <View style={styles.foldIcon}><Icon name={icon} size={18} color={studio.accent} /></View>
      <View style={styles.foldCopy}>
        <Text style={styles.foldTitle}>{title}</Text>
        {hint && <Text numberOfLines={1} style={styles.foldHint}>{hint}</Text>}
      </View>
      <Icon name={open ? 'down' : 'chevron'} size={16} color={studio.faint} />
    </Pressable>
    {mounted && <View style={open ? styles.foldBody : styles.hidden}>{children}</View>}
  </View>;
}

export function Card({ children, tone, style }: { children: ReactNode; tone?: 'accent' | 'amber' | 'red' | 'green'; style?: StyleProp<ViewStyle> }) {
  const toneStyle = tone ? { borderColor: { accent: studio.accentLine, amber: studio.amber, red: studio.red, green: studio.green }[tone] } : null;
  return <View style={[styles.card, toneStyle, style]}>{children}</View>;
}

/** Section heading with the pink neon glow of the visitor app, optional action on the right. */
export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return <View style={styles.sectionRow}><NeonTitle title={children} style={styles.section} />{action}</View>;
}

type ButtonProps = { label: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName; loading?: boolean; disabled?: boolean; small?: boolean };
export function StudioButton({ label, onPress, variant = 'primary', icon, loading, disabled, small }: ButtonProps) {
  const ink = variant === 'danger' ? studio.red : variant === 'ghost' ? studio.accent : studio.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
    disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [styles.button, small && styles.buttonSmall, styles[variant], (disabled && !loading) && styles.disabled, pressed && styles.pressed]}>
    {variant === 'primary' && <LinearGradient pointerEvents="none" colors={studio.accentFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
    {loading ? <ActivityIndicator color={ink} /> : <>
      {icon && <Icon name={icon} size={small ? 16 : 18} color={ink} />}
      <Text numberOfLines={1} style={[styles.buttonLabel, small && styles.buttonLabelSmall, { color: ink }]}>{label}</Text>
    </>}
  </Pressable>;
}

/** Status pill. Entwurf grau, In Prüfung/Verschoben gelb, Live rosa (leuchtend), Abgesagt rot. */
export function Pill({ label, tone = 'muted' }: { label: string; tone?: 'accent' | 'amber' | 'red' | 'green' | 'muted' }) {
  const palette = { accent: [studio.accentSoft, studio.accent], amber: [studio.amberSoft, studio.amber], red: [studio.redSoft, studio.red],
    green: [studio.greenSoft, studio.green], muted: [studio.panelHigh, studio.muted] }[tone];
  return <View style={[styles.pill, { backgroundColor: palette[0] }, tone === 'accent' && styles.pillGlow]}>
    <View style={[styles.pillDot, { backgroundColor: palette[1] }]} />
    <Text style={[styles.pillLabel, { color: palette[1] }]}>{label}</Text>
  </View>;
}

export function Kpi({ label, value, hint, icon }: { label: string; value: number | string; hint?: string; icon?: IconName }) {
  return <View style={styles.kpi}>
    <View style={styles.kpiHead}>
      {icon && <View style={styles.kpiIcon}><Icon name={icon} size={14} color={studio.accent} /></View>}
      <Text numberOfLines={1} style={styles.kpiLabel}>{label}</Text>
    </View>
    <Text style={styles.kpiValue}>{value}</Text>
    {hint && <Text numberOfLines={2} style={styles.kpiHint}>{hint}</Text>}
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
      editable={editable} secureTextEntry={secure} autoComplete={autoComplete} selectionColor={studio.accent}
      style={[styles.input, multiline && styles.multiline, !editable && styles.disabled]} />
  </View>;
}

/** Pill switch like on the organizer page: the active option in the Orchidee gradient. */
export function Segmented<T extends string>({ options, value, onChange }: { options: Record<T, string>; value: T; onChange: (value: T) => void }) {
  return <View style={styles.segmented}>
    {(Object.keys(options) as T[]).map((key) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: value === key }}
      onPress={() => onChange(key)} style={styles.segment}>
      {value === key && <LinearGradient pointerEvents="none" colors={studio.accentFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.segmentFill]} />}
      <Text numberOfLines={1} style={[styles.segmentLabel, value === key && styles.segmentLabelActive]}>{options[key]}</Text>
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
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 100 },
  stack: { gap: 12 },
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { flex: 1, backgroundColor: studio.bg },
  pageContent: { paddingHorizontal: studio.page, gap: studio.gap * 1.25, maxWidth: 820, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1, gap: 8 },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mark: { ...studioType.mark, color: studio.text },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText: { ...studioType.mark, fontSize: 10, lineHeight: 13, color: studio.text },
  title: { ...studioType.title, color: studio.text },
  subtitle: { ...studioType.body, color: studio.muted },
  footer: { paddingHorizontal: studio.page, paddingTop: 12, borderTopWidth: 1, borderTopColor: studio.line, backgroundColor: studio.bg },
  footerInner: { gap: 8, maxWidth: 820 - studio.page * 2, width: '100%', alignSelf: 'center' },
  fold: { gap: 10 },
  foldHead: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, ...squircle },
  foldHeadOpen: { borderColor: studio.accentLine },
  foldPressed: { opacity: 0.85 },
  foldIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.accentSoft },
  foldCopy: { flex: 1, gap: 2 },
  foldTitle: { ...studioType.heading, fontSize: 16, lineHeight: 21, color: studio.text },
  foldHint: { ...studioType.small, color: studio.muted },
  foldBody: { gap: 10 },
  hidden: { display: 'none' },
  card: { gap: 12, padding: 18, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, ...squircle },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  section: { fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.3, flexShrink: 1 },
  button: { minHeight: 50, borderRadius: 25, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  buttonSmall: { minHeight: 38, borderRadius: 19, paddingHorizontal: 14, alignSelf: 'flex-start' },
  primary: { borderWidth: 1, borderColor: '#ffffff26' },
  secondary: { backgroundColor: studio.panelHigh, borderWidth: 1, borderColor: studio.line },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: studio.redSoft, borderWidth: 1, borderColor: '#ff6b6b66' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonLabel: { fontSize: 15, fontWeight: '700' },
  buttonLabelSmall: { fontSize: 13 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillGlow: { boxShadow: '0 0 12px 0 #ff4ab84d' },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillLabel: { ...studioType.label, fontSize: 10, letterSpacing: 0.6 },
  kpi: { flexGrow: 1, flexBasis: '45%', minWidth: 140, gap: 4, padding: 16, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, ...squircle },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.accentSoft },
  kpiLabel: { ...studioType.label, color: studio.faint, flexShrink: 1 },
  kpiValue: { ...studioType.number, color: studio.text, marginTop: 4 },
  kpiHint: { ...studioType.small, fontSize: 12, color: studio.faint },
  field: { gap: 6 },
  fieldLabel: { ...studioType.label, color: studio.muted },
  optional: { color: studio.faint, textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  input: { ...studioType.body, color: studio.text, minHeight: 50, paddingHorizontal: 16, paddingVertical: 13, borderRadius: studio.radiusSmall,
    backgroundColor: '#ffffff0d', borderWidth: 1, borderColor: studio.line },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 999, backgroundColor: '#ffffff0d', borderWidth: 1, borderColor: studio.line },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8 },
  segmentFill: { borderRadius: 999 },
  segmentLabel: { fontSize: 14, fontWeight: '600', color: studio.faint },
  segmentLabelActive: { color: studio.text },
  error: { ...studioType.small, color: studio.red },
  ok: { ...studioType.small, color: studio.green },
});
