import { useState } from 'react';
import { View } from 'react-native';
import type { OrganizerPart } from '../../screens/OrganizerProfileScreen';
import { updateOrganizerProfile, type MyOrganizer } from '../organizer/organizerApi';
import { normalizeSocial, normalizeWebsite } from '../organizer/signup';
import { StudioImageField } from './StudioImageField';
import { Input, Message, StudioButton, StudioSheet, studioStyles } from './ui';

const titles: Record<OrganizerPart, string> = { cover: 'Titelbild', name: 'Name, Logo und Adresse', about: 'Über uns' };
type Errors = Partial<Record<'name' | 'street' | 'postcode' | 'city' | 'website' | 'social', string>>;

/** Die Felder eines Teils des Profils. Gespeichert wird immer das ganze Profil; die anderen Teile bleiben unverändert. */
function PartForm({ part, organizer, onDone }: { part: OrganizerPart; organizer: MyOrganizer; onDone: () => void }) {
  const [value, setValue] = useState(() => ({
    name: organizer.displayName, motto: organizer.motto ?? '', biography: organizer.biography ?? '',
    street: organizer.street ?? '', houseNumber: organizer.houseNumber ?? '', postcode: organizer.postcode ?? '', city: organizer.city ?? '',
    website: organizer.websiteUrl ?? '', social: organizer.socialUrl ?? '', avatarUrl: organizer.avatarUrl, coverUrl: organizer.coverUrl,
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof value>(key: K) => (next: (typeof value)[K]) => setValue((current) => ({ ...current, [key]: next }));

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
    if (websiteUrl === 'invalid' || socialUrl === 'invalid' || Object.keys(found).length > 0) {
      // Fehler in einem anderen Teil (z. B. fehlende Adresse) sieht man hier nicht am Feld: dann sagen, wo.
      const here = part === 'name' ? ['name', 'street', 'postcode', 'city'] : part === 'about' ? ['website', 'social'] : [];
      setError(Object.keys(found).some((key) => here.includes(key)) ? null : 'Bitte zuerst Name und Adresse vervollständigen.');
      return;
    }
    setBusy(true); setError(null);
    try {
      await updateOrganizerProfile(organizer.id, { displayName: value.name, biography: value.biography || null, street: value.street, houseNumber: value.houseNumber,
        postcode: value.postcode, city: value.city, websiteUrl, socialUrl, avatarUrl: value.avatarUrl, motto: value.motto || null, coverUrl: value.coverUrl });
      onDone();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Speichern hat nicht geklappt.'); setBusy(false); }
  }

  return <>
    {part === 'cover' && <StudioImageField label="Titelbild" organizerId={organizer.id} kind="cover" value={value.coverUrl} onChange={set('coverUrl')} disabled={busy} />}
    {part === 'name' && <>
      <StudioImageField label="Logo" organizerId={organizer.id} kind="logo" value={value.avatarUrl} onChange={set('avatarUrl')} disabled={busy} />
      <Input label="Name" value={value.name} onChange={set('name')} maxLength={120} editable={!busy} error={errors.name} />
      <View style={studioStyles.row}>
        <View style={[studioStyles.flex, { flexGrow: 3 }]}><Input label="Straße" value={value.street} onChange={set('street')} maxLength={200} editable={!busy} error={errors.street} /></View>
        <View style={studioStyles.flex}><Input label="Nr." value={value.houseNumber} onChange={set('houseNumber')} maxLength={20} editable={!busy} /></View>
      </View>
      <View style={studioStyles.row}>
        <View style={studioStyles.flex}><Input label="PLZ" value={value.postcode} onChange={set('postcode')} keyboard="number-pad" maxLength={5} editable={!busy} error={errors.postcode} /></View>
        <View style={[studioStyles.flex, { flexGrow: 2 }]}><Input label="Stadt" value={value.city} onChange={set('city')} maxLength={120} editable={!busy} error={errors.city} /></View>
      </View>
    </>}
    {part === 'about' && <>
      <Input label="Motto" optional value={value.motto} onChange={set('motto')} placeholder="Ein Satz, der euch beschreibt" maxLength={120} editable={!busy} />
      <Input label="Über euch" optional value={value.biography} onChange={set('biography')} placeholder="Musik, Abende, was euch ausmacht" multiline maxLength={5000} editable={!busy} />
      <Input label="Website" optional value={value.website} onChange={set('website')} placeholder="club-eins.de" keyboard="url" maxLength={500} editable={!busy} error={errors.website} />
      <Input label="Instagram" optional value={value.social} onChange={set('social')} placeholder="@clubeins" keyboard="url" maxLength={500} editable={!busy} error={errors.social} />
    </>}
    <Message error={error} />
    <StudioButton label="Speichern" loading={busy} onPress={() => void save()} />
  </>;
}

/**
 * Ein Teil des Profils bearbeiten: öffnet sich über den Stift an genau diesem Teil der Veranstalterseite
 * (Titelbild; Name, Logo und Adresse; Über uns). Nach dem Speichern zeigt die Seite sofort den neuen Stand.
 */
export function ProfilePartSheet({ part, organizer, onClose, reload }: { part: OrganizerPart | null; organizer: MyOrganizer; onClose: () => void; reload: () => void }) {
  return <StudioSheet visible={part !== null} title={part ? titles[part] : ''} onClose={onClose}>
    {part && <PartForm key={part} part={part} organizer={organizer} onDone={() => { reload(); onClose(); }} />}
  </StudioSheet>;
}
