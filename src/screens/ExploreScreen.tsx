import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { CategoryFilters } from '../components/CategoryFilters';
import { EventCard } from '../components/EventCard';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { colors, type Category } from '../constants/theme';
import { demoEvents, matchesCategory } from '../data/events';

export default function ExploreScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('Alle');
  const events = demoEvents.filter((event) => matchesCategory(event, category) && `${event.title} ${event.categories.join(' ')} ${event.location}`.toLocaleLowerCase('de').includes(search.trim().toLocaleLowerCase('de')));
  return (
    <Screen>
      <View style={styles.heading}><Text style={styles.eyebrow}>ENTDECKEN</Text><Text style={styles.title}>Dein nächster Abend.</Text><Text style={styles.subtitle}>Neue Nächte. Neue Lieblingsorte.</Text></View>
      <View style={styles.search}><Icon name="search" size={19} /><TextInput accessibilityLabel="Events nach Name, Ort oder Genre suchen" value={search} onChangeText={setSearch} placeholder="Event, Ort oder Genre suchen" placeholderTextColor="#b29bb9" style={styles.input} returnKeyType="search" autoCorrect={false} /></View>
      <View style={styles.filters}><CategoryFilters value={category} onChange={setCategory} /></View>
      <Text style={styles.section}>Als Nächstes</Text>
      <Text style={styles.note}>Demo-Events · keine Live-Daten</Text>
      <FlatList data={events} keyExtractor={(event) => event.id} renderItem={({ item }) => <EventCard event={item} />} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" ListEmptyComponent={<Text style={styles.empty}>Keine passenden Demo-Events gefunden.</Text>} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { paddingHorizontal: 23, paddingTop: 28, paddingBottom: 23 },
  eyebrow: { color: colors.pink, fontSize: 10, letterSpacing: 2.5, fontWeight: '700' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 10, letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 8 },
  search: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: '#ffffff08', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  input: { color: colors.text, flex: 1, minHeight: 50, fontSize: 13 },
  filters: { marginTop: 16, marginBottom: 24 },
  section: { color: colors.text, fontWeight: '700', fontSize: 20, paddingHorizontal: 22 },
  note: { color: colors.muted, fontSize: 11, paddingHorizontal: 22, marginTop: 7, marginBottom: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 25 },
  empty: { color: colors.muted, textAlign: 'center', padding: 28, fontSize: 13 },
});
