import type { PropsWithChildren } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';

/** The Spots night gradient as an absolute layer, for screens that manage their own safe areas. */
export function Backdrop() {
  return <LinearGradient pointerEvents="none" colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />;
}

/** Tab screen on the Spots night gradient. */
export function Screen({ children }: PropsWithChildren) {
  return (
    <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fill}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.fill}>{children}</SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
