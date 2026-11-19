import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { EventCard } from './EventCard';
import { isUpcoming } from './format';
import { useStudio } from './StudioContext';
import { Card, Message, Segmented, StudioButton, StudioPage, studioStyles } from './ui';



export default function EventsScreen() {
  const { organizer, events, error } = useStudio();
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const upcomingCount = events.filter((event) => isUpcoming(event)).length;
  const views = { upcoming: `Kommend · ${upcomingCount}`, past: `Vergangen · ${events.length - upcomingCount}` };
  const shown = events.filter((event) => isUpcoming(event) === (view === 'upcoming'))
    .sort((a, b) => view === 'upcoming' ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt));
  const approved = organizer?.reviewStatus === 'approved';

  return <StudioPage title="Events" subtitle={approved ? 'Live-Events erscheinen sofort in Spots.' : 'Bis zur Freigabe bleiben alle Events Entwürfe.'}
    trailing={organizer ? <StudioButton small icon="calendar" label="Neues Event" onPress={() => router.push({ pathname: '/studio/event/[id]', params: { id: 'new' } })} /> : undefined}>
    <Segmented options={views} value={view} onChange={setView} />
    <Message error={error} />
    {shown.length === 0 && <Card>
      <Text style={studioStyles.heading}>{view === 'upcoming' ? 'Keine kommenden Events' : 'Noch keine vergangenen Events'}</Text>
      {view === 'upcoming' && organizer && <>
        <Text style={studioStyles.muted}>Legt ein Event an, dann erscheint es hier und nach dem Veröffentlichen in Spots.</Text>
        <StudioButton icon="calendar" label="Event anlegen" onPress={() => router.push({ pathname: '/studio/event/[id]', params: { id: 'new' } })} />
      </>}
    </Card>}
    {shown.map((event) => <EventCard key={event.id} event={event} />)}
  </StudioPage>;
}
