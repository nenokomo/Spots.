import type { SupabaseClient } from '@supabase/supabase-js';

/** Injectable client keeps credential handling in the Supabase SDK, with deterministic local tests. */
export function createAccountActions(client: SupabaseClient) {
  function credentials(email: string, password: string) {
    const normalized = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.');
    if (password.length < 8) throw new Error('Bitte mindestens acht Zeichen für das Passwort verwenden.');
    return { email: normalized, password };
  }
  return {
    async register(email: string, password: string, redirectTo: string) {
      const { data, error } = await client.auth.signUp({ ...credentials(email, password), options: { emailRedirectTo: redirectTo } });
      if (error) throw new Error('Registrierung nicht möglich. Bitte Angaben, Mailzustellung und Verbindungsstatus prüfen.');
      return { requiresEmailConfirmation: !data.session };
    },
    async signIn(email: string, password: string) {
      const { error } = await client.auth.signInWithPassword(credentials(email, password));
      if (error) throw new Error('Anmeldung fehlgeschlagen. Bitte Zugangsdaten und E-Mail-Bestätigung prüfen.');
    },
    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw new Error('Abmeldung fehlgeschlagen. Bitte erneut versuchen.');
    },
    async confirm(code: string) {
      if (!code.trim()) throw new Error('Bestätigungscode fehlt.');
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw new Error('Bestätigungslink ist ungültig oder abgelaufen. Bitte erneut anmelden.');
    },
  };
}
