import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { getAccountClient } from '../accounts/client';
import { createAccountActions } from '../accounts/auth';
import { useAccountSession } from '../accounts/useAccountSession';
import { fetchOrganizerContact, saveOrganizerContact, updateOrganizerProfile, type MyOrganizer } from '../organizer/organizerApi';
import { normalizeSocial, normalizeWebsite, phonePattern } from '../organizer/signup';
import { useStudio } from './StudioContext';
import { StudioImageField } from './StudioImageField';
import { Card, Input, Message, SectionTitle, StudioButton, StudioPage, studioStyles } from './ui';

function ProfileForm({ organizer, reload }: { organizer: MyOrganizer; reload: () => void }) {
  const [name, setName] = useState(organizer.displayName);
  const [street, setStreet] = useState(organizer.street ?? '');
  const [houseNumber, setHouseNumber] = useState(organizer.houseNumber ?? '');
  const [postcode, setPostcode] = useState(organizer.postcode ?? '');
  const [city, setCity] = useState(organizer.city ?? '');
  const [website, setWebsite] = useState(organizer.websiteUrl ?? '');
  const [social, setSocial] = useState(organizer.socialUrl ?? '');
  const [biography, setBiography] = useState(organizer.biography ?? '');
  const [avatarUrl, setAvatarUrl] = useState(organizer.avatarUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    const websiteUrl = normalizeWebsite(website), socialUrl = normalizeSocial(social);
    const problem = name.trim().length < 2 ? 'Bitte den Namen des Clubs eingeben.'
      : !street.trim() || !houseNumber.trim() ? 'Bitte Straße und Hausnummer eingeben.'
      : !/^[0-9]{5}$/.test(postcode.trim()) ? 'Bitte eine fünfstellige Postleitzahl eingeben.'
      : !city.trim() ? 'Bitte die Stadt eingeben.'
      : websiteUrl === 'invalid' ? 'Die Website-Adresse ist ungültig.'
      : socialUrl === 'invalid' ? 'Den Social-Media-Link bitte als Adresse oder als @Name eingeben.' : null;
    if (problem || websiteUrl === 'invalid' || socialUrl === 'invalid') { setError(problem); return; }
    setBusy(true); setError(null); setMessage(null);
    try {
      await updateOrganizerProfile(organizer.id, { displayName: name, street, houseNumber, postcode, city, biography: biography || null, websiteUrl, socialUrl, avatarUrl });
      setMessage('Gespeichert.');
      reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Speichern hat nicht geklappt.'); }
    finally { setBusy(false); }
  }

  return <Card>
    <StudioImageField label="Logo" organizerId={organizer.id} kind="logo" value={avatarUrl} onChange={setAvatarUrl} disabled={busy} />
    <Input label="Name des Clubs" value={name} onChange={setName} maxLength={120} editable={!busy} />
    <View style={studioStyles.row}>
      <View style={[studioStyles.flex, { flexGrow: 3 }]}><Input label="Straße" value={street} onChange={setStreet} maxLength={200} editable={!busy} /></View>
      <View style={studioStyles.flex}><Input label="Nr." value={houseNumber} onChange={setHouseNumber} maxLength={20} editable={!busy} /></View>
    </View>
    <View style={studioStyles.row}>
      <View style={studioStyles.flex}><Input label="PLZ" value={postcode} onChange={setPostcode} keyboard="number-pad" maxLength={5} editable={!busy} /></View>
      <View style={[studioStyles.flex, { flexGrow: 3 }]}><Input label="Stadt" value={city} onChange={setCity} maxLength={120} editable={!busy} /></View>
    </View>
    <Input label="Über euch" optional value={biography} onChange={setBiography} placeholder="Musik, Abende, was euch ausmacht" multiline maxLength={5000} editable={!busy} />
    <Input label="Website" optional value={website} onChange={setWebsite} keyboard="url" maxLength={500} editable={!busy} />
    <Input label="Instagram oder andere Social Media" optional value={social} onChange={setSocial} keyboard="url" maxLength={500} editable={!busy} />
    <Message error={error} text={message} />
    <StudioButton label="Profil speichern" loading={busy} onPress={() => void save()} />
  </Card>;
}

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
      .catch(() => { if (active) setError('Ansprechperson konnte nicht geladen werden.'); })
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
    <Text style={studioStyles.muted}>Nur für das Spots-Team, für Rückfragen. Nicht öffentlich.</Text>
    <Input label="Ansprechperson" value={contactName} onChange={setContactName} maxLength={120} editable={owner && !busy} />
    <Input label="Telefon" value={phone} onChange={setPhone} keyboard="phone-pad" maxLength={30} editable={owner && !busy} />
    <Message error={error} text={message} />
    {owner && <StudioButton variant="secondary" label="Ansprechperson speichern" loading={busy} onPress={() => void save()} />}
  </Card>;
}

function AccountCard() {
  const { session } = useAccountSession();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function act(task: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await task(); router.replace('/'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.'); setBusy(false); }
  }
  return <Card>
    <Text style={studioStyles.muted}>Angemeldet als {session?.user.email}</Text>
    <StudioButton variant="secondary" label="Abmelden" disabled={busy} onPress={() => void act(() => createAccountActions(getAccountClient()).signOut())} />
    {confirm ? <>
      <Text style={studioStyles.body}>Euer Konto wird endgültig gelöscht. Der Club und seine Events werden ausgeblendet, nicht gelöscht. Ansprechperson und Telefon werden gelöscht. Das lässt sich nicht rückgängig machen.</Text>
      <StudioButton variant="danger" label="Konto endgültig löschen" loading={busy} onPress={() => void act(() => createAccountActions(getAccountClient()).deleteAccount())} />
      <StudioButton variant="ghost" label="Abbrechen" disabled={busy} onPress={() => setConfirm(false)} />
    </> : <StudioButton variant="ghost" label="Konto löschen" disabled={busy} onPress={() => setConfirm(true)} />}
    <Message error={error} />
  </Card>;
}

export default function ClubScreen() {
  const { organizer, reload } = useStudio();
  return <StudioPage title="Club" subtitle="So erscheint ihr in Spots. Ansprechperson und Telefon bleiben privat.">
    {organizer && <>
      {organizer.reviewStatus === 'approved' && <StudioButton small variant="ghost" label="Öffentliche Seite ansehen"
        onPress={() => router.push({ pathname: '/organizer/[id]', params: { id: organizer.id } })} />}
      <SectionTitle>Profil</SectionTitle>
      <ProfileForm key={organizer.id} organizer={organizer} reload={reload} />
      <SectionTitle>Ansprechperson</SectionTitle>
      <ContactForm organizer={organizer} />
    </>}
    <SectionTitle>Konto</SectionTitle>
    <AccountCard />
  </StudioPage>;
}
