import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { fetchMyOrganizers, fetchOrganizerEvents, type MyOrganizer, type OrganizerEvent } from '../organizer/organizerApi';

type StudioState = {
  /** undefined = lädt, null = Konto hat (noch) keinen Club. */
  organizer: MyOrganizer | null | undefined;
  events: OrganizerEvent[];
  error: string | null;
  /** Lädt gerade (erstes Laden oder nach `reload`). */
  loading: boolean;
  reload: () => void;
};
const StudioContext = createContext<StudioState | null>(null);

/** Gemeinsame Daten aller Studio-Reiter: der eigene Club (der erste, bei dem das Konto Besitzer ist) und seine Events. */
export function StudioProvider({ userId, children }: PropsWithChildren<{ userId: string }>) {
  const [organizer, setOrganizer] = useState<MyOrganizer | null | undefined>(undefined);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  // Welche Runde fertig geladen ist: solange sie nicht zur aktuellen passt, lädt das Studio.
  const [loaded, setLoaded] = useState(-1);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    (async () => {
      const all = await fetchMyOrganizers();
      const own = all.find((item) => item.role === 'owner') ?? all[0] ?? null;
      const list = own ? await fetchOrganizerEvents(own.id) : [];
      if (active) { setOrganizer(own); setEvents(list); setError(null); setLoaded(revision); }
    })().catch((failure: unknown) => {
      if (active) { setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); setLoaded(revision); }
    });
    return () => { active = false; };
  }, [userId, revision]);

  return <StudioContext.Provider value={{ organizer, events, error, loading: loaded !== revision, reload }}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const value = useContext(StudioContext);
  if (!value) throw new Error('StudioProvider is required');
  return value;
}
