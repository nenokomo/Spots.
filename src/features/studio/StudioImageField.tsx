import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { uploadOrganizerImage } from '../organizer/organizerApi';
import { studio, studioType } from './theme';
import { Message, StudioButton, studioStyles } from './ui';

type Props = { label: string; organizerId: string; kind: 'logo' | 'flyer'; value: string | null; onChange: (url: string | null) => void; disabled?: boolean };

/** Bild aus der Mediathek wählen und in den öffentlichen Speicher laden (SQL 27). Für Bilder braucht es keine Berechtigungsabfrage. */
export function StudioImageField({ label, organizerId, kind, value, onChange, disabled }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: kind === 'logo' ? [1, 1] : [4, 5], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try { onChange(await uploadOrganizerImage(organizerId, result.assets[0], kind)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Hochladen hat nicht geklappt.'); }
    finally { setBusy(false); }
  }

  return <View style={styles.wrap}>
    <View style={[styles.frame, kind === 'logo' ? styles.logo : styles.flyer]}>
      {value ? <Image source={{ uri: value }} accessibilityLabel={label} resizeMode="cover" style={StyleSheet.absoluteFill} />
        : <Text style={styles.empty}>{kind === 'logo' ? 'LOGO' : 'FLYER'}</Text>}
    </View>
    <View style={styles.side}>
      <Text style={styles.label}>{label}</Text>
      <Text style={studioStyles.muted}>JPG, PNG oder WebP, höchstens 5 MB. Über seine Adresse öffentlich abrufbar.</Text>
      <View style={studioStyles.row}>
        <StudioButton small variant="secondary" icon="camera" label={value ? 'Ersetzen' : 'Bild wählen'} loading={busy} disabled={disabled} onPress={() => void pick()} />
        {value && <StudioButton small variant="ghost" label="Entfernen" disabled={disabled || busy} onPress={() => onChange(null)} />}
      </View>
      <Message error={error} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  frame: { overflow: 'hidden', borderRadius: studio.radiusSmall, backgroundColor: studio.bg, borderWidth: 1, borderColor: studio.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 96, height: 96 },
  flyer: { width: 112, height: 140 },
  empty: { ...studioType.label, color: studio.faint },
  side: { flex: 1, minWidth: 180, gap: 8 },
  label: { ...studioType.label, color: studio.muted },
});
