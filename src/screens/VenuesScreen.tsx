import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Backdrop } from '../components/Screen';
import { IconButton } from '../components/ui/Button';
import { ListRow } from '../components/ui/List';
import { EmptyState } from '../components/ui/Section';
import { colors, gutter, radius, space, squircle, type } from '../constants/theme';
import { berlinCenter } from '../hooks/useLocation';
import { useVenuesNear } from '../hooks/useVenues';
import { venueKindLabels, type VenueKind } from '../types/venues';
import { formatDistance } from '../utils/events';

const kinds: (VenueKind | 'all')[] = ['all', 'club', 'live', 'eventlocation'];
const kindFilterLabels: Record<VenueKind | 'all', string> = { all: 'Alle', ...venueKindLabels };

function number(value: unknown, min: number, max: number) {
  const parsed = typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

/** Alle Clubs und Locations im gewählten Umkreis, nächste zuerst. */
export default function VenuesScreen() {
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string; radius?: string; label?: string }>();
  const insets = useSafeAreaInsets();
  const latitude = number(params.latitude, -90, 90);
  const longitude = number(params.longitude, -180, 180);
  const center = useMemo(() => latitude !== null && longitude !== null ? { latitude, longitude } : berlinCenter, [latitude, longitude]);
  const label = typeof params.label === 'string' && params.label.trim() ? params.label.trim().slice(0, 60) : latitude !== null ? 'Umgebung' : 'Berlin';
  const radiusKm = number(params.radius, 1, 100) ?? 30;
  const { venues, loading, error, available, reload } = useVenuesNear(center, radiusKm);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<VenueKind | 'all'>('all');
  const back = () => router.canGoBack() ? router.back() : router.replace('/explore');

  const shown = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('de');
    return venues.filter((venue) => (kind === 'all' || venue.kind === kind)
      && (!query || `${venue.name} ${venue.city ?? ''} ${venue.street ?? ''}`.toLocaleLowerCase('de').includes(query)));
  }, [venues, search, kind]);

  return <View style={styles.screen}>
    <Backdrop />
    <FlatList
      data={shown}
      keyExtractor={(venue) => venue.id}
      renderItem={({ item }) => <View style={styles.card}>
        <ListRow icon={item.kind === 'live' ? 'headphones' : item.kind === 'club' ? 'wave' : 'pin'} title={item.name}
          subtitle={[venueKindLabels[item.kind], item.city].filter(Boolean).join(' · ')} value={formatDistance(item.distanceKm)}
          accessibilityLabel={`${item.name}, ${venueKindLabels[item.kind]}, ${formatDistance(item.distanceKm)} entfernt, öffnen`}
          onPress={() => router.push({ pathname: '/venue/[id]', params: { id: item.id } })} />
      </View>}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: Math.max(insets.bottom, 16) + space.xl, paddingHorizontal: gutter }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshing={loading}
      onRefresh={reload}
      ListHeaderComponent={<View style={styles.header}>
        <Text style={styles.eyebrow}>{`${label} · ${radiusKm} KM`.toLocaleUpperCase('de')}</Text>
        <Text accessibilityRole="header" style={styles.title}>Clubs & Locations</Text>
        <Text style={styles.note}>Orte aus OpenStreetMap. Ein Ort heißt nicht, dass dort gerade etwas los ist.</Text>
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Name, Straße oder Ort" placeholderTextColor={colors.faint}
            accessibilityLabel="Clubs und Locations durchsuchen" style={styles.input} autoCorrect={false} returnKeyType="search" />
        </View>
        <View style={styles.kinds}>
          {kinds.map((item) => {
            const selected = kind === item;
            return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setKind(item)}
              style={[styles.kind, selected && styles.kindActive]}>
              <Text style={[styles.kindLabel, selected && styles.kindActiveLabel]}>{kindFilterLabels[item]}</Text>
            </Pressable>;
          })}
        </View>
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </View>}
      ListEmptyComponent={loading || error ? undefined : <EmptyState icon="pin"
        title={available ? 'Keine passenden Orte' : 'Club-Verzeichnis noch nicht verfügbar'}
        text={available ? `Im Umkreis von ${radiusKm} km um ${label} passt nichts zu deiner Auswahl.` : 'Das Verzeichnis wird gerade aufgebaut.'} />}
    />
    <View style={[styles.bar, { paddingTop: insets.top + space.sm }]}>
      <IconButton icon="back" accessibilityLabel="Zurück" onPress={back} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: space.lg },
  header: { gap: space.md, marginBottom: space.lg },
  eyebrow: { ...type.overline, fontSize: 11, color: colors.pink, letterSpacing: 1.5 },
  title: { ...type.largeTitle, fontSize: 34, lineHeight: 40, color: colors.text, marginTop: -space.xs },
  note: { ...type.footnote, color: colors.faint },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, minHeight: 44,
    borderRadius: radius.md, backgroundColor: colors.surfaceHigh, ...squircle },
  input: { ...type.body, color: colors.text, flex: 1, paddingVertical: space.sm },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  kind: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: colors.surface },
  kindActive: { backgroundColor: colors.text },
  kindLabel: { ...type.footnote, color: colors.muted },
  kindActiveLabel: { color: colors.background, fontWeight: '600' },
  card: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, ...squircle },
  gap: { height: space.sm },
  error: { ...type.footnote, color: colors.danger },
});
