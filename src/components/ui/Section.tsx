import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { brandDotStyle, colors, gutter, space, type } from '../../constants/theme';
import { Icon, type IconName } from '../Icon';
import { Button } from './Button';

/** Tab header in the Spots style: brand eyebrow, big title and one line of context. */
export function PageHeader({ section, title, subtitle }: { section: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.page}>
      <Text style={styles.eyebrow}>SPOTS<Text style={brandDotStyle}>.</Text> / {section}</Text>
      <Text accessibilityRole="header" style={styles.largeTitle}>{title}</Text>
      {subtitle && <Text style={styles.pageSubtitle}>{subtitle}</Text>}
    </View>
  );
}

/** Large-title header of a tab: small overline, big title, optional control on the right. */
export function LargeHeader({ overline, title, trailing }: { overline?: string; title: string; trailing?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {overline && <Text style={styles.overline}>{overline}</Text>}
        <Text accessibilityRole="header" style={styles.largeTitle}>{title}</Text>
      </View>
      {trailing}
    </View>
  );
}

/** Section title with an optional action on the right. */
export function SectionHeader({ title, note, action, onAction, inset = true }: { title: string; note?: string; action?: string; onAction?: () => void; inset?: boolean }) {
  return (
    <View style={[styles.section, inset && styles.inset]}>
      <View style={styles.headerCopy}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
        {note && <Text style={styles.sectionNote}>{note}</Text>}
      </View>
      {action && onAction && (
        <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} hitSlop={10} style={styles.action}>
          <Text style={styles.actionText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Calm empty or unavailable state. Never pretends that data exists. */
export function EmptyState({ icon, title, text, action, onAction }: { icon: IconName; title: string; text?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={44} color={colors.faint} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {text && <Text style={styles.emptyText}>{text}</Text>}
      {action && onAction && <Button label={action} onPress={onAction} variant="secondary" size="sm" style={styles.emptyAction} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.lg },
  eyebrow: { ...type.overline, fontSize: 11, color: '#b58ca9', letterSpacing: 2.4, marginBottom: space.sm },
  pageSubtitle: { ...type.callout, color: colors.muted, marginTop: space.xxs },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.md },
  headerCopy: { flex: 1, minWidth: 0 },
  overline: { ...type.overline, color: colors.faint, marginBottom: 2 },
  largeTitle: { ...type.largeTitle, color: colors.text },
  section: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md, paddingTop: space.xxl + 4, paddingBottom: space.md },
  inset: { paddingHorizontal: gutter },
  sectionTitle: { ...type.title2, color: colors.text },
  sectionNote: { ...type.footnote, color: colors.faint, marginTop: 2 },
  action: { minHeight: 30, justifyContent: 'flex-end' },
  actionText: { ...type.callout, color: colors.pink },
  empty: { alignItems: 'center', paddingVertical: space.xxxl, paddingHorizontal: space.xxl, gap: space.sm },
  emptyTitle: { ...type.title3, color: colors.text, textAlign: 'center', marginTop: space.sm },
  emptyText: { ...type.callout, color: colors.muted, textAlign: 'center', maxWidth: 300 },
  emptyAction: { marginTop: space.md },
});
