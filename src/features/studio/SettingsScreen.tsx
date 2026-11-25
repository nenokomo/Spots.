import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { fetchOrganizerContact, saveOrganizerContact, type MyOrganizer } from '../organizer/organizerApi';
import { phonePattern } from '../organizer/signup';
import { AccountCard } from './AccountCard';
import { goBack } from './routes';
import { useStudio } from './StudioContext';
import { TeamCard } from './TeamCard';
import { Card, Input, Message, SectionTitle, StudioButton, StudioPage, studioStyles } from './ui';

/** Ansprechperson für Rückfragen des Spots-Teams. Nicht öffentlich; ändern kann sie nur der Besitzer. */
function ContactForm({ organizer }: { organizer: MyOrganizer }) {
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const owner = organizer.role === 'owner';
  useEffect(() => {
    let active = true;
    fetchOrganizerContact(organizer.id).then((contact) => { if (active && contact) { setContactName(contact.contactName); setPhone(contact.phone); } })
      .catch(() => { if (active) setError('Die Ansprechperson konnte nicht geladen werden.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [organizer.id]);
  async function save() {
    if (contactName.trim().length < 2) { setError('Bitte eine Ansprechperson angeben.'); return; }
    if (!phonePattern.test(phone.trim())) { setError('Bitte eine Telefonnummer angeben (nur Ziffern, Leerzeichen, +, /, -).'); return; }
    setBusy(true); setError(null); setMessage(null);
    try { await saveOrganizerContact(organizer.id, { contactName, phone }); setMessage('Gespeichert.'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Speichern hat nicht geklappt.'); }
    finally { setBusy(false); }
  }
  return <Card>
    <Text style={studioStyles.muted}>Nur das Spots-Team sieht diese Angaben.</Text>
    <Input label="Name" value={contactName} onChange={setContactName} maxLength={120} editable={owner && !busy} autoComplete="name" />
    <Input label="Telefon" value={phone} onChange={setPhone} keyboard="phone-pad" maxLength={30} editable={owner && !busy} autoComplete="tel" />
    <Message error={error} text={message} />
    {owner && <StudioButton variant="secondary" label="Speichern" loading={busy} onPress={() => void save()} />}
  </Card>;
}

/** /studio/settings (Zahnrad im Tab „Profil“): was man selten braucht – Team, Ansprechperson und Konto. */
export default function SettingsScreen() {
  const { organizer } = useStudio();
  if (!organizer) return null;
  return <StudioPage title="Einstellungen" onBack={goBack} bottomInset={40}>
    <SectionTitle>Team</SectionTitle>
    <TeamCard key={`team-${organizer.id}`} organizer={organizer} />
    <SectionTitle>Ansprechperson</SectionTitle>
    <ContactForm organizer={organizer} />
    <SectionTitle>Konto</SectionTitle>
    <AccountCard member={organizer.role !== 'owner'} />
  </StudioPage>;
}
