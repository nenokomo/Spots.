import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { accountClientMode, getAccountClient } from '../features/accounts/client';
import { useAccountSession } from '../features/accounts/useAccountSession';
import { createSavedEventsSync, reconcileSavedIds } from '../services/savedEventsSync';

const storageKey = 'spots.saved-events.v1';
// Welches Konto zuletzt auf diesem Gerät abgeglichen wurde.
const syncedUserKey = 'spots.saved-events.synced-user';
async function readSavedIds() {
  const raw = await AsyncStorage.getItem(storageKey);
  const value: unknown = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(value) || !value.every((id) => typeof id === 'string')) throw new Error('Invalid saved events');
  return [...new Set(value as string[])];
}
const syncError = 'Deine Merkliste konnte nicht mit deinem Konto abgeglichen werden. Auf diesem Gerät ist sie gespeichert.';
type SavedEventsState = {
  ids: string[];
  ready: boolean;
  busy: boolean;
  error: string | null;
  reload: () => void;
  toggle: (id: string) => Promise<boolean>;
};
const SavedEventsContext = createContext<SavedEventsState | null>(null);

export function SavedEventsProvider({ children }: PropsWithChildren) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const { session } = useAccountSession();
  // Nur mit Konten für alle (Spots-Test). Die Team-Anmeldung in Produktion hat keine Merkliste im Konto.
  const userId = accountClientMode === 'full' ? session?.user.id ?? null : null;

  const reload = useCallback(async () => {
    if (locked.current) return;
    locked.current = true;
    try {
      setIds(await readSavedIds());
      setReady(true);
      setError(null);
    } catch {
      setError('Deine Merkliste konnte nicht geladen werden. Bitte versuche es erneut.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void readSavedIds().then((value) => {
      if (active) { setIds(value); setReady(true); }
    }, () => {
      if (active) setError('Deine Merkliste konnte nicht geladen werden. Bitte versuche es erneut.');
    }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);

  // Nach dem Anmelden: Nur ein Gerät, das noch nie abgeglichen wurde, bringt seine Liste ins Konto ein.
  // War schon ein (anderes) Konto abgeglichen, gilt die Liste des Kontos – fremde Einträge wandern nie mit.
  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    locked.current = true;
    void (async () => {
      try {
        const [local, synced] = await Promise.all([readSavedIds(), AsyncStorage.getItem(syncedUserKey)]);
        const firstSync = synced === null;
        const server = await createSavedEventsSync(getAccountClient()).merge(firstSync ? local : []);
        const next = reconcileSavedIds(local, server, firstSync);
        await AsyncStorage.multiSet([[storageKey, JSON.stringify(next)], [syncedUserKey, userId]]);
        if (active) { setIds(next); setError(null); }
      } catch {
        if (active) setError(syncError);
      } finally {
        locked.current = false;
      }
    })();
    return () => { active = false; };
  }, [ready, userId]);

  const toggle = useCallback(async (id: string) => {
    if (!ready || locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError(null);
    const adding = !ids.includes(id);
    const next = adding ? [id, ...ids] : ids.filter((item) => item !== id);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      setIds(next);
      if (userId) {
        const sync = createSavedEventsSync(getAccountClient());
        void (adding ? sync.merge([id]) : sync.remove(id)).catch(() => setError(syncError));
      }
      return true;
    } catch {
      setError('Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.');
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, [ids, ready, userId]);

  return <SavedEventsContext.Provider value={{ ids, ready, busy, error, reload: () => { setBusy(true); void reload(); }, toggle }}>{children}</SavedEventsContext.Provider>;
}

export function useSavedEvents() {
  const value = useContext(SavedEventsContext);
  if (!value) throw new Error('SavedEventsProvider is required');
  return value;
}
