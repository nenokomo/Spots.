import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { EventCard } from './EventCard';
import { isUpcoming } from './format';
import { useStudio } from './StudioContext';
import { Card, Message, Segmented, StudioButton, StudioPage, studioStyles } from './ui';

const views = { upcoming: 'Kommend', past: 'Vergangen' } as const;

export default function EventsScreen() {
  const { organizer, events, error } = useStudio();
  const [view, setView] = useState<keyof typeof views>('upcoming');
  const shown = events.filter((event) => isUpcoming(event) === (view === 'upcoming'))
    .sort((a, b) => view === 'upcoming' ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt));
  const approved = organizer?.reviewStatus === 'approved';

  return <StudioPage title="Events" subtitle={approved ? 'Live-Events erscheinen sofort in Spots.' : 'Bis zur Freigabe bleiben alle Events Entwürfe.'}
    trailing={organizer ? <StudioButton small icon="calendar" label="Neu" onPress={() => router.push({ pathname: '/studio/event/[id]', params: { id: 'new' } })} /> : undefined}>
    <Segmented options={views} value={view} onChange={setView} />
    <Message error={error} />
    {shown.length === 0 && <Card><Text style={studioStyles.muted}>{view === 'upcoming' ? 'Keine kommenden Events.' : 'Noch keine vergangenen Events.'}</Text></Card>}
    {shown.map((event) => <EventCard key={event.id} event={event} />)}
  </StudioPage>;
}
