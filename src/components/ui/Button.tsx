import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space, type } from '../../constants/theme';
import { Icon, type IconName } from '../Icon';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'sm';
  icon?: IconName;
  trailingIcon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** The one button of the app. Primary = brand gradient, secondary = soft outline, ghost = text only. */
export function Button({ label, onPress, variant = 'primary', size = 'md', icon, trailingIcon, disabled, loading, accessibilityLabel, style }: Props) {
  const tint = variant === 'primary' ? colors.text : variant === 'secondary' ? colors.text : colors.pink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.base, size === 'sm' ? styles.sm : styles.md, styles[variant], (pressed || disabled) && styles.dimmed, style]}
    >
      {variant === 'primary' && <LinearGradient pointerEvents="none" colors={[colors.accent, '#9b268f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      {loading ? <ActivityIndicator color={tint} /> : icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} color={tint} />}
      <Text numberOfLines={1} style={[size === 'sm' ? styles.smLabel : styles.label, { color: tint }]}>{label}</Text>
      {trailingIcon && <Icon name={trailingIcon} size={15} color={tint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, overflow: 'hidden', borderRadius: radius.md },
  md: { minHeight: 50, paddingHorizontal: space.xl },
  sm: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.sm },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: '#ffffff0d', borderWidth: 1, borderColor: '#ffffff1f' },
  ghost: { backgroundColor: 'transparent' },
  dimmed: { opacity: 0.6 },
  label: { ...type.label, fontSize: 14, fontWeight: '700' },
  smLabel: { ...type.label, fontSize: 12 },
});
