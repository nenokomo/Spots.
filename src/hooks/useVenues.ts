import { useCallback, useEffect, useState } from 'react';
import { fetchVenue, fetchVenuesNear, type NearbyVenue } from '../services/venues';
import type { Venue } from '../types/venues';
import type { Coordinate } from '../utils/events';

type NearbyResult = { key: string; error: string | null; available: boolean; venues: NearbyVenue[] };

/** Orte im Umkreis. Ohne Mitte (kein Standort, keine Stadt) wird nichts geladen. Muster wie useOrganizerPage. */
export function useVenuesNear(center: Coordinate | null, radiusKm: number) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<NearbyResult | null>(null);
  const latitude = center?.latitude;
  const longitude = center?.longitude;
  const key = latitude === undefined || longitude === undefined ? null : `${latitude}:${longitude}:${radiusKm}:${revision}`;
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (key === null || latitude === undefined || longitude === undefined) return;
    const controller = new AbortController();
    fetchVenuesNear({ latitude, longitude }, radiusKm, controller.signal)
      .then((list) => { if (!controller.signal.aborted) setResult({ key, error: null, ...list }); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ key, available: true, venues: [],
            error: error instanceof Error ? error.message : 'Clubs konnten nicht geladen werden.' });
        }
      });
    return () => controller.abort();
  }, [key, latitude, longitude, radiusKm]);

  const current = key !== null && result?.key === key ? result : null;
  return { loading: key !== null && !current, error: current?.error ?? null, available: current?.available ?? false,
    venues: current?.venues ?? [], reload };
}

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
