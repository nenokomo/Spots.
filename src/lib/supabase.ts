import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Expo only inlines statically referenced EXPO_PUBLIC_* variables.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

function configurationError(): string | null {
  if (!url || !key) return 'Die Event-Verbindung ist noch nicht eingerichtet. Bitte die Supabase-URL und den Publishable Key in .env.local eintragen und Spots neu laden.';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Invalid URL');
  } catch {
    return 'Die Supabase-URL ist ungültig. Bitte eine HTTPS-Projekt-URL verwenden.';
  }
  // Never accept a secret/service-role key in the public client configuration.
  if (!key.startsWith('sb_publishable_')) return 'Bitte den Supabase Publishable Key (sb_publishable_…) verwenden. Secret Keys gehören nicht in die App.';
  return null;
}

export const supabaseConfigurationError = configurationError();
let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (supabaseConfigurationError || !url || !key) throw new Error(supabaseConfigurationError ?? 'Supabase ist nicht eingerichtet.');
  // Public read access only. Authentication can be added separately when login is implemented.
  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
