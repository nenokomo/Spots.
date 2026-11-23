import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { registerOrganizer, reviewLabels, submitOrganizer, type MyOrganizer } from '../organizer/organizerApi';
import { emptyOrganizerSignup, validateOrganizerSignup } from '../organizer/signup';
import { AccountCard } from './AccountCard';
import { OrganizerSignupFields } from './OrganizerSignupFields';
import { RedeemInviteCard } from './TeamCard';
import { studio, studioType } from './theme';
import { Card, Message, SectionTitle, StudioButton, StudioPage, studioStyles } from './ui';

const steps = ['Registriert', 'Prüfung durch Spots', 'Live in Spots'] as const;

function ReviewSteps({ organizer }: { organizer: MyOrganizer }) {
  const reached = organizer.reviewStatus === 'approved' ? 3 : organizer.reviewStatus === 'pending' ? 2 : 1;
  return <View style={styles.steps}>
    {steps.map((label, index) => {
      const done = index < reached - 1 || (index === 2 && reached === 3);
      const current = index === reached - 1 && reached < 3;
      return <View key={label} style={styles.step}>
        <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent]}>
          <Text style={[styles.dotLabel, done && styles.dotLabelDone]}>{done ? '✓' : index + 1}</Text>
        </View>
        <Text style={[styles.stepLabel, (done || current) && styles.stepLabelActive]}>{label}</Text>
      </View>;
    })}
  </View>;
}

/** Stand der Freigabe durch das Spots-Team, mit „Antrag stellen“. Steht nur bis zur Freigabe oben im Reiter „Events“. */
export function ReviewCard({ organizer, reload }: { organizer: MyOrganizer; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = organizer.reviewStatus;
  const tone = status === 'approved' ? 'green' : status === 'pending' ? 'amber' : status === 'draft' ? undefined : 'red';
  const text = status === 'approved' ? 'Euer Club ist live. Events, die ihr auf „Live“ stellt, erscheinen sofort in Spots.'
    : status === 'pending' ? 'Wir prüfen euer Profil, meistens innerhalb von ein bis zwei Tagen. Ihr könnt schon Events vorbereiten.'
    : status === 'rejected' ? 'Wir konnten euren Club noch nicht freigeben. Passt die Angaben an und stellt den Antrag erneut.'
    : status === 'suspended' ? 'Euer Club ist gesperrt und nicht öffentlich. Bitte meldet euch beim Spots-Team.'
    : 'Euer Antrag ist noch nicht gestellt.';
  return <Card tone={tone}>
    <Text style={studioStyles.heading}>{reviewLabels[status]}</Text>
    <ReviewSteps organizer={organizer} />
    <Text style={studioStyles.muted}>{text}</Text>
    {organizer.reviewNote && <Text style={studioStyles.body}>Hinweis vom Spots-Team: {organizer.reviewNote}</Text>}
    {(status === 'rejected' || status === 'draft') && organizer.role === 'owner' && <StudioButton small label="Antrag stellen" loading={busy}
      onPress={() => { setBusy(true); setError(null); submitOrganizer(organizer.id).then(reload, (failure: unknown) => setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.')).finally(() => setBusy(false)); }} />}
    <Message error={error} />
  </Card>;
}

/**
 * Konto ist Veranstalter, aber der Club fehlt noch (Angaben bei der Registrierung ungültig oder Team-Mitglied ohne Code):
 * Club anlegen oder Einladungscode einlösen. Solange gibt es keine Reiter.
 */
export default function SetupScreen({ reload }: { reload: () => void }) {
  const [value, setValue] = useState(emptyOrganizerSignup);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    const checked = validateOrganizerSignup(value);
    if ('error' in checked) { setError(checked.error); return; }
    setBusy(true); setError(null);
    try { await registerOrganizer(checked.data); reload(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.'); }
    finally { setBusy(false); }
  }
  return <StudioPage title="Fast geschafft" subtitle="Ergänzt die Angaben zu eurem Club. Danach prüft das Spots-Team euer Profil." bottomInset={40}>
    <Card><OrganizerSignupFields value={value} onChange={setValue} editable={!busy} /></Card>
    <Message error={error} />
    <StudioButton label="Club anlegen und Antrag stellen" loading={busy} onPress={() => void save()} />
    <RedeemInviteCard onJoined={reload} />
    <SectionTitle>Konto</SectionTitle>
    <AccountCard member={false} />
  </StudioPage>;
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 8 },
  step: { flex: 1, gap: 6 },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: studio.line, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg },
  dotDone: { backgroundColor: studio.accent, borderColor: studio.accent },
  dotCurrent: { borderColor: studio.amber },
  dotLabel: { fontSize: 13, fontWeight: '800', color: studio.faint },
  dotLabelDone: { color: studio.onAccent },
  stepLabel: { ...studioType.small, color: studio.faint },
  stepLabelActive: { color: studio.text },
});
