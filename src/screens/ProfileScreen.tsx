import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { ListGroup, ListRow } from '../components/ui/List';
import { LargeHeader } from '../components/ui/Section';
import { tabBarContentInset } from '../constants/navigation';
import { colors, space, type } from '../constants/theme';
import { accountClientError } from '../features/accounts/client';
import { useAccountSession } from '../features/accounts/useAccountSession';
import { useSavedEvents } from '../hooks/useSavedEvents';

/** Fourth tab: private, minimal, no public profile. */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { ids, ready } = useSavedEvents();
  const account = useAccountSession();
  const email = account.session?.user.email;
  const version = Constants.expoConfig?.version;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: tabBarContentInset(insets.bottom) }} showsVerticalScrollIndicator={false}>
        <LargeHeader title="Profil" />
        <View style={styles.content}>
          <View style={styles.identity}>
            <View style={styles.avatar}><Icon name="profile" color={colors.text} size={30} /></View>
            <View style={styles.identityCopy}>
              <Text numberOfLines={1} style={styles.name}>{email ?? 'Ohne Konto unterwegs'}</Text>
              <Text style={styles.text}>{email ? 'Angemeldet · privat' : 'Dein Profil bleibt privat.'}</Text>
            </View>
          </View>

          <ListGroup>
            {accountClientError
              ? <ListRow icon="profile" title="Konto" value="Startet bald" />
              : <ListRow icon="profile" title={email ? 'Konto verwalten' : 'Anmelden'} subtitle={email ? undefined : account.loading ? 'Sitzung wird geprüft …' : 'Anmelden oder Konto erstellen'} onPress={() => router.push('/account')} />}
            <ListRow icon="heart" title="Gemerkt" value={!ready ? '…' : String(ids.length)} onPress={() => router.navigate('/saved')} accessibilityLabel="Gemerkte Events öffnen" />
          </ListGroup>

          <ListGroup header="Privatsphäre" footer="Standort nur für die Karte, solange du Spots nutzt. Kein Tracking, keine Speicherung.">
            <ListRow icon="locate" title="Standort" value="Nur bei Nutzung" />
            {Platform.OS !== 'web' && <ListRow icon="sliders" title="Berechtigungen" onPress={() => void Linking.openSettings().catch(() => {})} accessibilityLabel="Systemeinstellungen für Spots öffnen" />}
          </ListGroup>

          <ListGroup header="Über Spots" footer="Echte Veranstaltungen aus öffentlichen Quellen.">
            <ListRow icon="radar" title="Eventdaten" value="Goabase" />
            {version && <ListRow icon="grid" title="Version" value={version} />}
          </ListGroup>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, gap: space.xxl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.xxs },
  identityCopy: { flex: 1, minWidth: 0, gap: 2 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  name: { ...type.title3, color: colors.text },
  text: { ...type.callout, color: colors.muted },
});
