import type { ComponentType } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import type { OrganizerSignupInput } from '../organizer/signup';
import { Input as StudioInput, studioStyles } from './ui';

type InputProps = {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; optional?: boolean; maxLength?: number; editable?: boolean;
  keyboard?: 'default' | 'url' | 'number-pad' | 'phone-pad'; autoComplete?: 'name' | 'tel' | 'postal-code' | 'street-address';
};
type Props = {
  value: OrganizerSignupInput; onChange: (value: OrganizerSignupInput) => void; editable?: boolean;
  /** Eingabefeld im passenden Look: Studio (Standard) oder Startseite der Besucher-App. */
  Input?: ComponentType<InputProps>; hintStyle?: TextStyle; headingStyle?: TextStyle;
};

/**
 * Angaben zum Veranstalter-Profil bei der Registrierung, in vier klaren Gruppen: Euer Profil · Adresse · Im Netz · Ansprechperson.
 * „Veranstalter“ statt „Club“: auch Kollektive und Reihen registrieren sich hier. Ansprechperson und Telefon sieht nur das Spots-Team.
 */
export function OrganizerSignupFields({ value, onChange, editable = true, Input = StudioInput, hintStyle, headingStyle }: Props) {
  const set = (key: keyof OrganizerSignupInput) => (text: string) => onChange({ ...value, [key]: text });
  const heading = headingStyle ?? studioStyles.heading;
  const hint = hintStyle ?? studioStyles.muted;
  return <View style={studioStyles.stack}>
    <Text accessibilityRole="header" style={heading}>Euer Profil</Text>
    <Input label="Name" value={value.name} onChange={set('name')} placeholder="z. B. Club Eins oder euer Kollektiv" maxLength={120} editable={editable} />

    <Text accessibilityRole="header" style={heading}>Adresse</Text>
    <View style={studioStyles.row}>
      <View style={[studioStyles.flex, { flexGrow: 3 }]}><Input label="Straße" value={value.street} onChange={set('street')} maxLength={200} editable={editable} autoComplete="street-address" /></View>
      <View style={studioStyles.flex}><Input label="Nr." value={value.houseNumber} onChange={set('houseNumber')} maxLength={20} editable={editable} /></View>
    </View>
    <View style={studioStyles.row}>
      <View style={studioStyles.flex}><Input label="PLZ" value={value.postcode} onChange={set('postcode')} keyboard="number-pad" maxLength={5} editable={editable} autoComplete="postal-code" /></View>
      <View style={[studioStyles.flex, { flexGrow: 3 }]}><Input label="Stadt" value={value.city} onChange={set('city')} maxLength={120} editable={editable} /></View>
    </View>

    <Text accessibilityRole="header" style={heading}>Im Netz</Text>
    <Input label="Website" optional value={value.website} onChange={set('website')} placeholder="club-eins.de" keyboard="url" maxLength={500} editable={editable} />
    <Input label="Instagram" optional value={value.social} onChange={set('social')} placeholder="@clubeins" keyboard="url" maxLength={500} editable={editable} />

    <Text accessibilityRole="header" style={heading}>Ansprechperson</Text>
    <Text style={hint}>Sieht nur das Spots-Team, für Rückfragen bei der Prüfung.</Text>
    <Input label="Name" value={value.contactName} onChange={set('contactName')} maxLength={120} editable={editable} autoComplete="name" />
    <Input label="Telefon" value={value.phone} onChange={set('phone')} keyboard="phone-pad" maxLength={30} editable={editable} autoComplete="tel" />
  </View>;
}
