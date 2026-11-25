import { useState } from 'react';
import { View } from 'react-native';
import { updateOrganizerProfile, type MyOrganizer } from '../organizer/organizerApi';
import { normalizeSocial, normalizeWebsite } from '../organizer/signup';
import { goBack } from './routes';
import { StudioImageField } from './StudioImageField';
import { useStudio } from './StudioContext';
import { Card, ConfirmSheet, Input, Message, SectionTitle, StudioButton, StudioPage, studioStyles } from './ui';

type Errors = Partial<Record<'name' | 'street' | 'postcode' | 'city' | 'website' | 'social', string>>;

function Form({ organizer, reload }: { organizer: MyOrganizer; reload: () => void }) {
  const [value, setValue] = useState(() => ({
    name: organizer.displayName, motto: organizer.motto ?? '', biography: organizer.biography ?? '',
    street: organizer.street ?? '', houseNumber: organizer.houseNumber ?? '', postcode: organizer.postcode ?? '', city: organizer.city ?? '',
    website: organizer.websiteUrl ?? '', social: organizer.socialUrl ?? '', avatarUrl: organizer.avatarUrl, coverUrl: organizer.coverUrl,
  }));
  const [initial] = useState(() => JSON.stringify(value));
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const set = <K extends keyof typeof value>(key: K) => (next: (typeof value)[K]) => setValue((current) => ({ ...current, [key]: next }));
  const dirty = JSON.stringify(value) !== initial;

  async function save() {
    const websiteUrl = normalizeWebsite(value.website), socialUrl = normalizeSocial(value.social);
    const found: Errors = {};
    if (value.name.trim().length < 2) found.name = 'Bitte euren Namen eingeben.';
    if (!value.street.trim() || !value.houseNumber.trim()) found.street = 'Bitte Straße und Hausnummer eingeben.';
    if (!/^[0-9]{5}$/.test(value.postcode.trim())) found.postcode = 'Bitte eine fünfstellige Postleitzahl eingeben.';
    if (!value.city.trim()) found.city = 'Bitte die Stadt eingeben.';
    if (websiteUrl === 'invalid') found.website = 'Die Website-Adresse ist ungültig.';
    if (socialUrl === 'invalid') found.social = 'Bitte als Adresse oder als @Name eingeben.';
    setErrors(found);
    if (Object.keys(found).length > 0 || websiteUrl === 'invalid' || socialUrl === 'invalid') { setError('Bitte die markierten Felder prüfen.'); return; }
    setBusy(true); setError(null);
    try {
      await updateOrganizerProfile(organizer.id, { displayName: value.name, biography: value.biography || null, street: value.street, houseNumber: value.houseNumber,
        postcode: value.postcode, city: value.city, websiteUrl, socialUrl, avatarUrl: value.avatarUrl, motto: value.motto || null, coverUrl: value.coverUrl });
      reload();
      goBack();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Speichern hat nicht geklappt.'); setBusy(false); }
  }

  return <StudioPage title="Profil bearbeiten" onBack={() => dirty && !busy ? setLeaving(true) : goBack()}
    footer={<><Message error={error} /><StudioButton label="Speichern" loading={busy} onPress={() => void save()} /></>}>
    <Card>
      <StudioImageField label="Logo" organizerId={organizer.id} kind="logo" value={value.avatarUrl} onChange={set('avatarUrl')} disabled={busy} />
      <StudioImageField label="Titelbild" organizerId={organizer.id} kind="cover" value={value.coverUrl} onChange={set('coverUrl')} disabled={busy} />
    </Card>
    <Input label="Name" value={value.name} onChange={set('name')} maxLength={120} editable={!busy} error={errors.name} />
    <Input label="Motto" optional value={value.motto} onChange={set('motto')} placeholder="Ein Satz, der euch beschreibt" maxLength={120} editable={!busy} />
    <Input label="Über euch" optional value={value.biography} onChange={set('biography')} placeholder="Musik, Abende, was euch ausmacht" multiline maxLength={5000} editable={!busy} />

    <SectionTitle>Adresse</SectionTitle>
    <View style={studioStyles.row}>
      <View style={[studioStyles.flex, { flexGrow: 3 }]}><Input label="Straße" value={value.street} onChange={set('street')} maxLength={200} editable={!busy} error={errors.street} /></View>
      <View style={studioStyles.flex}><Input label="Nr." value={value.houseNumber} onChange={set('houseNumber')} maxLength={20} editable={!busy} /></View>
    </View>
    <View style={studioStyles.row}>
      <View style={studioStyles.flex}><Input label="PLZ" value={value.postcode} onChange={set('postcode')} keyboard="number-pad" maxLength={5} editable={!busy} error={errors.postcode} /></View>
      <View style={[studioStyles.flex, { flexGrow: 2 }]}><Input label="Stadt" value={value.city} onChange={set('city')} maxLength={120} editable={!busy} error={errors.city} /></View>
    </View>

    <SectionTitle>Links</SectionTitle>
    <Input label="Website" optional value={value.website} onChange={set('website')} placeholder="club-eins.de" keyboard="url" maxLength={500} editable={!busy} error={errors.website} />
    <Input label="Instagram" optional value={value.social} onChange={set('social')} placeholder="@clubeins" keyboard="url" maxLength={500} editable={!busy} error={errors.social} />

    <ConfirmSheet visible={leaving} title="Änderungen verwerfen?" text="Eure Eingaben sind noch nicht gespeichert." confirmLabel="Verwerfen" cancelLabel="Weiter bearbeiten" danger
      onConfirm={() => { setLeaving(false); goBack(); }} onClose={() => setLeaving(false)} />
  </StudioPage>;
}

/** /studio/page: das öffentliche Profil bearbeiten – Logo, Titelbild, Name, Motto, Beschreibung, Adresse, Links. */
export default function PageEditScreen() {
  const { organizer, reload } = useStudio();
  if (!organizer) return null;
  return <Form key={organizer.id} organizer={organizer} reload={reload} />;
}
