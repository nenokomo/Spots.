import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '../../components/Screen';
import { Button, IconButton } from '../../components/ui/Button';
import { ListGroup, ListRow } from '../../components/ui/List';
import { EmptyState } from '../../components/ui/Section';
import { colors, gutter, space, type } from '../../constants/theme';
import { accountClientMode } from '../accounts/client';
import { useAccountSession } from '../accounts/useAccountSession';
import { Field, formStyles } from './formParts';
import { createMyOrganizer, fetchMyOrganizers, reviewLabels, type MyOrganizer } from './organizerApi';

/** /dashboard: deine Veranstalter und „Veranstalter werden“. Einfache Oberfläche, Design offen für Noyan. */
export default function OrganizerHomeScreen() {
  const insets = useSafeAreaInsets();
  const account = useAccountSession();
  const userId = account.session?.user.id ?? null;
  const [organizers, setOrganizers] = useState<MyOrganizer[] | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const back = () => router.canGoBack() ? router.back() : router.replace('/profile');
  const available = accountClientMode === 'full';

  useEffect(() => {
    if (!userId || !available) return;
    let active = true;
    fetchMyOrganizers().then((items) => { if (active) { setOrganizers(items); setError(null); } })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); });
    return () => { active = false; };
  }, [userId, available]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const id = await createMyOrganizer(name);
      setName('');
      router.push({ pathname: '/dashboard/[id]', params: { id } });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Anlegen hat nicht geklappt.');
    } finally {
      setBusy(false);
    }
  }

  const bar = <View style={[styles.bar, { paddingTop: insets.top + space.sm }]}><IconButton icon="back" accessibilityLabel="Zurück" onPress={back} /></View>;
  if (!available || !userId) {
    return <View style={styles.screen}><Backdrop />{bar}
      <View style={[styles.state, { paddingTop: insets.top + 96 }]}>
        {account.loading ? <Text style={styles.muted}>Sitzung wird geprüft …</Text>
          : <EmptyState icon="calendar" title="Veranstalter-Bereich"
              text={!available ? 'Veranstalter-Konten starten bald.' : 'Melde dich an, um als Veranstalter Events in Spots zu zeigen.'}
              action={available ? 'Anmelden' : undefined} onAction={available ? () => router.push('/account') : undefined} />}
      </View>
    </View>;
  }

  return <View style={styles.screen}>
    <Backdrop />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 72, paddingBottom: Math.max(insets.bottom, 16) + space.xl }]}>
      <Text style={styles.eyebrow}>FÜR VERANSTALTER</Text>
      <Text accessibilityRole="header" style={styles.title}>Veranstalter-Bereich</Text>
      {error && <Text accessibilityRole="alert" style={formStyles.error}>{error}</Text>}
      {!organizers && !error && <Text style={styles.muted}>Wird geladen …</Text>}

      {organizers && organizers.length > 0 && <ListGroup header="Deine Veranstalter">
        {organizers.map((item) => <ListRow key={item.id} icon="calendar" title={item.displayName}
          subtitle={`${reviewLabels[item.reviewStatus]} · ${item.role === 'owner' ? 'Besitzer' : 'Team'}`}
          onPress={() => router.push({ pathname: '/dashboard/[id]', params: { id: item.id } })} />)}
      </ListGroup>}

      {organizers && <View style={formStyles.card}>
        <Text style={formStyles.cardTitle}>Veranstalter werden</Text>
        <Text style={formStyles.hint}>So geht es: Profil anlegen, Angaben ergänzen und den Antrag stellen. Das Spots-Team prüft dein Profil einmal. Danach erscheinen deine Events ohne weitere Prüfung.</Text>
        <Field label="Name (Club, Kollektiv oder Veranstalter)" value={name} onChange={setName} placeholder="z. B. Club Eins" maxLength={120} editable={!busy} />
        <Button label="Profil anlegen" loading={busy} disabled={busy || name.trim().length < 2} onPress={() => void create()} />
      </View>}
    </ScrollView>
    {bar}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: space.lg },
  state: { flex: 1, paddingHorizontal: gutter },
  content: { paddingHorizontal: gutter, gap: space.lg, maxWidth: 720, width: '100%', alignSelf: 'center' },
  eyebrow: { ...type.overline, fontSize: 11, color: colors.pink, letterSpacing: 1.5 },
  title: { ...type.largeTitle, fontSize: 34, lineHeight: 40, color: colors.text, marginTop: -space.sm },
  muted: { ...type.body, color: colors.muted },
});
