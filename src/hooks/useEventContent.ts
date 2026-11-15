import { useEffect, useState } from 'react';
import { fetchEventSnaps, fetchTicketTypes, onSnapsChanged, type LiveSnap, type TicketType } from '../services/content';

type Content = { snaps: LiveSnap[]; tickets: TicketType[] };
const empty: Content = { snaps: [], tickets: [] };

/** Live Snaps and ticket categories for one event. Failures stay quiet: both are optional extras. Reloads after a new shot. */
export function useEventContent(eventId: string | undefined) {
  const [result, setResult] = useState<{ id: string; content: Content } | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!eventId) return;
    return onSnapsChanged((changed) => { if (changed === eventId) setRevision((value) => value + 1); });
  }, [eventId]);
  useEffect(() => {
    if (!eventId) return;
    let active = true;
    void Promise.all([
      fetchEventSnaps(eventId).catch(() => []),
      fetchTicketTypes(eventId).catch(() => []),
    ]).then(([snaps, tickets]) => { if (active) setResult({ id: eventId, content: { snaps, tickets } }); });
    return () => { active = false; };
  }, [eventId, revision]);
  return eventId && result?.id === eventId ? result.content : empty;
}
