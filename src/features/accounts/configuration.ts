export const accountTestProject = 'nfomkdvotqtlyymomksb';
export const accountProductionProject = 'yhnxdeypkbzyjappuzmv';

/**
 * full: alles (nur Spots-Test). team: in Produktion nur Anmelden für das Spots-Team, keine Registrierung
 * und keine Funktionen aus SQL 15, bis Konten für alle ausdrücklich freigegeben sind.
 */
export type AccountMode = 'full' | 'team';

export function accountProject(url: string | undefined): string | null {
  const value = url?.trim();
  for (const project of [accountTestProject, accountProductionProject]) {
    if (value === `https://${project}.supabase.co`) return project;
  }
  return null;
}

export function accountMode(url: string | undefined): AccountMode | null {
  const project = accountProject(url);
  return project === accountTestProject ? 'full' : project === accountProductionProject ? 'team' : null;
}

/** Nur die beiden bekannten Spots-Projekte und nur ein Publishable Key. Keine Backend-Schlüssel. */
export function accountConfigurationError(url: string | undefined, key: string | undefined): string | null {
  if (!accountProject(url)) return 'Konten sind für diese Konfiguration nicht verfügbar.';
  if (!key?.trim().startsWith('sb_publishable_')) return 'Für Konten wird der Supabase Publishable Key des Projekts benötigt.';
  return null;
}
