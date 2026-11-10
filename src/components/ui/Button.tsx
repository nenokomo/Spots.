import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space, squircle, type } from '../../constants/theme';
import { GlassBackdrop } from '../GlassBackdrop';
import { Icon, type IconName } from '../Icon';
import { PressableScale } from './PressableScale';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** primary = brand fill, secondary = quiet grey fill, ghost = text only. */
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'sm';
  icon?: IconName;
  trailingIcon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', size = 'md', icon, trailingIcon, disabled, loading, accessibilityLabel, style }: ButtonProps) {
  const tint = variant === 'ghost' ? colors.pink : colors.text;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.base, size === 'sm' ? styles.sm : styles.md, styles[variant], disabled && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator color={tint} /> : icon && <Icon name={icon} size={size === 'sm' ? 16 : 19} color={tint} />}
      <Text numberOfLines={1} style={[size === 'sm' ? styles.smLabel : styles.label, { color: tint }]}>{label}</Text>
      {trailingIcon && <Icon name={trailingIcon} size={15} color={tint} />}
    </PressableScale>
  );
}

type IconButtonProps = { icon: IconName; onPress: () => void; accessibilityLabel: string; size?: number; tint?: string; plain?: boolean; style?: StyleProp<ViewStyle> };

/** Round control that floats over maps and images on a translucent material. */
export function IconButton({ icon, onPress, accessibilityLabel, size = 44, tint = colors.text, plain = false, style }: IconButtonProps) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} scaleTo={0.92} hitSlop={6}
      style={[styles.icon, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {!plain && <GlassBackdrop radius={size / 2} />}
      <Icon name={icon} size={Math.round(size * 0.48)} color={tint} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, overflow: 'hidden', borderRadius: radius.md, ...squircle },
  md: { minHeight: 52, paddingHorizontal: space.xl },
  sm: { minHeight: 38, paddingHorizontal: space.lg, borderRadius: radius.pill },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceHigh },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.45 },
  label: { ...type.headline },
  smLabel: { ...type.label, fontSize: 14 },
  icon: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
