import { useCallback, useEffect, useState } from 'react';
import { fetchVenueEvents } from '../services/events';
import { fetchVenue } from '../services/venues';
import type { SpotEvent } from '../types/events';
import type { Venue } from '../types/venues';

type VenueResult = { key: string; error: string | null; venue: Venue | null };

export function useVenue(id: string | undefined) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<VenueResult | null>(null);
  const key = id ? `${id}:${revision}` : null;
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!key || !id) return;
    const controller = new AbortController();
    fetchVenue(id, controller.signal)
      .then((venue) => { if (!controller.signal.aborted) setResult({ key, error: null, venue }); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ key, venue: null, error: error instanceof Error ? error.message : 'Der Ort konnte nicht geladen werden.' });
        }
      });
    return () => controller.abort();
  }, [key, id]);

  const current = key && result?.key === key ? result : null;
  return { loading: !!key && !current, error: current?.error ?? null, venue: current?.venue ?? null, reload };
}

/** Kommende Events eines Ortes. Fehler bleiben still: Die Ortsseite funktioniert auch ohne Events. */
export function useVenueEvents(venueId: string | undefined) {
  const [result, setResult] = useState<{ key: string; events: SpotEvent[] } | null>(null);
  useEffect(() => {
    if (!venueId) return;
    const controller = new AbortController();
    fetchVenueEvents(venueId, controller.signal)
      .then((events) => { if (!controller.signal.aborted) setResult({ key: venueId, events }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ key: venueId, events: [] }); });
    return () => controller.abort();
  }, [venueId]);
  return venueId && result?.key === venueId ? result.events : [];
}
