import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Icon';
import { Backdrop } from '../../components/Screen';
import { SectionTitle as NeonTitle } from '../../components/ui/Section';
import { colors, squircle } from '../../constants/theme';
import { studio, studioType } from './theme';

// Bausteine der Studio-Oberfläche im Spots-Look (Design Noyan). Regeln dazu: docs/STUDIO-UMBAU-PLAN.md, Abschnitt 4.

/** Small „SPOTS STUDIO“ mark. Only on the overview, not on every page. */
export function StudioMark() {
  return <View style={styles.markRow}>
    <Text style={styles.mark}>SPOTS</Text>
    <LinearGradient colors={studio.accentFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}><Text style={styles.badgeText}>STUDIO</Text></LinearGradient>
  </View>;
}

/** Round icon button, e.g. the back arrow top left or the settings gear top right. */
export function RoundButton({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={8}
    style={({ pressed }) => [styles.round, pressed && styles.pressed, disabled && styles.disabled]}>
    <Icon name={icon} size={19} color={studio.text} />
  </Pressable>;
}

type PageProps = {
  title: string; subtitle?: string;
  /** „SPOTS STUDIO“ über dem Titel (nur Übersicht). */
  mark?: boolean;
  /** Unterseite: Zurück-Pfeil oben links. */
  onBack?: () => void;
  trailing?: ReactNode; children: ReactNode;
  /** Bleibt über dem scrollenden Inhalt stehen (z. B. die Schritte beim Anlegen eines Events). */
  fixedTop?: ReactNode;
  /** Bleibt unten stehen (z. B. „Weiter“), der Rest scrollt. */
  footer?: ReactNode; bottomInset?: number;
  /** Nach unten ziehen lädt neu. */
  onRefresh?: () => void; refreshing?: boolean;
};

/** Seite im Studio. Reiter-Seiten haben einen großen Titel, Unterseiten den Zurück-Pfeil oben links. */
export function StudioPage({ title, subtitle, mark, onBack, trailing, children, fixedTop, footer, bottomInset = 120, onRefresh, refreshing }: PageProps) {
  const insets = useSafeAreaInsets();
  return <View style={styles.page}>
    <Backdrop />
    {fixedTop && <View style={[styles.fixedTop, { paddingTop: insets.top + 8 }]}><View style={styles.fixedInner}>{fixedTop}</View></View>}
    <ScrollView style={styles.fill} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={studio.accent} colors={[studio.accent]} /> : undefined}
      contentContainerStyle={[styles.pageContent, { paddingTop: fixedTop ? 16 : insets.top + 12, paddingBottom: footer ? 24 : insets.bottom + bottomInset }]}>
      {onBack && !fixedTop && <View style={styles.topBar}><RoundButton icon="back" label="Zurück" onPress={onBack} />{trailing}</View>}
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          {mark && <StudioMark />}
          <Text accessibilityRole="header" style={onBack ? styles.titleSmall : styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {!onBack && trailing}
      </View>
      {children}
    </ScrollView>
    {footer && <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}><View style={styles.footerInner}>{footer}</View></View>}
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

type ButtonProps = { label: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName; loading?: boolean; disabled?: boolean; small?: boolean; style?: StyleProp<ViewStyle> };
export function StudioButton({ label, onPress, variant = 'primary', icon, loading, disabled, small, style }: ButtonProps) {
  const ink = variant === 'danger' ? studio.red : variant === 'ghost' ? studio.accent : studio.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
    disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [styles.button, small && styles.buttonSmall, styles[variant], (disabled && !loading) && styles.disabled, pressed && styles.pressed, style]}>
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

/** Auswahl-Chip, z. B. Genre oder Event. */
export function Chip({ label, selected, onPress, disabled }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled: !!disabled }} accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.chip, selected && styles.chipActive, pressed && styles.pressed, disabled && styles.disabled]}>
    <Text numberOfLines={1} style={[styles.chipLabel, selected && styles.chipLabelActive]}>{label}</Text>
  </Pressable>;
}

/** Ein Punkt einer Checkliste. Offene Punkte lassen sich antippen und führen dorthin, wo man sie erledigt. */
export function Check({ done, label, onPress }: { done: boolean; label: string; onPress?: () => void }) {
  const open = !done && !!onPress;
  return <Pressable accessibilityRole={open ? 'button' : 'text'} accessibilityLabel={`${label}: ${done ? 'erledigt' : 'offen'}`} disabled={!open} onPress={onPress}
    style={({ pressed }) => [styles.check, pressed && styles.pressed]}>
    <View style={[styles.checkDot, done && styles.checkDotDone]}>{done && <Icon name="check" size={13} color={studio.onAccent} />}</View>
    <Text style={[styles.checkLabel, done && styles.checkLabelDone]}>{label}</Text>
    {open && <Icon name="chevron" size={14} color={studio.faint} />}
  </Pressable>;
}

