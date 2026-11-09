import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { Icon } from './Icon';

export function SaveEventButton({ id, title, label = false, tile = false }: { id: string; title: string; label?: boolean; tile?: boolean }) {
  const { ids, ready, busy, toggle, reload } = useSavedEvents();
  const [failed, setFailed] = useState(false);
  const saved = ids.includes(id);
  return <View style={tile && styles.tileWrap}>
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
      style={({ pressed }) => [styles.button, label && styles.labeled, tile && styles.tile, pressed && styles.pressed]}
    >
      <Icon name="heart" size={19} color={saved ? colors.pink : colors.muted} filled={saved} />
      {label && <Text style={styles.text}>{saved ? 'Gemerkt' : 'Merken'}</Text>}
    </Pressable>
    {failed && <Text accessibilityRole="alert" style={styles.error}>Fehler. Erneut versuchen.</Text>}
  </View>;
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, flexShrink: 0, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#211827', borderWidth: 1, borderColor: colors.border },
  labeled: { width: 112, flexDirection: 'row', gap: 7, paddingHorizontal: 12 },
  tileWrap: { flex: 1, minWidth: 0 },
  tile: { width: '100%', minHeight: 56, flex: 1, borderRadius: 9, backgroundColor: '#ffffff09', flexDirection: 'row', gap: 7, paddingHorizontal: 12 },
  pressed: { opacity: 0.55 },
  text: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  error: { color: colors.pink, fontSize: 10, maxWidth: 110, marginTop: 4 },
});
