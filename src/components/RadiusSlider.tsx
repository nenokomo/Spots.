import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import RadiusControl from './RadiusControl';

export function RadiusSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState<number | null>(null);
  const displayValue = draft ?? value;
  return (
    <View style={styles.container}>
      <View style={styles.heading}><Text style={styles.label}>Dein Umkreis</Text><Text style={styles.value}>{displayValue} km</Text></View>
      <View style={styles.track}>
        <Text style={styles.limit}>10 km</Text>
        <RadiusControl value={displayValue} onValueChange={setDraft} onSlidingComplete={(next) => { setDraft(null); onChange(next); }} />
        <Text style={styles.limit}>50 km</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 9, paddingBottom: 5 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.muted, fontSize: 11 },
  value: { color: colors.pink, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  limit: { color: '#ab93b0', fontSize: 9 },
});
