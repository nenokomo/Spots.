import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/Icon';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space, type } from '../../constants/theme';
import { accountClientError, accountClientMode, getAccountClient } from './client';
import { createAccountActions } from './auth';
import { useAccountSession } from './useAccountSession';
import { savePrivateProfile } from './management';
import { emptyOrganizerSignup, validateOrganizerSignup } from '../organizer/signup';
import { OrganizerSignupFields } from '../studio/OrganizerSignupFields';
import { loadAccountType, useAccountType } from '../studio/useAccountType';

type Kind = 'private' | 'organizer';
const kindLabels: Record<Kind, string> = { private: 'Privat', organizer: 'Veranstalter / Club' };

function PrivateProfileForm({ busy, save }: { busy: boolean; save: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  return <View style={styles.form}>
    <TextInput accessibilityLabel="Privater Anzeigename" placeholder="Privater Anzeigename" placeholderTextColor={colors.muted} value={name} onChangeText={setName} maxLength={80} editable={!busy} style={styles.input} />
    <Button label="Privates Profil speichern" variant="secondary" disabled={busy} onPress={() => void save(name)} />
  </View>;
}

type Mode = 'signIn' | 'register' | 'forgot';
const titles: Record<Mode, string> = { signIn: 'Anmelden', register: 'Konto erstellen', forgot: 'Passwort vergessen' };

/** /account: anmelden, registrieren, Passwort zurücksetzen, abmelden und Konto löschen. */
export default function AccountScreen() {
  const { session, loading, error: sessionError } = useAccountSession();
  const { code, reset } = useLocalSearchParams<{ code?: string; reset?: string }>();
  const handledCode = useRef<string | null>(null);
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Nach dem Link aus der Passwort-Mail: erst neues Passwort setzen, dann normal weiter.
  const [recovering, setRecovering] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [kind, setKind] = useState<Kind>('private');
  const [club, setClub] = useState(emptyOrganizerSignup);
  const accountType = useAccountType(session?.user.id ?? null);

  // Veranstalter-Konten haben eine eigene Oberfläche (Spots Studio).
  useEffect(() => {
    if (session && accountType === 'organizer' && !recovering) router.replace('/studio');
  }, [session, accountType, recovering]);

  useEffect(() => {
    if (!code || accountClientError || handledCode.current === code) return;
    handledCode.current = code;
    const recovery = reset === '1';
    let active = true;
    void createAccountActions(getAccountClient()).confirm(code).then(() => {
      if (!active) return;
      if (recovery) setRecovering(true);
      else setMessage('E-Mail bestätigt. Du bist angemeldet.');
    }).catch(() => { if (active) setError(recovery ? 'Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.' : 'Bestätigungslink ungültig oder abgelaufen. Bitte erneut anmelden.'); })
      .finally(() => { if (active) router.setParams({ code: undefined, reset: undefined }); });
    return () => { active = false; };
  }, [code, reset]);

  async function action(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(null); setMessage(null);
    try { await task(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Aktion fehlgeschlagen. Bitte erneut versuchen.'); }
    finally { setBusy(false); setPassword(''); }
  }
  // Produktion: nur Anmelden fürs Spots-Team; Registrierung, Profile und Konto löschen erst mit Konten für alle.
  const team = accountClientMode === 'team';
  const switchMode = (next: Mode) => { setMode(next); setPassword(''); setError(null); setMessage(null); };
  async function submit() {
    const actions = createAccountActions(getAccountClient());
    if (mode === 'forgot') {
      await actions.requestPasswordReset(email, Linking.createURL('/account', { queryParams: { reset: '1' } }));
      setMessage('Falls es zu dieser Adresse ein Konto gibt, haben wir dir einen Link zum Zurücksetzen geschickt.');
    } else if (mode === 'register' && !team) {
      let organizer: Record<string, string | null> | undefined;
      if (kind === 'organizer') {
        const checked = validateOrganizerSignup(club);
        if ('error' in checked) throw new Error(checked.error);
        organizer = checked.data;
      }
      const result = await actions.register(email, password, Linking.createURL('/account'), organizer);
      if (organizer) setClub(emptyOrganizerSignup);
      setMessage(result.requiresEmailConfirmation
        ? organizer ? 'Bitte bestätigt eure E-Mail und meldet euch dann an. Das Spots-Team prüft euren Club.' : 'Bitte deine E-Mail bestätigen und danach anmelden.'
        : 'Registrierung erfolgreich.');
    } else {
      await actions.signIn(email, password);
      const { data } = await getAccountClient().auth.getUser();
      if (data.user && await loadAccountType(data.user.id).catch(() => 'private') === 'organizer') router.replace('/studio');
    }
  }
  const disabled = busy || !!accountClientError;
  const title = recovering ? 'Neues Passwort' : session ? 'Dein Konto' : titles[mode];
  return <SafeAreaView style={styles.screen}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={() => router.canGoBack() ? router.back() : router.replace('/profile')} style={styles.back}><Icon name="back" color={colors.text} /></Pressable>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <Text style={styles.note}>{team ? 'Anmeldung nur für das Spots-Team. Konten für alle starten bald.' : 'Ein Login für dich und deine Veranstalterseiten. Private Profildaten sind nicht öffentlich.'}</Text>
    {loading && <ActivityIndicator color={colors.pink} />}
    {(error || sessionError) && <Text accessibilityRole="alert" style={styles.note}>{error ?? sessionError}</Text>}
    {message && <Text accessibilityLiveRegion="polite" style={styles.note}>{message}</Text>}
    {!accountClientError && !loading && (recovering && session ? <View style={styles.form}>
      <TextInput accessibilityLabel="Neues Passwort" placeholder="Neues Passwort (mindestens 8 Zeichen)" placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" autoComplete="new-password" value={password} onChangeText={setPassword} editable={!busy} style={styles.input} />
      <Button label="Passwort speichern" loading={busy} disabled={disabled} onPress={() => void action(async () => {
        await createAccountActions(getAccountClient()).updatePassword(password);
        setRecovering(false); setMessage('Dein neues Passwort ist gespeichert.');
      })} />
    </View> : session ? <View style={styles.form}>
      <Text style={styles.note}>Angemeldet als {session.user.email}</Text>
      {!team && <PrivateProfileForm key={session.user.id} busy={busy} save={name => action(async () => { await savePrivateProfile(name); setMessage('Privates Profil gespeichert.'); })} />}
      <Button label="Abmelden" variant="ghost" disabled={disabled} onPress={() => void action(async () => { await createAccountActions(getAccountClient()).signOut(); setEmail(''); setConfirmDelete(false); })} />
      {!team && (confirmDelete ? <View style={styles.danger}>
        <Text style={styles.note}>Dein Konto, dein privates Profil, deine gespeicherte Merkliste und deine Snaps werden endgültig gelöscht. Das lässt sich nicht rückgängig machen. Veranstalterseiten, die nur du verwaltest, werden ausgeblendet.</Text>
        <Button label="Konto endgültig löschen" disabled={disabled} loading={busy} onPress={() => void action(async () => {
          await createAccountActions(getAccountClient()).deleteAccount();
          setConfirmDelete(false); setEmail(''); setMode('signIn'); setMessage('Dein Konto wurde gelöscht.');
        })} />
        <Button label="Abbrechen" variant="ghost" disabled={busy} onPress={() => setConfirmDelete(false)} />
      </View> : <Button label="Konto löschen" variant="ghost" disabled={disabled} onPress={() => { setConfirmDelete(true); setError(null); setMessage(null); }} />)}
    </View> : <View style={styles.form}>
      {mode === 'register' && !team && <View style={styles.kinds}>
        {(Object.keys(kindLabels) as Kind[]).map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: kind === item }}
          onPress={() => setKind(item)} style={[styles.kind, kind === item && styles.kindActive]}>
          <Text style={[styles.kindLabel, kind === item && styles.kindLabelActive]}>{kindLabels[item]}</Text>
        </Pressable>)}
      </View>}
      {mode === 'register' && !team && <Text style={styles.note}>{kind === 'organizer'
        ? 'Für Clubs, Kollektive und Veranstalter: Ihr bekommt Spots Studio, eine eigene Oberfläche für eure Events und Zahlen. Das Spots-Team prüft euren Club einmal.'
        : 'Für alle, die ausgehen wollen: Merkliste auf allen Geräten.'}</Text>}
      {mode === 'register' && !team && kind === 'organizer' && <OrganizerSignupFields value={club} onChange={setClub} editable={!busy} />}
      <TextInput accessibilityLabel="E-Mail" placeholder="E-Mail" placeholderTextColor={colors.muted} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} editable={!busy} style={styles.input} />
      {mode !== 'forgot' && <TextInput accessibilityLabel="Passwort" placeholder="Passwort" placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChangeText={setPassword} editable={!busy} style={styles.input} />}
      <Button label={mode === 'forgot' ? 'Link zum Zurücksetzen senden' : mode === 'register' ? 'Registrieren' : 'Anmelden'} loading={busy} disabled={disabled} onPress={() => void action(submit)} />
      {mode === 'signIn' && <Button label="Passwort vergessen?" variant="ghost" disabled={busy} onPress={() => switchMode('forgot')} />}
      {mode === 'forgot' && <Button label="Zurück zur Anmeldung" variant="ghost" disabled={busy} onPress={() => switchMode('signIn')} />}
      {!team && mode !== 'forgot' && <Button label={mode === 'register' ? 'Ich habe schon ein Konto' : 'Neues Konto erstellen'} variant="ghost" disabled={busy} onPress={() => switchMode(mode === 'register' ? 'signIn' : 'register')} />}
    </View>)}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: space.xl, gap: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  back: { width: 44, height: 44, marginLeft: -space.sm, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.display, color: colors.text }, note: { ...type.body, color: colors.muted },
  form: { gap: space.md },
  kinds: { flexDirection: 'row', padding: 4, borderRadius: radius.md, backgroundColor: '#1c1b1f' },
  kind: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md - 2 },
  kindActive: { backgroundColor: colors.accent },
  kindLabel: { ...type.footnote, color: colors.muted, fontWeight: '600' },
  kindLabelActive: { color: colors.text },
  danger: { gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: '#ff5a5f55' }, input: { minHeight: 50, borderWidth: 1, borderColor: '#ffffff1c', borderRadius: radius.md, paddingHorizontal: space.lg, color: colors.text, backgroundColor: '#1c1b1f', fontSize: 15 },
});