/** Zeile mit Symbol, Titel und optionaler zweiter Zeile – für Menüs in Sheets und Listen. */
export function MenuRow({ icon, title, hint, onPress, disabled, danger, trailing }: { icon: IconName; title: string; hint?: string; onPress?: () => void; disabled?: boolean; danger?: boolean; trailing?: ReactNode }) {
  const ink = danger ? studio.red : studio.accent;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: !!disabled }} disabled={disabled || !onPress} onPress={onPress}
    style={({ pressed }) => [styles.menuRow, pressed && styles.menuPressed, disabled && styles.disabled]}>
    <View style={[styles.menuIcon, danger && styles.menuIconDanger]}><Icon name={icon} size={19} color={ink} /></View>
    <View style={styles.menuCopy}>
      <Text style={[styles.menuTitle, danger && { color: studio.red }]}>{title}</Text>
      {hint && <Text style={styles.menuHint}>{hint}</Text>}
    </View>
    {trailing ?? (onPress && !disabled && <Icon name="chevron" size={15} color={studio.faint} />)}
  </Pressable>;
}

/** Leerer Zustand: Symbol, ein Satz, optional eine Aktion. */
export function Empty({ icon, title, text, children }: { icon: IconName; title: string; text?: string; children?: ReactNode }) {
  return <View style={styles.empty}>
    <View style={styles.emptyIcon}><Icon name={icon} size={24} color={studio.accent} /></View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {text && <Text style={styles.emptyText}>{text}</Text>}
    {children}
  </View>;
}

/** Schmaler Fortschrittsbalken, 0 bis 1. */
export function ProgressBar({ value }: { value: number }) {
  const share = Math.max(0, Math.min(1, value));
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(share * 100) }} style={styles.progress}>
    <LinearGradient colors={[studio.pink, studio.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: `${share * 100}%` }]} />
  </View>;
}

