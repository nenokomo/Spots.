import { useCallback, useEffect, useState } from 'react';
import { onSnapsChanged } from '../../services/content';
import type { OrganizerStoryItem } from '../../services/organizerStories';
import { fetchEventShots, fetchEventStats, fetchMyPosts, fetchMyStoryItems, fetchTickets, type EventStats, type StudioPost, type StudioShot, type StudioTicket } from '../organizer/organizerApi';
import { useStudio } from './StudioContext';

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

/**
 * Nach unten ziehen lädt neu: die gemeinsamen Daten (Profil, Events) und, was die Seite zusätzlich zeigt (`extra`).
 * Der Kreis dreht sich nur nach einem Ziehen, nicht beim ersten Laden.
 */
export function useStudioRefresh(extra?: () => void) {
  const { loading, reload } = useStudio();
  const [pulled, setPulled] = useState(false);
  return { refreshing: pulled && loading, onRefresh: () => { setPulled(true); reload(); extra?.(); } };
}

/** Die dauerhaften Bilder für „Story in Entdecken“ (SQL 33). null = lädt. */
export function useExploreStory(organizerId: string | null | undefined) {
  const [items, setItems] = useState<OrganizerStoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!organizerId) return;
    let active = true;
    fetchMyStoryItems(organizerId).then((rows) => { if (active) { setItems(rows); setError(null); } },
      (failure: unknown) => { if (active) { setItems([]); setError(message(failure, 'Laden hat nicht geklappt.')); } });
    return () => { active = false; };
  }, [organizerId, revision]);
  return { items, error, reload };
}

/** Alle Beiträge des Veranstalters, auch zurückgezogene (SQL 15, 19). null = lädt. */
export function usePosts(organizerId: string | null | undefined) {
  const [items, setItems] = useState<StudioPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!organizerId) return;
    let active = true;
    fetchMyPosts(organizerId).then((rows) => { if (active) { setItems(rows); setError(null); } },
      (failure: unknown) => { if (active) { setItems([]); setError(message(failure, 'Laden hat nicht geklappt.')); } });
    return () => { active = false; };
  }, [organizerId, revision]);
  return { items, error, reload };
}
