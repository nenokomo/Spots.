import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { brandDotStyle, colors, space, type } from '../../constants/theme';
import { Icon, type IconName } from '../Icon';
import { Button } from './Button';

/** Eyebrow, large title and optional subtitle at the top of a tab screen. */
export function PageHeader({ section, title, subtitle, trailing }: { section: string; title: string; subtitle?: string; trailing?: ReactNode }) {
  return (
    <View style={styles.page}>
      <View style={styles.pageCopy}>
        <Text style={styles.eyebrow}>SPOTS<Text style={brandDotStyle}>.</Text> / {section}</Text>
        <Text accessibilityRole="header" style={styles.pageTitle}>{title}</Text>
        {subtitle && <Text style={styles.pageSubtitle}>{subtitle}</Text>}
      </View>
      {trailing}
    </View>
  );
}

/** Section title with an optional note and action on the right. */
export function SectionHeader({ title, note, action, onAction }: { title: string; note?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionCopy}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
        {note && <Text style={styles.sectionNote}>{note}</Text>}
      </View>
      {action && onAction && (
        <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{action}</Text>
          <Icon name="chevron" size={13} color={colors.pink} />
        </Pressable>
      )}
    </View>
  );
}

/** Calm empty or unavailable state. Never pretends that data exists. */
export function EmptyState({ icon, title, text, action, onAction }: { icon: IconName; title: string; text?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Icon name={icon} size={26} color={colors.pink} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text && <Text style={styles.emptyText}>{text}</Text>}
      {action && onAction && <Button label={action} onPress={onAction} variant="secondary" size="sm" style={styles.emptyAction} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, paddingTop: space.xl, paddingBottom: space.xl },
  pageCopy: { flex: 1, minWidth: 0 },
  eyebrow: { ...type.overline, color: '#b58ca9', letterSpacing: 2.4, marginBottom: space.sm },
  pageTitle: { ...type.display, color: colors.text },
  pageSubtitle: { ...type.caption, color: '#c4b3c8', marginTop: space.xxs },
  section: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md, paddingTop: space.xxl, paddingBottom: space.md },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { ...type.headline, color: colors.text },
  sectionNote: { ...type.caption, fontSize: 11, color: colors.faint, marginTop: 3 },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: space.sm },
  actionText: { ...type.caption, color: colors.pink, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.lg, gap: space.sm },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft, marginBottom: space.xs },
  emptyTitle: { ...type.headline, fontSize: 16, color: colors.text, textAlign: 'center' },
  emptyText: { ...type.caption, color: colors.muted, textAlign: 'center', maxWidth: 300 },
  emptyAction: { marginTop: space.sm },
});
