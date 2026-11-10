import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/ui/Button';
import { ListGroup, ListRow } from '../components/ui/List';
import { colors, gutter, space, type } from '../constants/theme';
import { accountClientError } from '../features/accounts/client';
import { useAccountSession } from '../features/accounts/useAccountSession';
import { useSavedEvents } from '../hooks/useSavedEvents';

/** Opens as a sheet from the header of every tab: private, minimal, no public profile. */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { ids, ready } = useSavedEvents();
  const account = useAccountSession();
  const email = account.session?.user.email;
  const version = Constants.expoConfig?.version;
  const close = () => router.canGoBack() ? router.back() : router.replace('/');

  return (
    <View style={styles.screen}>
      <View style={[styles.bar, Platform.OS !== 'ios' && { paddingTop: insets.top + space.md }]}>
        <Text accessibilityRole="header" style={styles.barTitle}>Profil</Text>
        <IconButton icon="close" accessibilityLabel="Profil schließen" onPress={close} size={32} plain tint={colors.muted} style={styles.close} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxxl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <View style={styles.avatar}><Icon name="profile" color={colors.text} size={40} /></View>
          <Text style={styles.name}>{email ?? 'Dein Abend. Dein Ding.'}</Text>
          <Text style={styles.text}>{email ? 'Angemeldet · privat, ohne öffentliches Profil' : 'Spots funktioniert ohne Konto. Dein Profil bleibt privat.'}</Text>
        </View>

        <ListGroup>
          {accountClientError
            ? <ListRow icon="profile" title="Konto" subtitle="Konten starten bald" />
            : <ListRow icon="profile" title={email ? 'Konto verwalten' : 'Anmelden'} subtitle={email ? undefined : account.loading ? 'Sitzung wird geprüft …' : 'Anmelden oder kostenloses Konto erstellen'} onPress={() => router.push('/account')} />}
          <ListRow icon="heart" title="Gemerkt" value={!ready ? '…' : String(ids.length)} onPress={() => { close(); router.navigate('/saved'); }} accessibilityLabel="Gemerkte Events öffnen" />
        </ListGroup>

        <ListGroup header="Privatsphäre" footer="Dein Standort wird nur für die Karte genutzt, solange du Spots verwendest. Kein Tracking im Hintergrund, keine Speicherung.">
          <ListRow icon="locate" title="Standort" value="Nur bei Nutzung" />
          {Platform.OS !== 'web' && <ListRow icon="sliders" title="Berechtigungen" onPress={() => void Linking.openSettings().catch(() => {})} accessibilityLabel="Systemeinstellungen für Spots öffnen" />}
        </ListGroup>

        <ListGroup header="Über Spots" footer="Echte Veranstaltungen aus öffentlichen Quellen. Keine erfundenen Events.">
          <ListRow icon="radar" title="Eventdaten" value="Goabase" />
          {version && <ListRow icon="grid" title="Version" value={version} />}
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.sm },
  barTitle: { ...type.headline, color: colors.text },
  close: { backgroundColor: colors.surfaceHigh },
  content: { paddingHorizontal: space.lg, gap: space.xxl },
  identity: { alignItems: 'center', paddingTop: space.lg, gap: space.xs },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, marginBottom: space.md },
  name: { ...type.title2, color: colors.text, textAlign: 'center' },
  text: { ...type.callout, color: colors.muted, textAlign: 'center', maxWidth: 300 },
});
