import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../constants/theme';
import { searchCities, type City } from '../services/cities';
import { Icon } from './Icon';

type Props = { label: string; locating: boolean; onLocate: () => void; onSelect: (city: City) => void };

export function CitySearch({ label, locating, onLocate, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [response, setResponse] = useState<{ key: string; cities: City[]; error: boolean }>({ key: '', cities: [], error: false });
  const requestKey = `${query.trim()}:${retry}`;
  const loading = query.trim().length >= 3 && response.key !== requestKey;
  const cities = response.key === requestKey ? response.cities : [];
  const error = response.key === requestKey && response.error;

  useEffect(() => {
    if (!open || query.trim().length < 3) return;
    let active = true;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const debounce = setTimeout(() => {
      timeout = setTimeout(() => controller.abort(), 8000);
      void searchCities(query, controller.signal).then((results) => { if (active) setResponse({ key: requestKey, cities: results, error: false }); }).catch(() => { if (active) setResponse({ key: requestKey, cities: [], error: true }); }).finally(() => {
        clearTimeout(timeout);
      });
    }, 400);
    return () => { active = false; clearTimeout(debounce); clearTimeout(timeout); controller.abort(); };
  }, [query, open, requestKey]);

  function close() { setOpen(false); setQuery(''); Keyboard.dismiss(); }

  return (
    <View style={styles.container}>
      <View style={[styles.inputRow, open && styles.focused]}>
        <Icon name="search" size={16} color={colors.pink} />
        <TextInput
          accessibilityLabel="Stadt suchen"
          placeholder={locating ? 'Standort wird gesucht …' : `${label} · Stadt suchen`}
          placeholderTextColor="#c5adcb"
          value={query}
          onFocus={() => setOpen(true)}
          onChangeText={(value) => { setQuery(value); setOpen(true); }}
          onSubmitEditing={() => setRetry((value) => value + 1)}
          returnKeyType="search"
          autoCorrect={false}
          style={styles.input}
        />
        {open && query.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Städtesuche schließen" onPress={close} style={styles.action}><Icon name="close" size={16} /></Pressable>
          : <Pressable accessibilityRole="button" accessibilityLabel="Aktuellen Standort verwenden" disabled={locating} onPress={() => { close(); onLocate(); }} style={styles.action}>{locating ? <ActivityIndicator color={colors.pink} size="small" /> : <Icon name="locate" size={18} color={colors.pink} />}</Pressable>}
      </View>
      {open && query.trim().length > 0 && (
        <View style={styles.results}>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.resultList}>
            {query.trim().length < 3 ? <Text style={styles.hint}>Gib mindestens 3 Buchstaben ein.</Text>
              : loading ? <View style={styles.loading}><ActivityIndicator size="small" color={colors.pink} /><Text style={styles.hint}>Städte werden gesucht …</Text></View>
                : error ? <Pressable accessibilityRole="button" onPress={() => setRetry((value) => value + 1)} style={styles.error}><Text style={styles.errorTitle}>Ortssuche gerade nicht erreichbar.</Text><Text style={styles.hint}>Verbindung prüfen und hier erneut versuchen.</Text></Pressable>
                  : cities.length === 0 ? <Text style={styles.hint}>Keine Stadt gefunden. Versuche einen anderen Namen.</Text>
                    : cities.map((city) => <Pressable key={city.id} accessibilityRole="button" accessibilityLabel={`${city.name}, ${city.admin1 ?? ''}, ${city.country ?? ''} auswählen`} onPress={() => { onSelect(city); close(); }} style={styles.result}><Icon name="pin" color={colors.pink} size={17} /><View style={styles.resultText}><Text style={styles.city}>{city.name}</Text><Text style={styles.region}>{[city.admin1, city.country].filter(Boolean).join(' · ')}</Text></View><Icon name="chevron" size={13} /></Pressable>)}
          </ScrollView>
          <Pressable accessibilityRole="link" accessibilityLabel="Quelle der Ortssuche: Open-Meteo und GeoNames" onPress={() => void Linking.openURL('https://open-meteo.com/en/docs/geocoding-api')} style={styles.source}><Text style={styles.sourceText}>Ortssuche: Open-Meteo / GeoNames</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, zIndex: 30 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff07', borderWidth: 1, borderColor: '#ffffff16', borderRadius: 15, paddingLeft: 11, minHeight: 44, gap: 7 },
  focused: { borderColor: '#c922ab80', backgroundColor: '#1b1221' },
  input: { flex: 1, minWidth: 0, minHeight: 44, color: colors.text, fontSize: 12, paddingVertical: 8 },
  action: { width: 38, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  results: { position: 'absolute', top: 51, left: -65, right: 0, backgroundColor: '#201527', borderRadius: 17, borderWidth: 1, borderColor: '#c922ab45', overflow: 'hidden', elevation: 12, boxShadow: '0 8px 24px #00000066' },
  resultList: { maxHeight: 235 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 15, paddingVertical: 13, minHeight: 58, borderBottomWidth: 1, borderBottomColor: '#ffffff08' },
  resultText: { flex: 1 },
  city: { color: colors.text, fontSize: 14, fontWeight: '600' },
  region: { color: colors.muted, fontSize: 10, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 12, padding: 13, lineHeight: 19 },
  loading: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
  error: { paddingTop: 14 },
  errorTitle: { color: colors.text, fontSize: 12, paddingHorizontal: 13 },
  source: { paddingHorizontal: 13, paddingVertical: 10, backgroundColor: '#ffffff04' },
  sourceText: { color: '#b59fbd', fontSize: 9 },
});
