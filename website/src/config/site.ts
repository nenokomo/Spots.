// Zentrale Angaben der Website. Alles mit TODO muss vor dem Livegang ausgefüllt werden.
// Leere Werte erscheinen auf der Seite als klar markierte Platzhalter „[TODO: …]“.
export const site = {
  name: 'Spots',
  tagline: 'Dein Radar für die Nacht',
  description: 'Spots zeigt dir live auf der Karte, wo heute Nacht in deiner Nähe etwas los ist: Partys, Clubs, Konzerte und Events – mit echten Eindrücken von vor Ort.',
  contactEmail: '', // [TODO: Kontakt-Mail], z. B. hallo@spots-app.de
  partnerEmail: '', // [TODO: Kontakt-Mail für Veranstalter]; leer = contactEmail
  appStoreUrl: '', // [TODO: Store-Link] App Store
  playStoreUrl: '', // [TODO: Store-Link] Google Play
  instagramUrl: '', // [TODO: Instagram-Profil]
  tiktokUrl: '', // [TODO: TikTok-Profil]
  legal: {
    company: '', // [TODO: Name / Firma]
    legalForm: '', // [TODO: Rechtsform], z. B. GbR
    representatives: '', // [TODO: Vertretungsberechtigte Person(en)]
    street: '', // [TODO: Straße und Hausnummer]
    city: '', // [TODO: PLZ und Ort]
    phone: '', // [TODO: Telefon] (optional, aber empfohlen)
    vatId: '', // [TODO: USt-IdNr.] (falls vorhanden)
    register: '', // [TODO: Registergericht und -nummer] (falls vorhanden)
    responsible: '', // [TODO: Inhaltlich verantwortliche Person nach § 18 Abs. 2 MStV]
    hosting: '', // [TODO: Hosting-Anbieter mit Anschrift], z. B. Vercel, Netlify, Cloudflare
    supabaseRegion: 'EU (Frankfurt)', // laut Projektdoku eu-central-1, vor Livegang bestätigen
  },
} as const;

/** Wert oder sichtbarer Platzhalter. */
export const todo = (value: string, label: string) => value || `[TODO: ${label}]`;
export const partnerEmail = () => site.partnerEmail || site.contactEmail;
