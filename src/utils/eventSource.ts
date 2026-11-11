// Anzeigenamen der Eventquellen (Spalte events.source). Unbekannte Quellen behalten ihren Namen.
const SOURCE_LABELS: Record<string, string> = {
  goabase: 'Goabase',
  ticketmaster: 'Ticketmaster',
  redaktion: 'Spots-Redaktion',
};

// Quellen, deren Ticketlink direkt zum Ticketverkauf der Quelle führt.
const TICKET_SELLERS = new Set(['ticketmaster']);

export function sourceLabel(sourceName?: string | null) {
  if (!sourceName) return 'der Originalseite';
  return SOURCE_LABELS[sourceName.toLowerCase()] ?? sourceName.charAt(0).toLocaleUpperCase('de') + sourceName.slice(1);
}

/** „Tickets bei Ticketmaster“ statt „beim Anbieter“, wenn die Quelle selbst verkauft. */
export function ticketSeller(sourceName?: string | null) {
  return sourceName && TICKET_SELLERS.has(sourceName.toLowerCase()) ? sourceLabel(sourceName) : null;
}
