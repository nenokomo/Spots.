// Zentrale Angaben der Website. Alles mit TODO muss vor dem Livegang ausgefüllt werden.
// Leere Werte erscheinen auf der Seite als klar markierte Platzhalter „[TODO: …]“.
export const site = {
  name: 'Spots',
  tagline: 'Dein Radar für die Nacht',
  description: 'Spots zeigt dir live auf der Karte, wo heute Nacht in deiner Nähe etwas los ist: Partys, Clubs, Konzerte und Events – mit echten Eindrücken von vor Ort.',
  contactEmail: 'kontakt@spots-app.de', // Postfach bei IONOS noch anlegen
  partnerEmail: '', // [TODO: Kontakt-Mail für Veranstalter]; leer = contactEmail
  appStoreUrl: '', // [TODO: Store-Link] App Store
  playStoreUrl: '', // [TODO: Store-Link] Google Play
  instagramUrl: '', // [TODO: Instagram-Profil]
  tiktokUrl: '', // [TODO: TikTok-Profil]
  legal: {
    company: 'Noyan Komac und Jacint Kakucs', // [TODO: Name / Firma]
    legalForm: '', // [TODO: Rechtsform], z. B. GbR
    representatives: 'Noyan Komac und Jacint Kakucs', // [TODO: Vertretungsberechtigte Person(en)]
    street: 'Sophienstraße 51', // [TODO: Straße und Hausnummer]
    city: '76133 Karlsruhe', // [TODO: PLZ und Ort]
    phone: '01575 8163068', // [TODO: Telefon] (optional, aber empfohlen)
    vatId: '', // [TODO: USt-IdNr.] (falls vorhanden)
    register: '', // [TODO: Registergericht und -nummer] (falls vorhanden)
    responsible: 'Noyan Komac und Jacint Kakucs, Sophienstraße 51, 76133 Karlsruhe', // [TODO: Inhaltlich verantwortliche Person nach § 18 Abs. 2 MStV]
    hosting: '', // [TODO: Hosting-Anbieter mit Anschrift], z. B. Vercel, Netlify, Cloudflare
    supabaseRegion: 'EU (Frankfurt)', // laut Projektdoku eu-central-1, vor Livegang bestätigen
  },
} as const;

/** Wert oder sichtbarer Platzhalter. */
export const todo = (value: string, label: string) => value || `[TODO: ${label}]`;
export const partnerEmail = () => site.partnerEmail || site.contactEmail;
