import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { accountConfigurationError, accountMode, accountProject } from './configuration';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
export const accountClientError = accountConfigurationError(url, key);
/** team = Produktion: nur Anmelden für das Spots-Team. */
export const accountClientMode = accountClientError ? null : accountMode(url);
let client: SupabaseClient | undefined;

/** One shared session for private users and organizer members; public event client stays unchanged. */
export function getAccountClient(): SupabaseClient {
  if (accountClientError || !url || !key) throw new Error(accountClientError ?? 'Account-Konfiguration fehlt.');
  if (!client) {
    client = createClient(url, key, { auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      // Eigene Sitzung pro Projekt: Test- und Produktionsanmeldung vermischen sich nie.
      storageKey: `spots.accounts.${accountProject(url)}`, persistSession: true,
      autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce', lock: processLock,
    } });
    if (Platform.OS !== 'web') {
      const auth = client.auth;
      if (AppState.currentState !== 'active') auth.stopAutoRefresh();
      // Registered only once for this lazily created singleton.
      AppState.addEventListener('change', state => {
        if (state === 'active') auth.startAutoRefresh(); else auth.stopAutoRefresh();
      });
    }
  }
  return client;
}
