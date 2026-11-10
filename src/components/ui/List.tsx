import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, squircle, type } from '../../constants/theme';
import { Icon, type IconName } from '../Icon';

/** Inset grouped list: one rounded surface, rows divided by hairlines. */
export function ListGroup({ header, footer, children }: { header?: string; footer?: string; children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View>
      {header && <Text style={styles.header}>{header}</Text>}
      <View style={styles.group}>
        {rows.map((row, index) => <Fragment key={index}>{index > 0 && <View style={styles.separator} />}{row}</Fragment>)}
      </View>
      {footer && <Text style={styles.footer}>{footer}</Text>}
    </View>
  );
}

type RowProps = { icon?: IconName; title: string; subtitle?: string; value?: string; onPress?: () => void; accessibilityLabel?: string; destructive?: boolean };

export function ListRow({ icon, title, subtitle, value, onPress, accessibilityLabel, destructive = false }: RowProps) {
  const content = <>
    {icon && <View style={styles.icon}><Icon name={icon} size={17} color={colors.pink} /></View>}
    <View style={styles.copy}>
      <Text style={[styles.title, destructive && styles.destructive]}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    {value && <Text numberOfLines={1} style={styles.value}>{value}</Text>}
    {onPress && <Icon name="chevron" size={14} color={colors.faint} />}
  </>;
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{content}</Pressable>
    : <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  header: { ...type.overline, color: colors.faint, marginLeft: space.lg, marginBottom: space.sm },
  footer: { ...type.footnote, color: colors.faint, marginHorizontal: space.lg, marginTop: space.sm },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...squircle },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 54, paddingHorizontal: space.lg, paddingVertical: space.md },
  pressed: { backgroundColor: colors.surfaceHigh },
  icon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh, ...squircle },
  copy: { flex: 1, minWidth: 0 },
  title: { ...type.body, color: colors.text },
  destructive: { color: colors.danger },
  subtitle: { ...type.footnote, color: colors.muted, marginTop: 1 },
  value: { ...type.body, color: colors.faint, maxWidth: '50%' },
});
