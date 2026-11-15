import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Button } from '../components/ui/Button';
import { ListGroup, ListRow } from '../components/ui/List';
import { PageHeader } from '../components/ui/Section';
import { tabBarContentInset } from '../constants/navigation';
import { colors, space, type } from '../constants/theme';
import { createAccountActions } from '../features/accounts/auth';
import { accountClientError, accountClientMode, getAccountClient } from '../features/accounts/client';
import { setGuestMode } from '../features/accounts/guestMode';
import { useAccountSession } from '../features/accounts/useAccountSession';
import { useIsAdmin } from '../features/admin/useIsAdmin';
import { useSavedEvents } from '../hooks/useSavedEvents';

/** Fourth tab: private, minimal, no public profile. Anmelden passiert auf der Startseite (/account). */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { ids, ready } = useSavedEvents();
  const account = useAccountSession();
  const email = account.session?.user.email;
  const isAdmin = useIsAdmin(account.session?.user.id ?? null).allowed;
  const version = Constants.expoConfig?.version;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Produktion (Team-Anmeldung): Team-Konten werden nicht in der App gelöscht.
  const canDelete = accountClientMode === 'full';

  // Nach Abmelden oder Löschen wieder zur Startseite (dort: anmelden, registrieren oder als Gast weiter).
  async function leave(task: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await task(); await setGuestMode(false); setConfirmDelete(false); router.replace('/account'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Das hat nicht geklappt. Bitte erneut versuchen.'); }
    finally { setBusy(false); }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: tabBarContentInset(insets.bottom) }} showsVerticalScrollIndicator={false}>
        <PageHeader section="DEIN PROFIL" title="Profil" />
        <View style={styles.content}>
          <View style={styles.identity}>
            <View style={styles.avatar}><Icon name="profile" color={colors.text} size={30} /></View>
            <View style={styles.identityCopy}>
              <Text numberOfLines={1} style={styles.name}>{email ?? 'Als Gast unterwegs'}</Text>
              <Text style={styles.text}>{email ? 'Angemeldet · privat' : 'Deine Merkliste bleibt auf diesem Gerät.'}</Text>
            </View>
          </View>

          <ListGroup>
            {!email && !accountClientError && !account.loading && <ListRow icon="profile"
              title={accountClientMode === 'team' ? 'Anmelden' : 'Anmelden oder registrieren'}
              subtitle={accountClientMode === 'team' ? 'Nur für das Spots-Team' : 'Merkliste auf allen Geräten'}
              onPress={() => router.push({ pathname: '/account', params: { kind: 'private' } })} />}
            <ListRow icon="heart" title="Gemerkt" value={!ready ? '…' : String(ids.length)} onPress={() => router.navigate('/saved')} accessibilityLabel="Gemerkte Events öffnen" />
            {isAdmin && <ListRow icon="grid" title="Spots-Team: Freigaben" subtitle="Entwürfe, Veranstalter, Orte und Meldungen prüfen" onPress={() => router.push('/admin')} />}
          </ListGroup>

          <ListGroup header="Privatsphäre" footer="Standort nur für die Karte, solange du Spots nutzt. Kein Tracking, keine Speicherung.">
            <ListRow icon="locate" title="Standort" value="Nur bei Nutzung" />
            {Platform.OS !== 'web' && <ListRow icon="sliders" title="Berechtigungen" onPress={() => void Linking.openSettings().catch(() => {})} accessibilityLabel="Systemeinstellungen für Spots öffnen" />}
          </ListGroup>

          <ListGroup header="Über Spots" footer="Echte Veranstaltungen aus öffentlichen Quellen.">
            <ListRow icon="radar" title="Eventdaten" value="Goabase, Ticketmaster" />
            {version && <ListRow icon="grid" title="Version" value={version} />}
          </ListGroup>

          {email && <ListGroup header="Konto">
            <ListRow icon="back" title="Abmelden" onPress={busy ? undefined : () => void leave(() => createAccountActions(getAccountClient()).signOut())} />
            {canDelete && <ListRow title="Konto löschen" destructive onPress={busy ? undefined : () => { setConfirmDelete(true); setError(null); }} />}
          </ListGroup>}
          {email && confirmDelete && <View style={styles.danger}>
            <Text style={styles.text}>Dein Konto und deine gespeicherte Merkliste werden endgültig gelöscht. Das lässt sich nicht rückgängig machen.</Text>
            <Button label="Konto endgültig löschen" loading={busy} onPress={() => void leave(() => createAccountActions(getAccountClient()).deleteAccount())} />
            <Button label="Abbrechen" variant="ghost" disabled={busy} onPress={() => setConfirmDelete(false)} />
          </View>}
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
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
  danger: { gap: space.md, padding: space.lg, borderRadius: 16, borderWidth: 1, borderColor: '#ff5a5f55' },
  error: { ...type.footnote, color: colors.danger, marginHorizontal: space.lg },
});
