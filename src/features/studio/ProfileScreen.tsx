import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../../components/ui/Button';
import { tabBarContentInset } from '../../constants/navigation';
import { OrganizerProfileView, type OrganizerPart } from '../../screens/OrganizerProfileScreen';
import type { PublicOrganizerPost } from '../../types/accounts';
import { fetchMyPosts, reviewLabels, type MyOrganizer } from '../organizer/organizerApi';
import { ExploreStory } from './ExploreStory';
import { guestEvents, toPublicOrganizer, toPublicPosts } from './guestView';
import { useExploreStory, useStudioRefresh } from './hooks';
import { ProfilePartSheet } from './ProfileEdit';
import { openEvent } from './routes';
import { useStudio } from './StudioContext';
import { studio } from './theme';
import { Card, Check, Pill, ProgressBar, studioStyles } from './ui';

type Todo = { label: string; done: boolean; part: OrganizerPart | 'story' };
/** Was dem Profil noch fehlt. Jeder Punkt öffnet den passenden Teil. `storyCount` null = die Story lädt noch. */
export function profileChecklist(organizer: Pick<MyOrganizer, 'avatarUrl' | 'coverUrl' | 'motto' | 'biography' | 'websiteUrl' | 'socialUrl'>, storyCount: number | null): Todo[] {
  return [
    { label: 'Logo', done: !!organizer.avatarUrl, part: 'name' },
    { label: 'Titelbild', done: !!organizer.coverUrl, part: 'cover' },
    { label: 'Motto', done: !!organizer.motto?.trim(), part: 'about' },
    { label: 'Beschreibung', done: !!organizer.biography?.trim(), part: 'about' },
    { label: 'Website oder Instagram', done: !!organizer.websiteUrl || !!organizer.socialUrl, part: 'about' },
    { label: 'Story in Entdecken', done: storyCount === null || storyCount > 0, part: 'story' },
  ];
}

/**
 * Tab „Profil“ (docs/STUDIO-UMBAU-PLAN.md): **die Veranstalterseite, wie Gäste sie sehen** (OrganizerProfileView der Besucher-App).
 * Titelbild, Name und „Über uns“ lassen sich antippen und ändern. Das Profilbild mit „+“ ist die Story in Entdecken –
 * dieselbe Geste wie am Event. Events öffnen die Eventseite im Studio. Darunter nur, was dem Profil noch fehlt.
 * Zahnrad oben rechts → Einstellungen (Team, Ansprechperson, Konto). Nach unten ziehen lädt neu.
 */
export default function ProfileScreen() {
  const { organizer, events, reload } = useStudio();
  const insets = useSafeAreaInsets();
  const story = useExploreStory(organizer?.id);
  const refresh = useStudioRefresh(story.reload);
  const [part, setPart] = useState<OrganizerPart | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [posts, setPosts] = useState<PublicOrganizerPost[]>([]);
  const organizerId = organizer?.id;

  useEffect(() => {
    if (!organizerId) return;
    let active = true;
    fetchMyPosts(organizerId).then((rows) => { if (active) setPosts(toPublicPosts(organizerId, rows)); }, () => { if (active) setPosts([]); });
    return () => { active = false; };
  }, [organizerId]);

  if (!organizer) return null;
  const status = organizer.reviewStatus;
  const approved = status === 'approved';
  const checklist = profileChecklist(organizer, story.items?.length ?? null);
  const done = checklist.filter((item) => item.done).length;
  const incomplete = done < checklist.length;

  const below = !approved || incomplete ? <View style={styles.below}>
    <View style={styles.ownHead}>
      <Text style={styles.ownTitle}>Nur für euch</Text>
      <Text style={studioStyles.muted}>Das sehen Gäste nicht.</Text>
    </View>
    {!approved && <Card>
      <Pill label={reviewLabels[status]} tone={status === 'pending' ? 'amber' : status === 'draft' ? 'muted' : 'red'} />
      <Text style={studioStyles.muted}>Gäste sehen euer Profil, sobald Spots euch freigegeben hat.</Text>
    </Card>}
    {incomplete && <Card>
      <Text style={studioStyles.heading}>Euer Profil ist zu {Math.round((done / checklist.length) * 100)} % fertig</Text>
      <ProgressBar value={done / checklist.length} />
      <View>{checklist.filter((item) => !item.done).map((item) => <Check key={item.label} done={false} label={item.label}
        onPress={() => { const target = item.part; if (target === 'story') setStoryOpen(true); else setPart(target); }} />)}</View>
    </Card>}
  </View> : undefined;

  return <>
    <OrganizerProfileView organizer={toPublicOrganizer(organizer)} events={guestEvents(events, organizer.id)} posts={posts}
      edit={{
        onEdit: setPart, onOpenEvent: (id) => openEvent(id), below, refresh, bottomInset: tabBarContentInset(insets.bottom),
        avatar: <ExploreStory organizer={organizer} events={events} story={story} open={storyOpen} onOpen={setStoryOpen} />,
        toolbar: <IconButton icon="sliders" accessibilityLabel="Einstellungen" onPress={() => router.push('/studio/settings')} />,
      }} />
    <ProfilePartSheet part={part} organizer={organizer} onClose={() => setPart(null)} reload={reload} />
  </>;
}

const styles = StyleSheet.create({
  below: { gap: studio.gap },
  // „Nur für euch“: deutlich abgesetzt von dem, was Gäste sehen.
  ownHead: { gap: 2, paddingTop: 24, borderTopWidth: 1, borderTopColor: studio.accentLine },
  ownTitle: { fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4, color: studio.text },
});
