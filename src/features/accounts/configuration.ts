export const accountTestProject = 'nfomkdvotqtlyymomksb';

/** Test-only gate until production accounts are explicitly approved. No backend credentials. */
export function accountConfigurationError(url: string | undefined, key: string | undefined): string | null {
  if (url?.trim() !== `https://${accountTestProject}.supabase.co`) {
    return 'Accounts sind vorerst nur in Spots-Test verfügbar. Für den Account-Test die öffentlichen Supabase-Variablen in einer separaten Testkonfiguration verwenden.';
  }
  if (!key?.trim().startsWith('sb_publishable_')) return 'Für Accounts wird der Supabase Publishable Key des Testprojekts benötigt.';
  return null;
}
