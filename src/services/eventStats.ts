import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '../lib/supabase';
import { LOCAL_TEST_ID_PREFIX } from './savedEventsSync';

// Statistik für Veranstalter-Events (SQL 26): Aufrufe und Ticket-Klicks, nur als Tagessummen.
// Die Geräte-Kennung ist zufällig, hängt an keinem Konto und verlässt das Gerät nur als Teil eines Zählaufrufs;
// die Datenbank speichert davon nur einen Hash, der nach einem Tag gelöscht wird.
const deviceKey = 'spots.stats-device.v1';
let device: Promise<string> | null = null;

export function randomDeviceId(random: () => number = Math.random): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
}

function deviceId(): Promise<string> {
  device ??= (async () => {
    const stored = await AsyncStorage.getItem(deviceKey).catch(() => null);
    if (stored && /^[a-z0-9]{32}$/.test(stored)) return stored;
    const created = randomDeviceId();
    await AsyncStorage.setItem(deviceKey, created).catch(() => {});
    return created;
  })();
  return device;
}

/** Zählt nur Events mit Veranstalter, nie lokale TEST-Events. Fehler bleiben still: Zählen darf nichts kaputt machen. */
export function shouldTrack(event: { id: string; organizerId?: string | null } | null | undefined): boolean {
  return !!event?.organizerId && !event.id.toLowerCase().startsWith(LOCAL_TEST_ID_PREFIX);
}

export async function trackEvent(eventId: string, kind: 'view' | 'ticket_click'): Promise<void> {
  try {
    await getSupabase().rpc('spots_track_event', { p_event_id: eventId, p_kind: kind, p_device: await deviceId() });
  } catch { /* still */ }
}
