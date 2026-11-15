import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { RadarLogo } from '../../components/RadarLogo';
import { Backdrop } from '../../components/Screen';
import { Button } from '../../components/ui/Button';
import { colors, radius, space, squircle, type } from '../../constants/theme';
import { emptyOrganizerSignup, validateOrganizerSignup } from '../organizer/signup';
import { OrganizerSignupFields } from '../studio/OrganizerSignupFields';
import { useAccountType } from '../studio/useAccountType';
import { createAccountActions } from './auth';
import { accountClientError, accountClientMode, getAccountClient } from './client';
import { setGuestMode } from './guestMode';
import { useAccountSession } from './useAccountSession';

type Kind = 'private' | 'organizer';
const kindLabels: Record<Kind, string> = { private: 'Privat', organizer: 'Veranstalter' };
type Mode = 'signIn' | 'register' | 'forgot';
const titles: Record<Mode, string> = { signIn: 'Willkommen', register: 'Konto erstellen', forgot: 'Passwort vergessen' };
const subtitles: Record<Mode, string> = {
  signIn: 'Melde dich an und finde heraus, wo heute Nacht was los ist.',
  register: 'Ein Konto für deine Merkliste auf allen Geräten – oder für euren Club.',
  forgot: 'Wir schicken dir einen Link, mit dem du ein neues Passwort setzt.',
};

/** Eingabefeld im Look der Startseite (auch für die Club-Felder). */
function Field({ label, value, onChange, placeholder, optional, maxLength, editable = true, keyboard = 'default', autoComplete, secure }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; optional?: boolean; maxLength?: number; editable?: boolean;
  keyboard?: 'default' | 'url' | 'number-pad' | 'phone-pad' | 'email-address'; secure?: boolean;
  autoComplete?: 'name' | 'tel' | 'postal-code' | 'street-address' | 'email' | 'current-password' | 'new-password';
}) {
  const plain = keyboard === 'url' || keyboard === 'email-address' || secure;
  return <View style={styles.field}>
    <Text style={styles.label}>{label}{optional && <Text style={styles.optional}>  freiwillig</Text>}</Text>
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.faint} accessibilityLabel={label}
      autoCapitalize={plain ? 'none' : 'sentences'} autoCorrect={false} keyboardType={keyboard} maxLength={maxLength} editable={editable}
      secureTextEntry={secure} autoComplete={autoComplete} style={styles.input} />
  </View>;
}

/**
 * /account – Startseite der App: Anmelden, Registrieren (Privat oder Veranstalter), Passwort vergessen, „Als Gast fortfahren“.
 * Nach dem Anmelden entscheidet die Kontoart: Veranstalter → Spots Studio, Privat → Radar.
 * Mail-Links (Bestätigung, neues Passwort) führen ebenfalls hierher.
 */
