/** Adresse eines Veranstalters (z. B. „club-eins“): a–z, 0–9, Bindestrich, 3–64 Zeichen (Regel aus SQL 15). */
export const slugPattern = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

const replacements: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

/** Macht aus einem Namen einen Vorschlag für die Adresse. Liefert '' wenn nichts Brauchbares übrig bleibt. */
export function slugFromName(name: string): string {
  const base = name.toLowerCase().replace(/[äöüß]/g, (letter) => replacements[letter] ?? letter)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/g, '');
  return slugPattern.test(base) ? base : '';
}

/** Zweiter Versuch, wenn die Adresse schon vergeben ist: kurzer Zufallsanhang. */
export function slugWithSuffix(slug: string, random: () => number = Math.random): string {
  const suffix = Math.floor(random() * 36 ** 4).toString(36).padStart(4, '0');
  const base = (slug || 'veranstalter').slice(0, 59).replace(/-+$/g, '');
  return `${base}-${suffix}`;
}
