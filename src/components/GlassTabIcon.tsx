import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import { Icon, type IconName } from './Icon';

export function GlassTabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <View pointerEvents="none" style={styles.icon}><Icon name={name} size={23} color={focused ? colors.pink : colors.muted} /></View>;
}

const styles = StyleSheet.create({
  icon: { width: 30, height: 28, alignItems: 'center', justifyContent: 'center' },
});
