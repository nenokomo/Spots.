import { useCallback, useEffect, useState } from 'react';
import { fetchExploreOrganizers, sameCity, type ExploreOrganizer } from '../services/organizerStories';
import { TEST_ORGANIZER_ID, testEvents, testOrganizer } from '../services/testEvents';

/** TEST organizer (development only, clearly labelled): appears for its city so the tiles can be tried without data. */
function testEntry(city: string | null): ExploreOrganizer[] {
  const fixture = testOrganizer(TEST_ORGANIZER_ID);
  if (!fixture || (city && !sameCity(city, fixture.city))) return [];
  const next = testEvents().filter((event) => event.organizerId === fixture.id).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  // No logo and no story: the tile shows the name, the story a labelled symbol photo.
  return [{ id: fixture.id, slug: fixture.slug, displayName: fixture.displayName, city: fixture.city, avatarUrl: null,
    nextEvent: next ? { id: next.id, title: next.title, startsAt: next.startsAt } : null, story: [] }];
}

type State = { key: string; organizers: ExploreOrganizer[]; loading: boolean; error: string | null };

/** Approved organizers of a city for the Explore directory. city null = all of Germany. */
export function useExploreOrganizers(city: string | null) {
  const [revision, setRevision] = useState(0);
  const key = `${city ?? ''}:${revision}`;
  const [state, setState] = useState<State>({ key: '', organizers: [], loading: true, error: null });
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    fetchExploreOrganizers(city).then(
      (organizers) => { if (active) setState({ key, organizers: [...organizers, ...testEntry(city)], loading: false, error: null }); },
      (failure: unknown) => { if (active) setState({ key, organizers: testEntry(city), loading: false, error: failure instanceof Error ? failure.message : 'Veranstalter konnten nicht geladen werden.' }); });
    return () => { active = false; };
  }, [city, key]);

  return state.key === key ? { ...state, reload } : { key, organizers: [], loading: true, error: null, reload };
}
