import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { colors, radius } from '../../constants/theme';
import { formStyles } from './formParts';
import { uploadOrganizerImage } from './organizerApi';

type Props = {
  label: string; organizerId: string; kind: 'logo' | 'flyer'; value: string | null;
  onChange: (url: string | null) => void; disabled?: boolean;
};

/** Bild aus der Mediathek wählen und in den öffentlichen Speicher laden (SQL 27). Für Bilder braucht es keine Berechtigungsabfrage. */
export function ImageField({ label, organizerId, kind, value, onChange, disabled }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: kind === 'logo' ? [1, 1] : [4, 5], quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try {
      onChange(await uploadOrganizerImage(organizerId, result.assets[0], kind));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Hochladen hat nicht geklappt.');
    } finally {
      setBusy(false);
    }
  }

  return <View style={formStyles.field}>
    <Text style={formStyles.label}>{label}</Text>
    {value && <Image source={{ uri: value }} accessibilityLabel={label} resizeMode="cover" style={[styles.preview, kind === 'logo' ? styles.logo : styles.flyer]} />}
    <View style={formStyles.row}>
      <Button label={value ? 'Anderes Bild' : 'Bild wählen'} size="sm" variant="secondary" icon="camera" loading={busy} disabled={disabled || busy} onPress={() => void pick()} />
      {value && <Button label="Entfernen" size="sm" variant="ghost" disabled={disabled || busy} onPress={() => onChange(null)} />}
    </View>
    <Text style={formStyles.hint}>JPG, PNG oder WebP, höchstens 5 MB. Das Bild ist über seine Adresse öffentlich abrufbar.</Text>
    {error && <Text accessibilityRole="alert" style={formStyles.error}>{error}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  preview: { backgroundColor: colors.surfaceHigh, borderRadius: radius.md },
  logo: { width: 96, height: 96 },
  flyer: { width: 160, height: 200 },
});
