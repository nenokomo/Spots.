import { StyleSheet, Text } from 'react-native';
import { colors, radius, space, type } from '../../constants/theme';
import { Icon, type IconName } from '../Icon';
import { PressableScale } from './PressableScale';

type Props = { label: string; selected?: boolean; onPress: () => void; icon?: IconName; trailingIcon?: IconName; accessibilityLabel?: string };

/** Capsule for filters. Selected = white on black inverted, the strongest neutral contrast. */
export function Chip({ label, selected = false, onPress, icon, trailingIcon, accessibilityLabel }: Props) {
  const tint = selected ? '#000000' : colors.text;
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
  chip: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surfaceHigh },
  selected: { backgroundColor: colors.text },
  label: { ...type.label, fontSize: 14 },
});
