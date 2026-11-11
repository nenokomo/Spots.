import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '../components/Screen';
import { Button, IconButton } from '../components/ui/Button';
import { ListGroup, ListRow } from '../components/ui/List';
import { EmptyState } from '../components/ui/Section';
import { VenueReportSheet } from '../components/VenueReportSheet';
import { colors, gutter, space, type } from '../constants/theme';
import { useVenue, useVenueEvents } from '../hooks/useVenues';
import { eventDetailHref } from '../navigation/eventRoutes';
import { venueAddress, venueKindLabels, venueSourceUrl } from '../types/venues';

/** Ortsseite: Club, Live-Musik oder Eventlocation. Zeigt nie eine erfundene Party. */
export default function VenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { venue, loading, error, reload } = useVenue(typeof id === 'string' ? id : undefined);
  const events = useVenueEvents(venue && venue.source !== 'test' ? venue.id : undefined);
  const [reportOpen, setReportOpen] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace('/explore');

  async function open(url: string) {
    setLinkError(false);
    try { await Linking.openURL(url); } catch { setLinkError(true); }
  }

  const top = <View style={[styles.bar, { paddingTop: insets.top + space.sm }]}>
    <IconButton icon="back" accessibilityLabel="Zurück" onPress={back} />
  </View>;

  if (!venue) {
    return <View style={styles.screen}><Backdrop />{top}
      <View style={[styles.state, { paddingTop: insets.top + 80 }]}>
        {loading ? <Text style={styles.muted}>Ort wird geladen …</Text>
          : <EmptyState icon="pin" title={error ? 'Ort nicht erreichbar' : 'Ort nicht gefunden'}
              text={error ?? 'Dieser Ort ist nicht (mehr) im Verzeichnis.'}
              action={error ? 'Erneut versuchen' : undefined} onAction={error ? reload : undefined} />}
      </View>
    </View>;
  }

  const address = venueAddress(venue);
  const sourceUrl = venueSourceUrl(venue);
  const destination = `${venue.coordinate.latitude},${venue.coordinate.longitude}`;
  const routeUrl = Platform.OS === 'ios' ? `https://maps.apple.com/?daddr=${destination}` : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  return <View style={styles.screen}>
    <Backdrop />
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 72, paddingBottom: Math.max(insets.bottom, 16) + space.xl }]}>
      <Text style={styles.eyebrow}>{venueKindLabels[venue.kind].toLocaleUpperCase('de')}{venue.city ? ` · ${venue.city.toLocaleUpperCase('de')}` : ''}</Text>
      <Text accessibilityRole="header" style={styles.title}>{venue.name}</Text>
      <View style={styles.actions}>
        <Button label="Route" icon="map" onPress={() => void open(routeUrl)} style={styles.flex} accessibilityLabel={`Route zu ${venue.name}`} />
        {venue.website && <Button label="Website" variant="secondary" trailingIcon="chevron" onPress={() => void open(venue.website!)} style={styles.flex} />}
      </View>
      {linkError && <Text accessibilityRole="alert" style={styles.error}>Der Link konnte nicht geöffnet werden.</Text>}

      <ListGroup>
        <ListRow icon="pin" title={address ?? 'Adresse nicht angegeben'} subtitle={address ? undefined : 'Position auf der Karte ist bekannt'} />
        {venue.openingHours && <ListRow icon="clock" title={venue.openingHours} subtitle="Öffnungszeiten laut OpenStreetMap, ohne Gewähr" />}
      </ListGroup>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Events hier</Text>
        {events.length > 0
          ? <ListGroup>
              {events.map((event) => <ListRow key={event.id} icon="calendar" title={event.title} subtitle={event.date}
                onPress={() => router.push(eventDetailHref(event.id))} />)}
            </ListGroup>
          : <Text style={styles.muted}>Noch keine Events eingetragen. Ein Ort im Verzeichnis heißt nicht, dass dort gerade etwas los ist.</Text>}
      </View>

      <ListGroup footer={venue.source === 'test' ? 'Lokaler Testort, kein echter Club.' : 'Daten: © OpenStreetMap-Mitwirkende (ODbL). Fehler kannst du melden, das Spots-Team prüft jede Meldung.'}>
        <ListRow icon="close" title="Fehler melden" subtitle="Geschlossen, falscher Ort oder falsche Angaben?" onPress={() => setReportOpen(true)} />
        {sourceUrl && <ListRow icon="map" title="Eintrag auf OpenStreetMap" onPress={() => void open(sourceUrl)} />}
      </ListGroup>
    </ScrollView>
    {top}
    <VenueReportSheet venueId={venue.id} venueName={venue.name} visible={reportOpen} onClose={() => setReportOpen(false)} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: space.lg },
  state: { flex: 1, paddingHorizontal: gutter },
  content: { paddingHorizontal: gutter, gap: space.xl },
  eyebrow: { ...type.overline, fontSize: 11, color: colors.pink, letterSpacing: 1.5 },
  title: { ...type.largeTitle, fontSize: 34, lineHeight: 40, color: colors.text, marginTop: -space.md },
  actions: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  section: { gap: space.xs },
  sectionTitle: { ...type.title3, color: colors.text },
  muted: { ...type.body, color: colors.muted },
  error: { ...type.footnote, color: colors.danger },
});
