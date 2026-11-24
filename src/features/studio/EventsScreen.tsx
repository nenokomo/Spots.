import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useNow } from '../../hooks/useNow';
import { EventCard } from './EventCard';
import { isUpcoming } from './format';
import { ReviewCard } from './Setup';
import { useStudio } from './StudioContext';
import { Card, Message, Segmented, StudioButton, StudioPage, studioStyles } from './ui';

const newEvent = () => router.push({ pathname: '/studio/event/[id]', params: { id: 'new' } });

/**
 * /studio (Reiter „Events“, Startseite des Studios): alle Events des Clubs und der einzige Weg zu „Neues Event“.
 * Ein Tipp auf ein Event öffnet seine Seite. Bis zur Freigabe steht oben der Stand der Prüfung.
 */
export default function EventsScreen() {
  const { organizer, events, error, reload } = useStudio();
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const now = useNow();
  if (!organizer) return null;

  const upcomingCount = events.filter((event) => isUpcoming(event, now)).length;
  const views = { upcoming: `Kommend · ${upcomingCount}`, past: `Vergangen · ${events.length - upcomingCount}` };
  const shown = events.filter((event) => isUpcoming(event, now) === (view === 'upcoming'))
    .sort((a, b) => view === 'upcoming' ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt));
  const approved = organizer.reviewStatus === 'approved';
  const none = events.length === 0;

  return <StudioPage title="Events" subtitle={organizer.displayName}
    trailing={none ? undefined : <StudioButton small icon="calendar" label="Neues Event" onPress={newEvent} />}>
    {!approved && <ReviewCard organizer={organizer} reload={reload} />}
    <Message error={error} />

    {none
      ? <Card tone="accent">
          <Text style={studioStyles.heading}>Euer erstes Event</Text>
          <Text style={studioStyles.muted}>Legt ein Event an: Titel, Datum, Ort und Flyer.{approved ? ' Danach stellt ihr es live.' : ' Bis zur Freigabe bleibt es ein Entwurf.'}</Text>
          <StudioButton icon="calendar" label="Event anlegen" onPress={newEvent} />
        </Card>
      : <>
          <Segmented options={views} value={view} onChange={setView} />
          {shown.length === 0 && <Card><Text style={studioStyles.muted}>{view === 'upcoming' ? 'Keine kommenden Events.' : 'Noch keine vergangenen Events.'}</Text></Card>}
          {shown.map((event) => <EventCard key={event.id} event={event} hints={view === 'upcoming'} />)}
        </>}
  </StudioPage>;
}
