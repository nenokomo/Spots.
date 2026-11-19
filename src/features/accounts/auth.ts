import type { SupabaseClient } from '@supabase/supabase-js';

/** Nur in der Entwicklung: technischer Grund hinter einer Fehlermeldung (Status, Code), nie in der fertigen App. */
function devDetail(error: { status?: number; code?: string; name?: string; message?: string }) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return '';
  return ` [${error.status ?? '–'} ${error.code ?? error.name ?? ''}: ${error.message ?? ''}]`;
}

/** Injectable client keeps credential handling in the Supabase SDK, with deterministic local tests. */
export function createAccountActions(client: SupabaseClient) {
  function checkedEmail(email: string) {
    const normalized = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.');
    return normalized;
  }
  function checkedPassword(password: string) {
    if (password.length < 8) throw new Error('Bitte mindestens acht Zeichen für das Passwort verwenden.');
    return password;
  }
  function credentials(email: string, password: string) {
    return { email: checkedEmail(email), password: checkedPassword(password) };
  }
  return {
    /** Ohne organizer: privates Konto. Mit organizer: Veranstalter-Konto; die Datenbank legt den Club an (SQL 28). */
    async register(email: string, password: string, redirectTo: string, organizer?: Record<string, string | null>) {
      const options = organizer
        ? { emailRedirectTo: redirectTo, data: { account_type: 'organizer', organizer } }
        : { emailRedirectTo: redirectTo };
      const { data, error } = await client.auth.signUp({ ...credentials(email, password), options });
      if (error) throw new Error('Registrierung nicht möglich. Bitte Angaben, Mailzustellung und Verbindungsstatus prüfen.');
      return { requiresEmailConfirmation: !data.session };
    },
    async signIn(email: string, password: string) {
      const { error } = await client.auth.signInWithPassword(credentials(email, password));
      if (error) throw new Error(`Anmeldung fehlgeschlagen. Bitte Zugangsdaten und E-Mail-Bestätigung prüfen.${devDetail(error)}`);
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
    /** Verrät nie, ob es zu einer Adresse ein Konto gibt: Erfolg und unbekannte Adresse sehen gleich aus. */
    async requestPasswordReset(email: string, redirectTo: string) {
      const { error } = await client.auth.resetPasswordForEmail(checkedEmail(email), { redirectTo });
      if (error) {
        throw new Error(error.status === 429 ? 'Zu viele Anfragen. Bitte in ein paar Minuten erneut versuchen.'
          : `Die E-Mail konnte gerade nicht verschickt werden. Bitte später erneut versuchen.${devDetail(error)}`);
      }
    },
    async updatePassword(password: string) {
      const { error } = await client.auth.updateUser({ password: checkedPassword(password) });
      if (error) throw new Error('Das Passwort konnte nicht geändert werden. Bitte den Link erneut anfordern.');
    },
    /** Löscht das eigene Konto endgültig (Datenbank) und danach die Sitzung auf diesem Gerät. */
    async deleteAccount() {
      const { error } = await client.rpc('spots_delete_my_account');
      if (error) throw new Error('Das Konto konnte nicht gelöscht werden. Bitte erneut versuchen.');
      await client.auth.signOut({ scope: 'local' });
    },
  };
}
