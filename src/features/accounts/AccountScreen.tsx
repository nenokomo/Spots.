import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Icon';
import { RadarLogo } from '../../components/RadarLogo';
import { Backdrop } from '../../components/Screen';
import { Button } from '../../components/ui/Button';
import { colors, radius, space, squircle, type } from '../../constants/theme';
import { emptyOrganizerSignup, validateOrganizerSignup } from '../organizer/signup';
import { OrganizerSignupFields } from '../studio/OrganizerSignupFields';
import { useAccountType } from '../studio/useAccountType';
import { createAccountActions } from './auth';
import { accountClientError, accountClientMode, getAccountClient } from './client';
import { setGuestMode, useGuestMode } from './guestMode';
import { useAccountSession } from './useAccountSession';

type Kind = 'private' | 'organizer';
type Mode = 'signIn' | 'register' | 'forgot';
const choices: Record<Kind, { title: string; text: string; icon: IconName }> = {
  private: { title: 'Privat', text: 'Ich will ausgehen: Events in meiner Nähe finden und merken.', icon: 'heart' },
  organizer: { title: 'Veranstalter', text: 'Club, Kollektiv oder Veranstalter: unsere Events in Spots zeigen.', icon: 'calendar' },
};
const titles: Record<Kind, Record<Mode, string>> = {
  private: { signIn: 'Anmelden', register: 'Konto erstellen', forgot: 'Passwort vergessen' },
  organizer: { signIn: 'Anmelden für Veranstalter', register: 'Club registrieren', forgot: 'Passwort vergessen' },
};
const subtitles: Record<Kind, Record<Mode, string>> = {
  private: {
    signIn: 'Melde dich an und finde heraus, wo heute Nacht was los ist.',
    register: 'Mit Konto hast du deine Merkliste auf allen Geräten.',
    forgot: 'Wir schicken dir einen Link, mit dem du ein neues Passwort setzt.',
  },
  organizer: {
    signIn: 'Euer Zugang zu Spots Studio: Events, Club-Profil und Zahlen.',
    register: 'Ihr bekommt Spots Studio für eure Events und Zahlen. Das Spots-Team prüft euren Club einmal.',
    forgot: 'Wir schicken euch einen Link, mit dem ihr ein neues Passwort setzt.',
  },
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
 * /account – Startseite der App in zwei Schritten:
 * 1. Auswahl „Privat“ oder „Veranstalter“ (oder „Als Gast fortfahren“).
 * 2. Anmelden, „Passwort vergessen?“ und „Neues Konto erstellen“ – die Kontoart beim Registrieren kommt aus Schritt 1.
 * Nach dem Anmelden entscheidet die echte Kontoart: Veranstalter → Spots Studio, Privat → Radar.
 * Mail-Links (Bestätigung, neues Passwort) führen ebenfalls hierher. ?kind=private überspringt Schritt 1.
 */
export default function AccountScreen() {
  const { width, height } = useWindowDimensions();
  const { session, loading, error: sessionError } = useAccountSession();
  const params = useLocalSearchParams<{ code?: string; reset?: string; kind?: string }>();
  const { code, reset } = params;
  const handledCode = useRef<string | null>(null);
  // Läuft ein Passwort-Link, darf die Seite nicht weiterleiten, bevor das neue Passwort gesetzt ist.
  const recoveryLink = useRef(false);
  const [kind, setKind] = useState<Kind | null>(params.kind === 'private' || params.kind === 'organizer' ? params.kind : null);
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [club, setClub] = useState(emptyOrganizerSignup);
  const accountType = useAccountType(session?.user.id ?? null);
  // Produktion: nur Anmelden fürs Spots-Team; Registrieren erscheint automatisch, sobald Konten für alle freigeschaltet sind.
  const team = accountClientMode === 'team';
  const logoSize = Math.max(88, Math.min(150, width * 0.34, height * 0.17));

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
  const choose = (next: Kind | null) => { setKind(next); setMode('signIn'); setPassword(''); setError(null); setMessage(null); };

  async function submit() {
    const actions = createAccountActions(getAccountClient());
    if (mode === 'forgot') {
      await actions.requestPasswordReset(email, Linking.createURL('/account', { queryParams: { reset: '1' } }));
      setMessage('Falls es zu dieser Adresse ein Konto gibt, ist ein Link unterwegs. Öffne ihn auf diesem Gerät.');
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

  // „Als Gast fortfahren“: erst weiter, wenn die Gast-Wahl gespeichert ist und die Sperre im Hauptlayout sie kennt.
  const guest = useGuestMode();
  const leavingAsGuest = useRef(false);
  useEffect(() => {
    if (!guest || !leavingAsGuest.current) return;
    leavingAsGuest.current = false;
    if (router.canGoBack()) router.back(); else router.replace('/');
  }, [guest]);
  function continueAsGuest() {
    if (guest) { if (router.canGoBack()) router.back(); else router.replace('/'); return; }
    leavingAsGuest.current = true;
    void setGuestMode(true);
  }

  const disabled = busy || !!accountClientError;
  const canGoBack = router.canGoBack();
  const showChoice = !kind && !recovering && !session;
  const current = kind ?? 'private';

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
        {loading && <ActivityIndicator color={colors.pink} />}
        {(error || sessionError) && showChoice && <Text accessibilityRole="alert" style={styles.error}>{error ?? sessionError}</Text>}

        {/* Schritt 1: Wer bist du? */}
        {showChoice && !loading && <>
          <Text accessibilityRole="header" style={styles.question}>Wie nutzt du Spots?</Text>
          {(Object.keys(choices) as Kind[]).map((item) => <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${choices[item].title}: ${choices[item].text}`}
            disabled={!!accountClientError} onPress={() => choose(item)} style={({ pressed }) => [styles.choice, pressed && styles.choicePressed]}>
            <View style={styles.choiceIcon}><Icon name={choices[item].icon} size={22} color={colors.text} /></View>
            <View style={styles.choiceCopy}>
              <Text style={styles.choiceTitle}>{choices[item].title}</Text>
              <Text style={styles.choiceText}>{choices[item].text}</Text>
            </View>
            <Icon name="chevron" size={16} color={colors.faint} />
          </Pressable>)}
          <Pressable accessibilityRole="button" onPress={continueAsGuest} style={({ pressed }) => [styles.guest, pressed && styles.pressed]}>
            <Text style={styles.guestLabel}>Als Gast fortfahren</Text>
            <Icon name="chevron" size={16} color={colors.muted} />
          </Pressable>
          <Text style={styles.footnote}>Als Gast siehst du alle Events. Deine Merkliste bleibt dann nur auf diesem Gerät.</Text>
        </>}

        {/* Schritt 2: Anmelden, Passwort vergessen, Konto erstellen – oder neues Passwort nach dem Mail-Link. */}
        {!showChoice && <View style={styles.card}>
          {!recovering && !session && <Pressable accessibilityRole="button" accessibilityLabel="Zurück zur Auswahl Privat oder Veranstalter"
            onPress={() => choose(null)} style={styles.backRow}>
            <Icon name="back" size={16} color={colors.pink} />
            <Text style={styles.backLabel}>{choices[current].title}</Text>
          </Pressable>}
          <Text accessibilityRole="header" style={styles.title}>{recovering ? 'Neues Passwort' : titles[current][mode]}</Text>
          <Text style={styles.subtitle}>{recovering ? 'Wähle ein neues Passwort mit mindestens acht Zeichen.'
            : team && mode === 'signIn' ? 'Anmeldung zurzeit nur für das Spots-Team. Konten für alle starten bald.' : subtitles[current][mode]}</Text>
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
            {mode === 'register' && kind === 'organizer' && !team
              && <OrganizerSignupFields value={club} onChange={setClub} editable={!busy} Input={Field} hintStyle={styles.hint} />}
            <Field label="E-Mail" value={email} onChange={setEmail} keyboard="email-address" autoComplete="email" editable={!busy} />
            {mode !== 'forgot' && <Field label="Passwort" value={password} onChange={setPassword} secure autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder={mode === 'register' ? 'mindestens 8 Zeichen' : undefined} editable={!busy} />}
            <Button label={mode === 'forgot' ? 'Link senden' : mode === 'register' ? 'Registrieren' : 'Anmelden'} loading={busy} disabled={disabled}
              onPress={() => void action(submit, mode === 'register')} />
            {mode === 'signIn' && <Button label="Passwort vergessen?" variant="ghost" disabled={busy} onPress={() => switchMode('forgot')} />}
            {mode === 'signIn' && !team && <Button label={kind === 'organizer' ? 'Club registrieren' : 'Neues Konto erstellen'} variant="secondary" disabled={busy} onPress={() => switchMode('register')} />}
            {mode !== 'signIn' && <Button label="Zurück zur Anmeldung" variant="ghost" disabled={busy} onPress={() => switchMode('signIn')} />}
          </View>)}
        </View>}
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
  question: { ...type.title2, color: colors.text, textAlign: 'center', marginTop: space.sm },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: '#ffffff12', ...squircle },
  choicePressed: { borderColor: colors.accent },
  choiceIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  choiceCopy: { flex: 1, gap: 2 },
  choiceTitle: { ...type.headline, color: colors.text },
  choiceText: { ...type.footnote, color: colors.muted },
  card: { gap: space.md, padding: space.xl, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#ffffff12', ...squircle },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start', minHeight: 32 },
  backLabel: { ...type.label, color: colors.pink },
  title: { ...type.title2, color: colors.text },
  subtitle: { ...type.callout, color: colors.muted, marginTop: -space.xs },
  form: { gap: space.md },
  field: { gap: space.xs },
  label: { ...type.overline, fontSize: 11, color: colors.faint },
  optional: { textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  input: { ...type.body, minHeight: 50, borderWidth: 1, borderColor: '#ffffff1c', borderRadius: radius.md, paddingHorizontal: space.lg, color: colors.text, backgroundColor: colors.surfaceHigh },
  hint: { ...type.footnote, color: colors.muted },
  error: { ...type.footnote, color: colors.danger },
  message: { ...type.footnote, color: colors.text },
  guest: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, minHeight: 48 },
  guestLabel: { ...type.label, color: colors.text },
  pressed: { opacity: 0.6 },
  footnote: { ...type.footnote, color: colors.faint, textAlign: 'center', marginTop: -space.md },
});
