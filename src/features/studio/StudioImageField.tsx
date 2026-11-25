import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { uploadOrganizerImage } from '../organizer/organizerApi';
import { studio, studioType } from './theme';
import { Message, StudioButton, studioStyles } from './ui';

type Kind = 'logo' | 'flyer' | 'cover';
type Props = { label: string; organizerId: string; kind: Kind; value: string | null; onChange: (url: string | null) => void; disabled?: boolean };

const aspects: Record<Kind, [number, number]> = { logo: [1, 1], flyer: [4, 5], cover: [16, 9] };

/** Bild aus der Mediathek wählen und hochladen (SQL 27). Das Logo ist rund, wie es Gäste sehen. */
export function StudioImageField({ label, organizerId, kind, value, onChange, disabled }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: aspects[kind], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try { onChange(await uploadOrganizerImage(organizerId, result.assets[0], kind)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Hochladen hat nicht geklappt.'); }
    finally { setBusy(false); }
  }

  return <View style={styles.wrap}>
    <View style={[styles.frame, styles[kind], !value && styles.empty]}>
      {value ? <Image source={{ uri: value }} accessibilityLabel={label} resizeMode="cover" style={StyleSheet.absoluteFill} />
        : <Icon name="image" size={22} color={studio.faint} />}
    </View>
    <View style={styles.side}>
      <Text style={styles.label}>{label}</Text>
      <View style={studioStyles.row}>
        <StudioButton small variant="secondary" icon="image" label={value ? 'Ersetzen' : 'Bild wählen'} loading={busy} disabled={disabled} onPress={() => void pick()} />
        {value && <StudioButton small variant="ghost" label="Entfernen" disabled={disabled || busy} onPress={() => onChange(null)} />}
      </View>
      <Message error={error} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  frame: { overflow: 'hidden', borderRadius: studio.radiusSmall, backgroundColor: studio.bg, alignItems: 'center', justifyContent: 'center' },
  empty: { borderWidth: 1, borderColor: studio.line, borderStyle: 'dashed' },
  logo: { width: 88, height: 88, borderRadius: 44 },
  flyer: { width: 112, height: 140 },
  cover: { width: 144, height: 81 },
  side: { flex: 1, minWidth: 160, gap: 10 },
  label: { ...studioType.label, color: studio.muted },
});
