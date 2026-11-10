import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/Icon';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space, type } from '../../constants/theme';
import { accountClientError, getAccountClient } from './client';
import { createAccountActions } from './auth';
import { useAccountSession } from './useAccountSession';
import { savePrivateProfile } from './management';

function PrivateProfileForm({ busy, save }: { busy: boolean; save: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  return <View style={styles.form}>
    <TextInput accessibilityLabel="Privater Anzeigename" placeholder="Privater Anzeigename" placeholderTextColor={colors.muted} value={name} onChangeText={setName} maxLength={80} editable={!busy} style={styles.input} />
    <Button label="Privates Profil speichern" variant="secondary" disabled={busy} onPress={() => void save(name)} />
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
    <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={() => router.canGoBack() ? router.back() : router.replace('/profile')} style={styles.back}><Icon name="back" color={colors.text} /></Pressable>
    <Text accessibilityRole="header" style={styles.title}>{session ? 'Dein Konto' : mode === 'register' ? 'Konto erstellen' : 'Anmelden'}</Text>
    <Text style={styles.note}>Ein Login für dich und deine Veranstalterseiten. Private Profildaten sind nicht öffentlich.</Text>
    {loading && <ActivityIndicator color={colors.pink} />}
    {(error || sessionError) && <Text accessibilityRole="alert" style={styles.note}>{error ?? sessionError}</Text>}
    {message && <Text accessibilityLiveRegion="polite" style={styles.note}>{message}</Text>}
    {!accountClientError && !loading && (session ? <View style={styles.form}>
      <Text style={styles.note}>Angemeldet als {session.user.email}</Text>
      <PrivateProfileForm key={session.user.id} busy={busy} save={name => action(async () => { await savePrivateProfile(name); setMessage('Privates Profil gespeichert.'); })} />
      <Button label="Abmelden" variant="ghost" disabled={disabled} onPress={() => void action(async () => { await createAccountActions(getAccountClient()).signOut(); setEmail(''); })} />
    </View> : <View style={styles.form}>
      <TextInput accessibilityLabel="E-Mail" placeholder="E-Mail" placeholderTextColor={colors.muted} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} editable={!busy} style={styles.input} />
      <TextInput accessibilityLabel="Passwort" placeholder="Passwort" placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChangeText={setPassword} editable={!busy} style={styles.input} />
      <Button label={mode === 'register' ? 'Registrieren' : 'Anmelden'} loading={busy} disabled={disabled} onPress={() => void action(submit)} />
      <Button label={mode === 'register' ? 'Ich habe schon ein Konto' : 'Neues Konto erstellen'} variant="ghost" disabled={busy} onPress={() => { setMode(mode === 'register' ? 'signIn' : 'register'); setPassword(''); setError(null); setMessage(null); }} />
    </View>)}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: space.xl, gap: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  back: { width: 44, height: 44, marginLeft: -space.sm, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.display, color: colors.text }, note: { ...type.body, color: colors.muted },
  form: { gap: space.md }, input: { minHeight: 50, borderWidth: 1, borderColor: '#ffffff1c', borderRadius: radius.md, paddingHorizontal: space.lg, color: colors.text, backgroundColor: '#1b1521', fontSize: 15 },
});
