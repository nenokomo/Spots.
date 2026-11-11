import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, type } from '../../constants/theme';
import { phaseLabel, type EventPhase } from '../../utils/eventStatus';

/** Event state. Live is the only state that gets the brand fill. */
export function StatusBadge({ phase, overlay = false }: { phase: EventPhase; overlay?: boolean }) {
  const live = phase === 'live' || phase === 'started';
  const ended = phase === 'ended';
  return (
    <View style={[styles.badge, overlay && styles.overlay, live && styles.live]}>
      {live && <View style={styles.dot} />}
      <Text style={[styles.text, live && styles.liveText, ended && styles.endedText]}>{live ? 'Live' : phaseLabel[phase]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, height: 24, borderRadius: radius.pill, backgroundColor: colors.surfaceHigh },
  overlay: { backgroundColor: '#100b15c4' },
  live: { backgroundColor: colors.accent },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text },
  text: { ...type.overline, fontSize: 11, letterSpacing: 0.3, color: colors.text },
  liveText: { color: colors.text },
  endedText: { color: colors.faint },
});
