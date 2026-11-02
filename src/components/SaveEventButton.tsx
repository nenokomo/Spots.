import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { Icon } from './Icon';

export function SaveEventButton({ id, title, label = false }: { id: string; title: string; label?: boolean }) {
  const { ids, ready, busy, toggle, reload } = useSavedEvents();
  const [failed, setFailed] = useState(false);
  const saved = ids.includes(id);
  return <View>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={!ready ? 'Merkliste erneut laden' : `${title} ${saved ? 'nicht mehr merken' : 'merken'}`}
      accessibilityState={{ selected: saved, disabled: busy }}
      disabled={busy}
      onPress={async (event) => {
        event.stopPropagation();
        if (!ready) { reload(); return; }
        setFailed(!await toggle(id));
      }}
      style={({ pressed }) => [styles.button, label && styles.labeled, saved && styles.saved, (pressed || busy) && styles.pressed]}
    >
      <Icon name="heart" size={19} color={saved ? colors.pink : colors.muted} filled={saved} />
      {label && <Text style={[styles.text, saved && styles.active]}>{saved ? 'Gemerkt' : 'Merken'}</Text>}
    </Pressable>
    {failed && <Text accessibilityRole="alert" style={styles.error}>Fehler. Erneut versuchen.</Text>}
  </View>;
}

const styles = StyleSheet.create({
  button: { minWidth: 44, minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#211827', borderWidth: 1, borderColor: colors.border },
  labeled: { flexDirection: 'row', gap: 7, paddingHorizontal: 12 },
  saved: { backgroundColor: '#c922ab22', borderColor: '#c922ab55' },
  pressed: { opacity: 0.55 },
  text: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  active: { color: colors.pink },
  error: { color: colors.pink, fontSize: 10, maxWidth: 110, marginTop: 4 },
});
