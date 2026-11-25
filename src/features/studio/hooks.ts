import { useCallback, useEffect, useState } from 'react';
import { onSnapsChanged } from '../../services/content';
import { fetchEventShots, fetchEventStats, fetchTickets, type EventStats, type StudioShot, type StudioTicket } from '../organizer/organizerApi';

const message = (failure: unknown, fallback: string) => failure instanceof Error ? failure.message : fallback;

/** Ticketarten eines Events. null = lädt. */
export function useEventTickets(eventId: string | null) {
  const [state, setState] = useState<{ id: string; tickets: StudioTicket[] } | null>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!eventId) return;
    let active = true;
    fetchTickets(eventId).then((tickets) => { if (active) setState({ id: eventId, tickets }); }, () => { if (active) setState({ id: eventId, tickets: [] }); });
    return () => { active = false; };
  }, [eventId, revision]);
  return { tickets: state && state.id === eventId ? state.tickets : null, reload };
}

/** Bilder der letzten 24 Stunden zu einem Event: die Story des Veranstalters und die Shots von Gästen. null = lädt. */
export function useEventImages(eventId: string | null) {
  const [state, setState] = useState<{ id: string; shots: StudioShot[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!eventId) return;
    let active = true;
    fetchEventShots(eventId).then((shots) => { if (active) { setState({ id: eventId, shots }); setError(null); } },
      (failure: unknown) => { if (active) { setState({ id: eventId, shots: [] }); setError(message(failure, 'Laden hat nicht geklappt.')); } });
    return () => { active = false; };
  }, [eventId, revision]);
  // Nach „Story posten“ neu laden.
  useEffect(() => onSnapsChanged((changed) => { if (changed === eventId) reload(); }), [eventId, reload]);
  const shots = state && state.id === eventId ? state.shots : null;
  return {
    shots, error, reload,
    /** Sichtbare Story-Bilder des Veranstalters, älteste zuerst (so laufen sie in der Story). */
    story: (shots ?? []).filter((shot) => shot.byOrganizer && !shot.hidden && shot.url).reverse(),
    guestShots: (shots ?? []).filter((shot) => !shot.byOrganizer),
  };
}

/** Zahlen aller Events des Veranstalters (SQL 26). null = lädt. */
export function useEventStats(organizerId: string | null | undefined, refreshKey?: unknown) {
  const [rows, setRows] = useState<EventStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!organizerId) return;
    let active = true;
    fetchEventStats(organizerId).then((data) => { if (active) { setRows(data); setError(null); } },
      (failure: unknown) => { if (active) setError(message(failure, 'Laden hat nicht geklappt.')); });
    return () => { active = false; };
  }, [organizerId, refreshKey]);
  return { rows, error };
}
