import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { gutter } from '../constants/theme';
import { useVenuesNear } from '../hooks/useVenues';
import { venueKindLabels } from '../types/venues';
import { formatDistance, type Coordinate } from '../utils/events';
import { ListGroup, ListRow } from './ui/List';
import { SectionHeader } from './ui/Section';

type Props = { center: Coordinate; radiusKm: number; label: string };

/** Abschnitt „Clubs & Locations“ in Entdecken: die drei nächsten Orte, „Alle“ öffnet die ganze Liste. */
export function NearbyVenues({ center, radiusKm, label }: Props) {
  const { venues, available } = useVenuesNear(center, radiusKm);
  if (!available || venues.length === 0) return null;
  const openAll = () => router.push({ pathname: '/clubs', params: {
    latitude: String(center.latitude), longitude: String(center.longitude), radius: String(radiusKm), label } });
  return <View>
    <SectionHeader title="Clubs & Locations" action={`Alle (${venues.length})`} onAction={openAll} />
    <View style={styles.inset}>
      <ListGroup>
        {venues.slice(0, 3).map((venue) => (
          <ListRow key={venue.id} icon={venue.kind === 'live' ? 'headphones' : venue.kind === 'club' ? 'wave' : 'pin'}
            title={venue.name} subtitle={[venueKindLabels[venue.kind], venue.city].filter(Boolean).join(' · ')}
            value={formatDistance(venue.distanceKm)} accessibilityLabel={`${venue.name}, ${formatDistance(venue.distanceKm)} entfernt, öffnen`}
            onPress={() => router.push({ pathname: '/venue/[id]', params: { id: venue.id } })} />
        ))}
      </ListGroup>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  inset: { paddingHorizontal: gutter },
});
