import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';

export type EventAddressLine = { street: string; postcodeCity: string };

/** „Kaiserstraße 12a“ und „76133 Karlsruhe“ aus den Spalten von SQL 29; null, wenn nichts Brauchbares da ist. */
export function formatEventAddress(row: { street?: string | null; house_number?: string | null; postcode?: string | null } | null, city: string | null): EventAddressLine | null {
  const street = [row?.street?.trim(), row?.house_number?.trim()].filter(Boolean).join(' ');
  if (!street) return null;
  return { street, postcodeCity: [row?.postcode?.trim(), city?.trim()].filter(Boolean).join(' ') };
}

/**
 * Adresse eines Club-Events (SQL 29). Getrennt geladen und ohne Fehleranzeige: Projekte ohne die Spalten
 * (Produktion vor SQL 29) und Importe ohne Adresse zeigen einfach die bisherige Ortszeile.
 */
export function useEventAddress(eventId: string | null | undefined, organizerId: string | null | undefined, city: string | null): EventAddressLine | null {
  const [loaded, setLoaded] = useState<{ id: string; address: EventAddressLine | null } | null>(null);
  useEffect(() => {
    if (!eventId || !organizerId) return;
    let active = true;
    Promise.resolve(getSupabase().from('events').select('street,house_number,postcode').eq('id', eventId).maybeSingle())
      .then(({ data, error }) => { if (active) setLoaded({ id: eventId, address: error ? null : formatEventAddress(data, city) }); })
      .catch(() => { if (active) setLoaded({ id: eventId, address: null }); });
    return () => { active = false; };
  }, [eventId, organizerId, city]);
  return loaded && loaded.id === eventId ? loaded.address : null;
}