/** Bottom sheet im Studio. Die Tastatur schiebt den Inhalt nach oben. */
export function StudioSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return <Modal visible={visible} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetBackdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${title} schließen`} onPress={onClose} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.sheetHead}>
          <Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Schließen" onPress={onClose} hitSlop={8} style={styles.sheetClose}><Icon name="close" size={15} color={studio.muted} /></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>{children}</ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}

type ConfirmProps = { visible: boolean; title: string; text?: string; confirmLabel: string; cancelLabel?: string; danger?: boolean; busy?: boolean; error?: string | null; onConfirm: () => void; onClose: () => void };
/** Rückfrage vor allem, was sich nicht zurücknehmen lässt (absagen, löschen). */
export function ConfirmSheet({ visible, title, text, confirmLabel, cancelLabel = 'Abbrechen', danger, busy, error, onConfirm, onClose }: ConfirmProps) {
  return <StudioSheet visible={visible} title={title} onClose={onClose}>
    {text && <Text style={studioStyles.body}>{text}</Text>}
    <Message error={error} />
    <StudioButton variant={danger ? 'danger' : 'primary'} label={confirmLabel} loading={busy} onPress={onConfirm} />
    <StudioButton variant="ghost" label={cancelLabel} disabled={busy} onPress={onClose} />
  </StudioSheet>;
}

type InputProps = {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; optional?: boolean;
  keyboard?: 'default' | 'numbers-and-punctuation' | 'url' | 'number-pad' | 'phone-pad' | 'email-address' | 'decimal-pad';
  multiline?: boolean; maxLength?: number; editable?: boolean; secure?: boolean; autoComplete?: 'email' | 'new-password' | 'current-password' | 'tel' | 'postal-code' | 'name' | 'street-address' | 'off';
  /** Fehler direkt am Feld. */
  error?: string | null;
};
export function Input({ label, value, onChange, placeholder, optional, keyboard = 'default', multiline, maxLength, editable = true, secure, autoComplete, error }: InputProps) {
  const plain = keyboard === 'url' || keyboard === 'email-address' || secure;
  return <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}{optional && <Text style={styles.optional}>  freiwillig</Text>}</Text>
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={studio.faint} accessibilityLabel={label}
      autoCapitalize={plain ? 'none' : 'sentences'} autoCorrect={false} keyboardType={keyboard} multiline={multiline} maxLength={maxLength}
      editable={editable} secureTextEntry={secure} autoComplete={autoComplete} selectionColor={studio.accent}
      style={[styles.input, multiline && styles.multiline, !editable && styles.disabled, !!error && styles.inputError]} />
    {error && <Text accessibilityRole="alert" style={styles.fieldError}>{error}</Text>}
  </View>;
}

/** Feld, das eine Auswahl öffnet (Datum, Uhrzeit): zeigt den Wert, tippen öffnet die Auswahl. */
export function PickerField({ label, value, placeholder, icon, onPress, error, disabled }: { label: string; value: string | null; placeholder: string; icon: IconName; onPress: () => void; error?: string | null; disabled?: boolean }) {
  return <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value ?? placeholder}`} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.input, styles.picker, pressed && styles.menuPressed, disabled && styles.disabled, !!error && styles.inputError]}>
      <Icon name={icon} size={17} color={value ? studio.accent : studio.faint} />
      <Text numberOfLines={1} style={[styles.pickerValue, !value && { color: studio.faint }]}>{value ?? placeholder}</Text>
    </Pressable>
    {error && <Text accessibilityRole="alert" style={styles.fieldError}>{error}</Text>}
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
  faint: { ...studioType.small, color: studio.faint },
  body: { ...studioType.body, color: studio.text },
  heading: { ...studioType.heading, color: studio.text },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 100 },
  stack: { gap: 12 },
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { flex: 1, backgroundColor: studio.bg },
  pageContent: { paddingHorizontal: studio.page, gap: studio.gap, maxWidth: 820, width: '100%', alignSelf: 'center' },
  fixedTop: { paddingHorizontal: studio.page, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: studio.line },
  fixedInner: { maxWidth: 820 - studio.page * 2, width: '100%', alignSelf: 'center', gap: 12 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.panelHigh, borderWidth: 1, borderColor: studio.line },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1, gap: 6 },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mark: { ...studioType.mark, color: studio.text },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText: { ...studioType.mark, fontSize: 11, lineHeight: 14, color: studio.text },
  title: { ...studioType.title, color: studio.text },
  titleSmall: { fontSize: 26, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5, color: studio.text },
  subtitle: { ...studioType.body, color: studio.muted },
  footer: { paddingHorizontal: studio.page, paddingTop: 12, borderTopWidth: 1, borderTopColor: studio.line, backgroundColor: studio.bg },
  footerInner: { gap: 8, maxWidth: 820 - studio.page * 2, width: '100%', alignSelf: 'center' },
  card: { gap: 12, padding: 18, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, ...squircle },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  section: { fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.3, flexShrink: 1 },
  button: { minHeight: 52, borderRadius: 26, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  buttonSmall: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, alignSelf: 'flex-start' },
  primary: { borderWidth: 1, borderColor: '#ffffff26' },
  secondary: { backgroundColor: studio.panelHigh, borderWidth: 1, borderColor: studio.line },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: studio.redSoft, borderWidth: 1, borderColor: '#ff6b6b66' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
  buttonLabelSmall: { fontSize: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillGlow: { boxShadow: '0 0 12px 0 #ff4ab84d' },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillLabel: { ...studioType.label, fontSize: 11, letterSpacing: 0.6 },
  chip: { maxWidth: 260, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: studio.line, backgroundColor: studio.panelHigh },
  chipActive: { backgroundColor: studio.accent, borderColor: studio.accent },
  chipLabel: { ...studioType.small, color: studio.text },
  chipLabelActive: { color: studio.onAccent, fontWeight: '700' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  checkDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: studio.faint },
  checkDotDone: { backgroundColor: studio.accent, borderColor: studio.accent },
  checkLabel: { ...studioType.body, flex: 1, color: studio.text, fontWeight: '600' },
  checkLabelDone: { color: studio.muted, fontWeight: '400' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, ...squircle },
  menuPressed: { backgroundColor: studio.panelHigh },
  menuIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.accentSoft },
  menuIconDanger: { backgroundColor: studio.redSoft },
  menuCopy: { flex: 1, gap: 2 },
  menuTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: studio.text },
  menuHint: { ...studioType.small, color: studio.muted },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 20, borderRadius: studio.radius, borderWidth: 1, borderColor: studio.line, borderStyle: 'dashed' },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.accentSoft },
  emptyTitle: { ...studioType.heading, color: studio.text, textAlign: 'center' },
  emptyText: { ...studioType.small, color: studio.muted, textAlign: 'center' },
  progress: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: studio.panelHigh },
  progressFill: { height: 6, borderRadius: 3 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000b3' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '90%', ...squircle },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: '#ffffff40', marginTop: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: studio.page, paddingTop: 16, paddingBottom: 8 },
  sheetTitle: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3, color: studio.text },
  sheetClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh },
  sheetContent: { paddingHorizontal: studio.page, paddingTop: 8, paddingBottom: 16, gap: 12 },
  field: { gap: 6 },
  fieldLabel: { ...studioType.label, color: studio.muted },
  optional: { color: studio.faint, textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  input: { ...studioType.body, fontSize: 16, color: studio.text, minHeight: 52, paddingHorizontal: 16, paddingVertical: 13, borderRadius: studio.radiusSmall,
    backgroundColor: '#ffffff0d', borderWidth: 1, borderColor: studio.line },
  inputError: { borderColor: studio.red },
  fieldError: { ...studioType.small, color: studio.red },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickerValue: { ...studioType.body, fontSize: 16, flex: 1, color: studio.text },
  segmented: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 999, backgroundColor: '#ffffff0d', borderWidth: 1, borderColor: studio.line },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8 },
  segmentFill: { borderRadius: 999 },
  segmentLabel: { fontSize: 14, fontWeight: '600', color: studio.faint },
  segmentLabelActive: { color: studio.text },
  error: { ...studioType.small, color: studio.red },
  ok: { ...studioType.small, color: studio.green },
});
