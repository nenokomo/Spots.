import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, type } from '../constants/theme';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { Icon } from './Icon';
import { PressableScale } from './ui/PressableScale';

type Props = { id: string; title: string; label?: boolean; overlay?: boolean; size?: number };

/** Heart toggle. `overlay` puts it on a dark material for use on top of images. */
export function SaveEventButton({ id, title, label = false, overlay = false, size = 40 }: Props) {
  const { ids, ready, busy, toggle, reload } = useSavedEvents();
  const [failed, setFailed] = useState(false);
  const saved = ids.includes(id);
  return <View>
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={!ready ? 'Merkliste erneut laden' : `${title} ${saved ? 'nicht mehr merken' : 'merken'}`}
      accessibilityState={{ selected: saved, disabled: busy }}
      disabled={busy}
      scaleTo={0.88}
      hitSlop={6}
      onPress={async (event) => {
        event.stopPropagation();
        if (!ready) { reload(); return; }
        setFailed(!await toggle(id));
      }}
      style={[styles.button, { height: size, minWidth: size, borderRadius: size / 2 }, overlay && styles.overlay, label && styles.labeled]}
    >
      <Icon name="heart" size={Math.round(size * 0.48)} color={saved ? colors.pink : colors.text} filled={saved} />
      {label && <Text style={styles.text}>{saved ? 'Gemerkt' : 'Merken'}</Text>}
    </PressableScale>
    {failed && <Text accessibilityRole="alert" style={styles.error}>Nicht gespeichert</Text>}
  </View>;
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.surfaceHigh },
  overlay: { backgroundColor: '#0a090ca6' },
  labeled: { paddingHorizontal: 16, borderRadius: radius.pill },
  text: { ...type.label, color: colors.text },
  error: { ...type.footnote, fontSize: 10, color: colors.danger, marginTop: 3, textAlign: 'center' },
});
