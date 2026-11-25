import { useState } from 'react';
import { registerOrganizer } from '../organizer/organizerApi';
import { emptyOrganizerSignup, validateOrganizerSignup } from '../organizer/signup';
import { AccountCard } from './AccountCard';
import { OrganizerSignupFields } from './OrganizerSignupFields';
import { RedeemInviteCard } from './TeamCard';
import { Card, Message, SectionTitle, StudioButton, StudioPage } from './ui';

/**
 * Konto ist Veranstalter, aber das Profil fehlt noch (Angaben bei der Registrierung ungültig oder Team-Mitglied ohne Code):
 * Profil anlegen oder Einladungscode einlösen. Solange gibt es keine Reiter.
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
  return <StudioPage mark title="Fast geschafft" subtitle="Ergänzt eure Angaben. Danach prüft das Spots-Team euer Profil." bottomInset={40}>
    <Card><OrganizerSignupFields value={value} onChange={setValue} editable={!busy} /></Card>
    <Message error={error} />
    <StudioButton label="Profil anlegen und Antrag stellen" loading={busy} onPress={() => void save()} />
    <RedeemInviteCard onJoined={reload} />
    <SectionTitle>Konto</SectionTitle>
    <AccountCard member={false} />
  </StudioPage>;
}
