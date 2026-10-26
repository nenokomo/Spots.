import { Link, router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { colors } from '../constants/theme';
import { demoEvents } from '../data/events';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = demoEvents.find((item) => item.id === id);
  return (
    <Screen>
      <SafeAreaView edges={['bottom']} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.back}><Icon name="back" color={colors.pink} size={20} /><Text style={styles.backText}>Zurück</Text></Pressable>
          {event ? <>
            <Image source={event.image} style={styles.image} accessibilityLabel="Symbolfoto, kein Foto dieses Demo-Events" />
            <View style={styles.body}>
              <Text style={styles.eyebrow}>DEMO-EVENT · SYMBOLFOTO</Text>
              <Text style={styles.title}>{event.title}</Text>
              <View style={styles.tags}>{event.categories.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
              <View style={styles.info}><Icon name="clock" color={colors.pink} /><View><Text style={styles.label}>BEISPIELTERMIN</Text><Text style={styles.value}>{event.date}</Text></View></View>
              <View style={styles.info}><Icon name="pin" color={colors.pink} /><View><Text style={styles.label}>ORT</Text><Text style={styles.value}>{event.location}</Text></View></View>
              <Text style={styles.description}>Dieses Event zeigt dir, wie sich die App anfühlen wird. Die Angaben und die Markierung sind Beispiele und gehören zu keiner echten Veranstaltung.</Text>
              <View style={styles.notice}><Text style={styles.noticeTitle}>Die Nacht bekommt bald mehr Details.</Text><Text style={styles.description}>Echte Veranstalterinfos, Tickets und Live-Snaps folgen mit der Anbindung einer Event-Datenquelle.</Text></View>
            </View>
          </> : <View style={styles.body}><Text style={styles.title}>Event nicht gefunden</Text><Link href="/" style={styles.backText}>Zurück zum Radar</Link></View>}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingBottom: 25 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingHorizontal: 20 },
  backText: { color: colors.pink, fontSize: 14, fontWeight: '600' },
  image: { width: '100%', height: 250, backgroundColor: colors.surface },
  body: { padding: 24 },
  eyebrow: { color: colors.pink, fontSize: 10, letterSpacing: 1.7, fontWeight: '700' },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.7, marginTop: 12, marginBottom: 15 },
  tags: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  tag: { color: colors.muted, backgroundColor: '#bc88cf24', borderRadius: 15, paddingHorizontal: 12, paddingVertical: 5, fontSize: 12, overflow: 'hidden' },
  info: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 21 },
  label: { color: colors.muted, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 },
  value: { color: colors.text, fontSize: 16 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 23, marginTop: 8 },
  notice: { backgroundColor: '#ffffff07', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 19, marginTop: 26 },
  noticeTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
