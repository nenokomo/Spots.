import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { accountClientError, getAccountClient } from './client';
import { createAccountActions } from './auth';
import { useAccountSession } from './useAccountSession';
import { savePrivateProfile } from './management';

function PrivateProfileForm({ busy, save }: { busy: boolean; save: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  return <View style={styles.form}>
    <TextInput accessibilityLabel="Privater Anzeigename" placeholder="Privater Anzeigename" placeholderTextColor={colors.muted} value={name} onChangeText={setName} maxLength={80} editable={!busy} style={styles.input} />
    <Pressable disabled={busy} accessibilityRole="button" onPress={() => void save(name)} style={styles.button}><Text style={styles.label}>Privates Profil speichern</Text></Pressable>
  </View>;
}

/** Isolated development entry /account. Existing profile and public organizer screens are untouched. */
export default function AccountScreen() {
  const { session, loading, error: sessionError } = useAccountSession();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const handledCode = useRef<string | null>(null);
  const [mode, setMode] = useState<'signIn' | 'register'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || accountClientError || handledCode.current === code) return;
    handledCode.current = code;
    let active = true;
    void createAccountActions(getAccountClient()).confirm(code).then(() => {
      if (active) setMessage('E-Mail bestätigt. Du bist angemeldet.');
    }).catch(() => { if (active) setError('Bestätigungslink ungültig oder abgelaufen. Bitte erneut anmelden.'); })
      .finally(() => { if (active) router.setParams({ code: undefined }); });
    return () => { active = false; };
  }, [code]);

  async function action(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(null); setMessage(null);
    try { await task(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Aktion fehlgeschlagen. Bitte erneut versuchen.'); }
    finally { setBusy(false); setPassword(''); }
  }
  async function submit() {
    const actions = createAccountActions(getAccountClient());
    if (mode === 'register') {
      const result = await actions.register(email, password, Linking.createURL('/account'));
      setMessage(result.requiresEmailConfirmation ? 'Bitte deine E-Mail bestätigen und danach anmelden.' : 'Registrierung erfolgreich.');
    } else await actions.signIn(email, password);
  }
  const disabled = busy || !!accountClientError;
  return <SafeAreaView style={styles.screen}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Link href="/" style={styles.link}>Zurück zu Spots</Link>
    <Text accessibilityRole="header" style={styles.title}>Dein privater Account</Text>
    <Text style={styles.note}>Ein Login für dich und deine Veranstalter. Private Profildaten sind nicht öffentlich.</Text>
    {loading && <ActivityIndicator color={colors.pink} />}
    {(error || sessionError) && <Text accessibilityRole="alert" style={styles.note}>{error ?? sessionError}</Text>}
    {message && <Text accessibilityLiveRegion="polite" style={styles.note}>{message}</Text>}
    {!accountClientError && !loading && (session ? <View style={styles.form}>
      <Text style={styles.note}>Angemeldet als {session.user.email}</Text>
      <PrivateProfileForm key={session.user.id} busy={busy} save={name => action(async () => { await savePrivateProfile(name); setMessage('Privates Profil gespeichert.'); })} />
      <Pressable disabled={disabled} accessibilityRole="button" onPress={() => void action(async () => { await createAccountActions(getAccountClient()).signOut(); setEmail(''); })} style={styles.button}><Text style={styles.label}>Abmelden</Text></Pressable>
    </View> : <View style={styles.form}>
      <TextInput accessibilityLabel="E-Mail" placeholder="E-Mail" placeholderTextColor={colors.muted} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} editable={!busy} style={styles.input} />
      <TextInput accessibilityLabel="Passwort" placeholder="Passwort" placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChangeText={setPassword} editable={!busy} style={styles.input} />
      <Pressable disabled={disabled} accessibilityRole="button" onPress={() => void action(submit)} style={styles.button}><Text style={styles.label}>{busy ? 'Bitte warten …' : mode === 'register' ? 'Registrieren' : 'Anmelden'}</Text></Pressable>
      <Pressable disabled={busy} accessibilityRole="button" onPress={() => { setMode(mode === 'register' ? 'signIn' : 'register'); setPassword(''); setError(null); setMessage(null); }} style={styles.button}><Text style={styles.label}>{mode === 'register' ? 'Zur Anmeldung' : 'Account erstellen'}</Text></Pressable>
    </View>)}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, gap: 18, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { color: colors.text, fontSize: 25, fontWeight: '700' }, note: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  form: { gap: 14 }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text },
  button: { minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, padding: 12 },
  label: { color: colors.text, fontWeight: '600' }, link: { color: colors.pink, paddingVertical: 10 },
});
