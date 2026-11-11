import { StyleSheet, Text } from 'react-native';
import { colors, radius, space, type } from '../../constants/theme';
import { Icon, type IconName } from '../Icon';
import { PressableScale } from './PressableScale';

type Props = { label: string; selected?: boolean; onPress: () => void; icon?: IconName; trailingIcon?: IconName; accessibilityLabel?: string };

/** Capsule for filters. Selected chips take the brand tint. */
export function Chip({ label, selected = false, onPress, icon, trailingIcon, accessibilityLabel }: Props) {
  const tint = selected ? '#ffd6f2' : colors.text;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ selected }} onPress={onPress} scaleTo={0.95}
      style={[styles.chip, selected && styles.selected]}>
      {icon && <Icon name={icon} size={15} color={tint} />}
      <Text numberOfLines={1} style={[styles.label, { color: tint }]}>{label}</Text>
      {trailingIcon && <Icon name={trailingIcon} size={12} color={tint} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: '#ffffff1a', backgroundColor: '#ffffff0a' },
  selected: { backgroundColor: colors.accentSoft, borderColor: colors.accentLine },
  label: { ...type.label, fontSize: 14 },
});
