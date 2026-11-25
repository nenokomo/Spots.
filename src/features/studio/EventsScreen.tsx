import { useState } from 'react';
import { useNow } from '../../hooks/useNow';
import { EventCard } from './EventCard';
import { isUpcoming } from './format';
import { useStudio } from './StudioContext';
import { Empty, Message, Segmented, StudioPage } from './ui';

/** Reiter „Events“: alle Events, kommend oder vergangen. Tippen öffnet die Eventseite. Neu anlegen geht über das ＋. */
export default function EventsScreen() {
  const { organizer, events, error } = useStudio();
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const now = useNow();
  if (!organizer) return null;

  const upcomingCount = events.filter((event) => isUpcoming(event, now)).length;
  const views = { upcoming: `Kommend · ${upcomingCount}`, past: `Vergangen · ${events.length - upcomingCount}` };
  const shown = events.filter((event) => isUpcoming(event, now) === (view === 'upcoming'))
    .sort((a, b) => view === 'upcoming' ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt));

  return <StudioPage title="Events">
    <Message error={error} />
    {events.length > 0 && <Segmented options={views} value={view} onChange={setView} />}
    {events.length === 0
      ? <Empty icon="calendar" title="Noch keine Events" text="Tippt unten auf das Plus und legt euer erstes Event an." />
      : shown.length === 0 && <Empty icon="calendar" title={view === 'upcoming' ? 'Keine kommenden Events' : 'Noch keine vergangenen Events'} />}
    {shown.map((event) => <EventCard key={event.id} event={event} />)}
  </StudioPage>;
}
