import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, space, type } from '../../constants/theme';
import { Icon, type IconName } from '../Icon';

type Props = { label: string; selected?: boolean; onPress: () => void; icon?: IconName; accessibilityLabel?: string };

/** Selectable pill for filters, periods and radii. */
export function Chip({ label, selected = false, onPress, icon, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
    >
      {icon && <Icon name={icon} size={14} color={selected ? '#ffd6f2' : colors.muted} />}
      <Text numberOfLines={1} style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: '#ffffff17', backgroundColor: '#ffffff08' },
  selected: { backgroundColor: colors.accentSoft, borderColor: colors.accentLine },
  pressed: { opacity: 0.7 },
  label: { ...type.caption, color: colors.muted, fontWeight: '600' },
  selectedLabel: { color: '#ffd6f2' },
});
