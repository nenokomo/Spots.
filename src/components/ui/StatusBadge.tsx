import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, type } from '../../constants/theme';
import { phaseLabel, type EventPhase } from '../../utils/eventStatus';

/** Event state chip. Live gets the accent dot; ended is deliberately muted. */
export function StatusBadge({ phase, overlay = false }: { phase: EventPhase; overlay?: boolean }) {
  const live = phase === 'live' || phase === 'started';
  const ended = phase === 'ended';
  return (
    <View style={[styles.badge, overlay && styles.overlay, live && styles.live, ended && styles.ended]}>
      {live && <View style={styles.dot} />}
      <Text style={[styles.text, ended && styles.endedText]}>{phaseLabel[phase]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: 10, minHeight: 26, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  overlay: { backgroundColor: '#100b15c4' },
  live: { backgroundColor: '#c922ab38' },
  ended: { backgroundColor: '#ffffff12' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.pink },
  text: { ...type.caption, fontSize: 11, color: colors.pink, fontWeight: '700' },
  endedText: { color: colors.faint },
});
