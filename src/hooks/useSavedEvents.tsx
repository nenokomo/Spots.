import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

const storageKey = 'spots.saved-events.v1';
async function readSavedIds() {
  const raw = await AsyncStorage.getItem(storageKey);
  const value: unknown = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(value) || !value.every((id) => typeof id === 'string')) throw new Error('Invalid saved events');
  return [...new Set(value as string[])];
}
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

  const toggle = useCallback(async (id: string) => {
    if (!ready || locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError(null);
    const next = ids.includes(id) ? ids.filter((item) => item !== id) : [id, ...ids];
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      setIds(next);
      return true;
    } catch {
      setError('Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.');
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, [ids, ready]);

  return <SavedEventsContext.Provider value={{ ids, ready, busy, error, reload: () => { setBusy(true); void reload(); }, toggle }}>{children}</SavedEventsContext.Provider>;
}

export function useSavedEvents() {
  const value = useContext(SavedEventsContext);
  if (!value) throw new Error('SavedEventsProvider is required');
  return value;
}
