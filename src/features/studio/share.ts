import { Share } from 'react-native';
import { formatInviteCode, type OrganizerEvent } from '../organizer/organizerApi';
import { placeLine, whenLine } from './format';

// Teilen über das Menü des Handys (WhatsApp, Instagram, …). Events aus dem Studio haben noch keine Web-Adresse,
// deshalb als Text mit Ticket-Link. Ein echter Link braucht eine Event-Seite auf der Website (docs/STUDIO-UMBAU-PLAN.md, Abschnitt 7).

export async function shareEvent(event: Pick<OrganizerEvent, 'title' | 'startsAt' | 'endsAt' | 'venueName' | 'city' | 'ticketUrl'>): Promise<void> {
  const lines = [event.title, whenLine(event), placeLine(event), event.ticketUrl ? `Tickets: ${event.ticketUrl}` : null, 'Jetzt in der Spots-App.'];
  try { await Share.share({ title: `${event.title} · Spots`, message: lines.filter(Boolean).join('\n') }); } catch { /* abgebrochen */ }
}

/** Einladung ins Team: der Code mit einer kurzen Anleitung, fertig zum Verschicken. */
export async function shareInvite(code: string, organizerName: string): Promise<void> {
  const message = [
    `Komm ins Team von ${organizerName} bei Spots Studio.`,
    `Einladungscode: ${formatInviteCode(code)}`,
    'So geht es: Spots öffnen, „Veranstalter“ wählen, registrieren mit „Ich habe einen Einladungscode“ und den Code nach dem Anmelden eingeben.',
  ].join('\n\n');
  try { await Share.share({ title: 'Einladung zu Spots Studio', message }); } catch { /* abgebrochen */ }
}
