// Club-Angaben bei der Registrierung (SQL 28). Gleiche Regeln wie in der Datenbank, damit Fehler sofort sichtbar sind.

export type OrganizerSignupInput = {
  name: string; street: string; houseNumber: string; postcode: string; city: string;
  website: string; social: string; contactName: string; phone: string;
};
/** So geht es an Supabase (Metadaten der Registrierung bzw. spots_register_organizer). */
export type OrganizerSignupData = {
  name: string; street: string; house_number: string; postcode: string; city: string;
  website_url: string | null; social_url: string | null; contact_name: string; phone: string;
};

export const emptyOrganizerSignup: OrganizerSignupInput = {
  name: '', street: '', houseNumber: '', postcode: '', city: '', website: '', social: '', contactName: '', phone: '',
};

const httpsPattern = /^https:\/\/[^\s@]+$/;
export const phonePattern = /^\+?[0-9][0-9 ()/-]{5,29}$/;

/** „club.de“ → „https://club.de“. Leer bleibt leer; http:// wird nicht akzeptiert. */
export function normalizeWebsite(value: string): string | null | 'invalid' {
  const raw = value.trim();
  if (!raw) return null;
  const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  return httpsPattern.test(url) && url.length <= 500 ? url : 'invalid';
}

/**
 * „@clubeins“ → Instagram-Link; sonst wie eine Website. Ein „@“ im Pfad (z. B. tiktok.com/@club) wird als %40
 * geschrieben: Die Datenbank lehnt „@“ in Links ab, damit niemand Zugangsdaten (name:passwort@…) einbaut.
 */
export function normalizeSocial(value: string): string | null | 'invalid' {
  const raw = value.trim();
  const handle = /^@([A-Za-z0-9._]{1,30})$/.exec(raw);
  if (handle) return `https://www.instagram.com/${handle[1]}`;
  const withScheme = raw && !/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? `https://${raw}` : raw;
  const host = /^https:\/\/([^/?#]*)(.*)$/i.exec(withScheme);
  if (host && !host[1].includes('@')) return normalizeWebsite(`https://${host[1]}${host[2].replace(/@/g, '%40')}`);
  return normalizeWebsite(raw);
}

export function validateOrganizerSignup(input: OrganizerSignupInput): { data: OrganizerSignupData } | { error: string } {
  const text = (value: string) => value.trim().replace(/\s+/g, ' ');
  const name = text(input.name), street = text(input.street), houseNumber = text(input.houseNumber);
  const postcode = input.postcode.trim(), city = text(input.city), contactName = text(input.contactName), phone = text(input.phone);
  const website = normalizeWebsite(input.website), social = normalizeSocial(input.social);
  if (name.length < 2 || name.length > 120) return { error: 'Bitte euren Namen eingeben.' };
  if (!street || street.length > 200 || !houseNumber || houseNumber.length > 20) return { error: 'Bitte Straße und Hausnummer eingeben.' };
  if (!/^[0-9]{5}$/.test(postcode)) return { error: 'Bitte eine fünfstellige Postleitzahl eingeben.' };
  if (!city || city.length > 120) return { error: 'Bitte die Stadt eingeben.' };
  if (website === 'invalid') return { error: 'Die Website-Adresse ist ungültig.' };
  if (social === 'invalid') return { error: 'Den Social-Media-Link bitte als Adresse oder als @Name eingeben.' };
  if (contactName.length < 2 || contactName.length > 120) return { error: 'Bitte den Namen einer Ansprechperson angeben.' };
  if (!phonePattern.test(phone)) return { error: 'Bitte eine Telefonnummer angeben (nur Ziffern, Leerzeichen, +, /, -).' };
  return { data: { name, street, house_number: houseNumber, postcode, city, website_url: website, social_url: social, contact_name: contactName, phone } };
}
