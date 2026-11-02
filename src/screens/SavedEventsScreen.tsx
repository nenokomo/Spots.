import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { SaveEventButton } from '../components/SaveEventButton';
import { Screen } from '../components/Screen';
import { tabBarContentInset } from '../constants/navigation';
import { colors } from '../constants/theme';
import { demoEvents } from '../data/events';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { useToday } from '../hooks/useToday';
import { dayKey } from '../utils/events';

const dateFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

export default function SavedEventsScreen() {
  const { ids, ready, busy, error, reload } = useSavedEvents();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [search, setSearch] = useState('');
  const saved = ids.flatMap((id) => {
    const event = demoEvents.find((item) => item.id === id);
    return event ? [event] : [];
  });
  const events = saved.filter((event) => `${event.title} ${event.location} ${event.categories.join(' ')}`.toLocaleLowerCase('de').includes(search.trim().toLocaleLowerCase('de')));

  return <Screen>
    <FlatList
      data={ready ? events : []}
      keyExtractor={(event) => event.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.list, { paddingBottom: tabBarContentInset(insets.bottom) }]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={<View>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>SPOTS / DEINE AUSWAHL</Text>
          <Text accessibilityRole="header" style={styles.title}>Gemerkt</Text>
          <Text style={styles.subtitle}>Gute Nächte beginnen mit einem Plan.</Text>
        </View>
        <View style={styles.info}><Icon name="heart" color={colors.pink} size={23} filled /><View style={styles.infoCopy}><Text style={styles.infoTitle}>Deine Spots. Für später.</Text><Text style={styles.infoText}>Mit dem Herz merken und hier wiederfinden. Nur auf diesem Gerät gespeichert.</Text></View></View>
        {ready && saved.length > 0 && <View style={styles.search}><Icon name="search" size={18} /><TextInput value={search} onChangeText={setSearch} accessibilityLabel="Gemerkte Events durchsuchen" placeholder="In deinen Spots suchen" placeholderTextColor="#9f90a4" style={styles.input} autoCorrect={false} returnKeyType="search" />{search.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Suche löschen" onPress={() => setSearch('')} style={styles.clear}><Icon name="close" size={17} /></Pressable>}</View>}
        <View style={styles.section}><Text style={styles.sectionTitle}>Deine Merkliste</Text><Text style={styles.count}>{ready ? `${saved.length} ${saved.length === 1 ? 'Spot' : 'Spots'}` : '…'}</Text></View>
        {error && <View style={styles.error}><Text accessibilityRole="alert" style={styles.infoText}>{error}</Text><Pressable accessibilityRole="button" onPress={reload} disabled={busy} style={styles.retry}><Text style={styles.linkText}>Erneut versuchen</Text></Pressable></View>}
        {saved.length > 0 && <Text style={styles.demo}>Demo-Events · Symbolfotos · keine echten Veranstaltungen</Text>}
      </View>}
      renderItem={({ item }) => <View style={styles.card}>
        <GlassBackdrop radius={17} variant="card" />
        <Link href={{ pathname: '/event/[id]', params: { id: item.id } }} asChild><Pressable accessibilityLabel={`${item.title}, Demo-Event, Details öffnen`} style={styles.cardLink}>
          <Image source={item.image} style={styles.image} accessibilityLabel="Symbolfoto eines Demo-Events" />
          <View style={styles.copy}>
            <Text style={styles.genre}>{item.categories.join(' · ')}</Text>
            <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>{dateFormat.format(new Date(item.startsAt))} Uhr</Text>
            <Text numberOfLines={2} style={styles.meta}>{item.location}</Text>
            {dayKey(new Date(item.startsAt)) < today && <Text style={styles.past}>Vergangener Termin</Text>}
          </View>
        </Pressable></Link>
        <View style={styles.save}><SaveEventButton id={item.id} title={item.title} /></View>
      </View>}
      ListEmptyComponent={!ready ? <View style={styles.empty}>{busy && <ActivityIndicator color={colors.pink} />}<Text style={styles.emptyText}>{busy ? 'Deine Spots werden geladen …' : 'Deine Merkliste ist gerade nicht verfügbar.'}</Text></View> : <View style={styles.empty}>
        <View style={styles.emptyIcon}><Icon name={saved.length > 0 ? 'search' : 'heart'} size={36} color={colors.pink} /></View>
        <Text style={styles.emptyTitle}>{saved.length > 0 ? 'Kein passender Spot' : 'Deine nächste Nacht wartet.'}</Text>
        <Text style={styles.emptyText}>{saved.length > 0 ? 'Suche nach einem anderen Namen, Ort oder Genre.' : 'Tippe bei einem Event auf das Herz. Hier sammelst du alles, worauf du Lust hast.'}</Text>
        {saved.length > 0 ? <Pressable accessibilityRole="button" onPress={() => setSearch('')} style={styles.button}><Text style={styles.buttonText}>Suche zurücksetzen</Text></Pressable> : <Link href="/explore" asChild><Pressable style={styles.button}><Icon name="search" color={colors.text} size={18} /><Text style={styles.buttonText}>Spots entdecken</Text></Pressable></Link>}
      </View>}
    />
  </Screen>;
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, paddingHorizontal: 18 },
  heading: { paddingTop: 19, paddingBottom: 23 },
  eyebrow: { color: '#c997bb', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { color: '#c4b3c8', fontSize: 12, lineHeight: 19, marginTop: 4 },
  info: { flexDirection: 'row', gap: 13, alignItems: 'center', padding: 17, backgroundColor: '#c922ab0c', borderWidth: 1, borderColor: '#c922ab33', borderRadius: 17 },
  infoCopy: { flex: 1, gap: 5 },
  infoTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  infoText: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  search: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 13, paddingRight: 4, minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: '#1b1521' },
  input: { flex: 1, minWidth: 0, minHeight: 48, color: colors.text, fontSize: 13 },
  clear: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 28, marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  count: { color: colors.muted, fontSize: 11 },
  demo: { color: '#b29ab9', fontSize: 10, lineHeight: 16, marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 17, borderWidth: 1, borderColor: colors.border, padding: 8 },
  cardLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, minWidth: 0 },
  image: { width: 76, height: 106, borderRadius: 11, backgroundColor: colors.surface },
  copy: { flex: 1, gap: 5, paddingVertical: 5 },
  genre: { color: '#d58bc2', fontSize: 10, fontWeight: '600' },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  past: { color: '#b29ab9', fontSize: 10 },
  save: { marginLeft: 6 },
  separator: { height: 10 },
  empty: { alignItems: 'center', paddingHorizontal: 14, paddingTop: 33, paddingBottom: 30, gap: 14 },
  emptyIcon: { width: 86, height: 86, borderRadius: 43, borderWidth: 1, borderColor: '#c922ab44', backgroundColor: '#c922ab12', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { color: colors.text, fontSize: 21, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 290 },
  button: { minHeight: 48, paddingHorizontal: 22, paddingVertical: 14, backgroundColor: colors.accent, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  buttonText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  error: { padding: 14, borderRadius: 13, backgroundColor: '#c922ab18', marginBottom: 12 },
  retry: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.pink, fontSize: 12, fontWeight: '600' },
});
