import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { fetchEvent, fetchLiveEvents, fetchSavedEvents, fetchUpcomingEvents } from '../services/events';
import { isLiveEvent, isUpcomingEvent, type SpotEvent } from '../types/events';

type EventResource = {
  events: SpotEvent[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};
type Loader = (signal: AbortSignal) => Promise<SpotEvent[]>;

function useEventResource(loader: Loader): EventResource {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ loader: Loader; revision: number; events: SpotEvent[]; error: string | null } | null>(null);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    void Promise.resolve().then(() => loader(controller.signal)).then((rows) => {
      if (active) setResult({ loader, revision, events: rows, error: null });
    }).catch((reason: unknown) => {
      if (!active) return;
      const error = controller.signal.aborted ? 'Die Verbindung dauert zu lange. Bitte erneut versuchen.'
        : reason instanceof Error ? reason.message : 'Events konnten nicht geladen werden. Bitte erneut versuchen.';
      setResult({ loader, revision, events: [], error });
    }).finally(() => {
      clearTimeout(timeout);
    });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [loader, revision]);

  useEffect(() => {
    const timer = setInterval(() => { if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive') reload(); }, 60_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') reload(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [reload]);

  const current = result?.loader === loader && result.revision === revision;
  return { events: result?.loader === loader ? result.events : [], loading: !current, error: current ? result.error : null, reload };
}

// Remove expired live/upcoming entries at their actual boundary, including overnight.
function useEventClock(events: SpotEvent[]) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timestamp = Date.now();
    const boundaries = events.flatMap((event) => [Date.parse(event.startsAt), Date.parse(event.endsAt ?? '')]).filter((value) => value > timestamp);
    const delay = Math.min(30_000, ...boundaries.map((value) => value - timestamp + 1));
    const timer = setTimeout(refresh, Math.max(1, delay));
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [events, now]);
  return now;
}

const EventsContext = createContext<{ upcoming: EventResource; live: EventResource } | null>(null);

export function EventsProvider({ children }: PropsWithChildren) {
  const upcoming = useEventResource(fetchUpcomingEvents);
  const live = useEventResource(fetchLiveEvents);
  return <EventsContext.Provider value={{ upcoming, live }}>{children}</EventsContext.Provider>;
}

export function useUpcomingEvents() {
  const context = useContext(EventsContext);
  if (!context) throw new Error('EventsProvider is required');
  const resource = context.upcoming;
  const now = useEventClock(resource.events);
  const events = useMemo(() => resource.events.filter((event) => isUpcomingEvent(event, now)), [resource.events, now]);
  return { ...resource, events };
}

export function useLiveEvents() {
  const context = useContext(EventsContext);
  if (!context) throw new Error('EventsProvider is required');
  const resource = context.live;
  const now = useEventClock(resource.events);
  const events = useMemo(() => resource.events.filter((event) => isLiveEvent(event, now)), [resource.events, now]);
  return { ...resource, events };
}

export function useEvent(id: string | undefined) {
  const loader = useCallback(async (signal: AbortSignal) => id ? fetchEvent(id, signal) : [], [id]);
  const resource = useEventResource(loader);
  // Never display a previous route's event while a new request is in progress.
  return { ...resource, event: resource.events.find((event) => event.id === id) };
}

export function useSavedEventDetails(ids: string[]) {
  const idsKey = JSON.stringify(ids);
  const loader = useCallback((signal: AbortSignal) => fetchSavedEvents(JSON.parse(idsKey) as string[], signal), [idsKey]);
  return useEventResource(loader);
}