export default function AccountScreen() {
  const { width, height } = useWindowDimensions();
  const { session, loading, error: sessionError } = useAccountSession();
  const { code, reset } = useLocalSearchParams<{ code?: string; reset?: string }>();
  const handledCode = useRef<string | null>(null);
  // Läuft ein Passwort-Link, darf die Seite nicht weiterleiten, bevor das neue Passwort gesetzt ist.
  const recoveryLink = useRef(false);
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [kind, setKind] = useState<Kind>('private');
  const [club, setClub] = useState(emptyOrganizerSignup);
  const accountType = useAccountType(session?.user.id ?? null);
  // Produktion: nur Anmelden fürs Spots-Team; Registrieren erscheint automatisch, sobald Konten für alle freigeschaltet sind.
  const team = accountClientMode === 'team';
  const logoSize = Math.max(96, Math.min(150, width * 0.36, height * 0.18));

  // Angemeldet: je nach Kontoart weiter ins Studio oder ins Radar.
  useEffect(() => {
    if (!session || accountType === null || recovering || recoveryLink.current) return;
    router.replace(accountType === 'organizer' ? '/studio' : '/');
  }, [session, accountType, recovering]);

  useEffect(() => {
    if (!code || accountClientError || handledCode.current === code) return;
    handledCode.current = code;
    const recovery = reset === '1';
    recoveryLink.current = recovery;
    let active = true;
    void createAccountActions(getAccountClient()).confirm(code).then(() => {
      if (!active) return;
      if (recovery) setRecovering(true);
      else { setMessage('E-Mail bestätigt. Du bist angemeldet.'); void setGuestMode(false); }
    }).catch(() => {
      recoveryLink.current = false;
      if (active) setError(recovery ? 'Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.' : 'Bestätigungslink ungültig oder abgelaufen. Bitte melde dich an.');
    }).finally(() => { if (active) router.setParams({ code: undefined, reset: undefined }); });
    return () => { active = false; };
  }, [code, reset]);

  async function action(task: () => Promise<void>, keepPassword = false) {
    if (busy) return;
    setBusy(true); setError(null); setMessage(null);
    try { await task(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Das hat nicht geklappt. Bitte erneut versuchen.'); }
    finally { setBusy(false); if (!keepPassword) setPassword(''); }
  }
  const switchMode = (next: Mode) => { setMode(next); setPassword(''); setError(null); setMessage(null); };

  async function submit() {
    const actions = createAccountActions(getAccountClient());
    if (mode === 'forgot') {
      await actions.requestPasswordReset(email, Linking.createURL('/account', { queryParams: { reset: '1' } }));
      setMessage('Falls es zu dieser Adresse ein Konto gibt, haben wir dir einen Link geschickt. Öffne ihn auf diesem Gerät.');
    } else if (mode === 'register' && !team) {
      let organizer: Record<string, string | null> | undefined;
      if (kind === 'organizer') {
        const checked = validateOrganizerSignup(club);
        if ('error' in checked) throw new Error(checked.error);
        organizer = checked.data;
      }
      const result = await actions.register(email, password, Linking.createURL('/account'), organizer);
      if (organizer) setClub(emptyOrganizerSignup);
      setMode('signIn');
      setMessage(result.requiresEmailConfirmation
        ? organizer ? 'Fast geschafft: Bitte bestätigt eure E-Mail und meldet euch dann an. Das Spots-Team prüft euren Club.' : 'Fast geschafft: Bitte bestätige deine E-Mail und melde dich dann an.'
        : 'Konto erstellt.');
    } else {
      // Weiter geht es über den Effekt oben, sobald die Kontoart bekannt ist.
      await actions.signIn(email, password);
      await setGuestMode(false);
    }
  }

  function continueAsGuest() {
    void setGuestMode(true);
    if (router.canGoBack()) router.back(); else router.replace('/');
  }

  const disabled = busy || !!accountClientError;
  const canGoBack = router.canGoBack();
  const title = recovering ? 'Neues Passwort' : titles[mode];

  return <View style={styles.screen}>
    <Backdrop />
    <SafeAreaView style={styles.safe}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content}>
        {canGoBack && <Pressable accessibilityRole="button" accessibilityLabel="Schließen" onPress={() => router.back()} style={styles.close}><Icon name="close" color={colors.text} /></Pressable>}
        <View style={styles.brand}>
          <RadarLogo size={logoSize} />
          <Text style={styles.wordmark}>Spots<Text style={styles.dot}>.</Text></Text>
          <Text style={styles.tagline}>Dein Radar für die Nacht.</Text>
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{recovering ? 'Wähle ein neues Passwort mit mindestens acht Zeichen.' : team && mode === 'signIn' ? 'Anmeldung zurzeit nur für das Spots-Team. Konten für alle starten bald.' : subtitles[mode]}</Text>
          {loading && <ActivityIndicator color={colors.pink} />}
          {(error || sessionError) && <Text accessibilityRole="alert" style={styles.error}>{error ?? sessionError}</Text>}
          {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}

          {!accountClientError && !loading && (recovering && session ? <View style={styles.form}>
            <Field label="Neues Passwort" value={password} onChange={setPassword} secure autoComplete="new-password" editable={!busy} />
            <Button label="Passwort speichern" loading={busy} disabled={disabled} onPress={() => void action(async () => {
              await createAccountActions(getAccountClient()).updatePassword(password);
              recoveryLink.current = false;
              await setGuestMode(false);
              setRecovering(false);
            })} />
          </View> : !session && <View style={styles.form}>
            {mode === 'register' && !team && <>
              <View style={styles.kinds} accessibilityRole="tablist">
                {(Object.keys(kindLabels) as Kind[]).map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: kind === item }}
                  onPress={() => setKind(item)} style={[styles.kind, kind === item && styles.kindActive]}>
                  <Text style={[styles.kindLabel, kind === item && styles.kindLabelActive]}>{kindLabels[item]}</Text>
                </Pressable>)}
              </View>
              <Text style={styles.hint}>{kind === 'organizer'
                ? 'Für Clubs, Kollektive und Veranstalter: Ihr bekommt Spots Studio für eure Events und Zahlen. Das Spots-Team prüft euren Club einmal.'
                : 'Für alle, die ausgehen wollen: deine Merkliste auf allen Geräten.'}</Text>
              {kind === 'organizer' && <OrganizerSignupFields value={club} onChange={setClub} editable={!busy} Input={Field} hintStyle={styles.hint} />}
            </>}
            <Field label="E-Mail" value={email} onChange={setEmail} keyboard="email-address" autoComplete="email" editable={!busy} />
            {mode !== 'forgot' && <Field label="Passwort" value={password} onChange={setPassword} secure autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder={mode === 'register' ? 'mindestens 8 Zeichen' : undefined} editable={!busy} />}
            <Button label={mode === 'forgot' ? 'Link senden' : mode === 'register' ? 'Registrieren' : 'Anmelden'} loading={busy} disabled={disabled}
              onPress={() => void action(submit, mode === 'register')} />
            {mode === 'signIn' && !team && <Button label="Neues Konto erstellen" variant="secondary" disabled={busy} onPress={() => switchMode('register')} />}
            {mode === 'register' && <Button label="Ich habe schon ein Konto" variant="secondary" disabled={busy} onPress={() => switchMode('signIn')} />}
            {mode === 'signIn' && <Button label="Passwort vergessen?" variant="ghost" disabled={busy} onPress={() => switchMode('forgot')} />}
            {mode === 'forgot' && <Button label="Zurück zur Anmeldung" variant="ghost" disabled={busy} onPress={() => switchMode('signIn')} />}
          </View>)}
        </View>

        {!session && !recovering && <Pressable accessibilityRole="button" onPress={continueAsGuest} style={({ pressed }) => [styles.guest, pressed && styles.pressed]}>
          <Text style={styles.guestLabel}>Als Gast fortfahren</Text>
          <Icon name="chevron" size={16} color={colors.muted} />
        </Pressable>}
        {!session && !recovering && <Text style={styles.footnote}>Als Gast siehst du alle Events. Deine Merkliste bleibt dann nur auf diesem Gerät.</Text>}
      </ScrollView>
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: space.xl, gap: space.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
  close: { position: 'absolute', top: space.sm, right: space.md, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  brand: { alignItems: 'center', gap: 2 },
  wordmark: { color: colors.text, fontSize: 40, fontWeight: '800', letterSpacing: -1.5, marginTop: space.xs },
  dot: { color: colors.accent },
  tagline: { color: colors.muted, fontSize: 13, letterSpacing: 0.5 },
  card: { gap: space.md, padding: space.xl, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#ffffff12', ...squircle },
  title: { ...type.title2, color: colors.text },
  subtitle: { ...type.callout, color: colors.muted, marginTop: -space.xs },
  form: { gap: space.md },
  field: { gap: space.xs },
  label: { ...type.overline, fontSize: 11, color: colors.faint },
  optional: { textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  input: { ...type.body, minHeight: 50, borderWidth: 1, borderColor: '#ffffff1c', borderRadius: radius.md, paddingHorizontal: space.lg, color: colors.text, backgroundColor: colors.surfaceHigh },
  kinds: { flexDirection: 'row', padding: 4, borderRadius: radius.md, backgroundColor: colors.surfaceHigh },
  kind: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md - 2 },
  kindActive: { backgroundColor: colors.accent },
  kindLabel: { ...type.label, color: colors.muted },
  kindLabelActive: { color: colors.text },
  hint: { ...type.footnote, color: colors.muted },
  error: { ...type.footnote, color: colors.danger },
  message: { ...type.footnote, color: colors.text },
  guest: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, minHeight: 48 },
  guestLabel: { ...type.label, color: colors.text },
  pressed: { opacity: 0.6 },
  footnote: { ...type.footnote, color: colors.faint, textAlign: 'center', marginTop: -space.md },
});
