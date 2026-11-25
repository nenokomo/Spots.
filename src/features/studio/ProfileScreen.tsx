import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../../components/ui/Button';
import { tabBarContentInset } from '../../constants/navigation';
import { OrganizerProfileView, type OrganizerPart } from '../../screens/OrganizerProfileScreen';
import { reviewLabels, type MyOrganizer } from '../organizer/organizerApi';
import { ExploreStory } from './ExploreStory';
import { guestEvents, toPublicOrganizer, toPublicPosts } from './guestView';
import { useExploreStory, usePosts, useStudioRefresh } from './hooks';
import { PostsSheet } from './Posts';
import { ProfilePartSheet, type ProfilePart } from './ProfileEdit';
import { openEvent } from './routes';
import { useStudio } from './StudioContext';
import { studio } from './theme';
import { Card, Check, Pill, ProgressBar, studioStyles } from './ui';

type Todo = { label: string; done: boolean; /** Ohne: der Punkt zeigt nur den Stand (die Story hat ihren eigenen Bereich im Profil). */ part?: ProfilePart };
/** Was dem Profil noch fehlt. Jeder Punkt öffnet den passenden Teil. `storyCount` null = die Story lädt noch. */
export function profileChecklist(organizer: Pick<MyOrganizer, 'avatarUrl' | 'coverUrl' | 'motto' | 'biography' | 'websiteUrl' | 'socialUrl'>, storyCount: number | null): Todo[] {
  return [
    { label: 'Logo', done: !!organizer.avatarUrl, part: 'name' },
    { label: 'Titelbild', done: !!organizer.coverUrl, part: 'cover' },
    { label: 'Motto', done: !!organizer.motto?.trim(), part: 'about' },
    { label: 'Beschreibung', done: !!organizer.biography?.trim(), part: 'about' },
    { label: 'Website oder Instagram', done: !!organizer.websiteUrl || !!organizer.socialUrl, part: 'about' },
    { label: 'Story in Entdecken', done: storyCount === null || storyCount > 0 },
  ];
}

/**
 * Tab „Profil“ (docs/STUDIO-UMBAU-PLAN.md): **die Veranstalterseite, wie Gäste sie sehen** (OrganizerProfileView der Besucher-App).
 * Titelbild, Profilbild (Logo), Name und „Über uns“ lassen sich antippen und ändern. Events öffnen die Eventseite im Studio.
 * „Beiträge“ öffnet die eigenen Beiträge (neu, zurückziehen, löschen). Unter „Vergangene Events“ steht der Bereich
 * „Story in Entdecken“ (Wunsch Noyan), ganz unten nur, was dem Profil noch fehlt.
 * Zahnrad oben rechts → Einstellungen (Team, Ansprechperson, Konto). Nach unten ziehen lädt neu.
 */
export default function ProfileScreen() {
  const { organizer, events, reload } = useStudio();
  const insets = useSafeAreaInsets();
  const story = useExploreStory(organizer?.id);
  const posts = usePosts(organizer?.id);
  const refresh = useStudioRefresh(() => { story.reload(); posts.reload(); });
  const [part, setPart] = useState<ProfilePart | null>(null);
  const [postsOpen, setPostsOpen] = useState(false);

  if (!organizer) return null;
  const status = organizer.reviewStatus;
  const approved = status === 'approved';
  const checklist = profileChecklist(organizer, story.items?.length ?? null);
  const done = checklist.filter((item) => item.done).length;
  const incomplete = done < checklist.length;

  // Unter „Vergangene Events“: zuerst die Story in Entdecken, danach – nur solange etwas fehlt – „Nur für euch“.
  const below = <View style={styles.below}>
    <ExploreStory organizer={organizer} events={events} story={story} />
    {(!approved || incomplete) && <View style={styles.ownHead}>
      <Text style={styles.ownTitle}>Nur für euch</Text>
      <Text style={studioStyles.muted}>Das sehen Gäste nicht.</Text>
    </View>}
    {!approved && <Card>
      <Pill label={reviewLabels[status]} tone={status === 'pending' ? 'amber' : status === 'draft' ? 'muted' : 'red'} />
      <Text style={studioStyles.muted}>Gäste sehen euer Profil, sobald Spots euch freigegeben hat.</Text>
    </Card>}
    {incomplete && <Card>
      <Text style={studioStyles.heading}>Euer Profil ist zu {Math.round((done / checklist.length) * 100)} % fertig</Text>
      <ProgressBar value={done / checklist.length} />
      <View>{checklist.filter((item) => !item.done).map((item) => <Check key={item.label} done={false} label={item.label}
        onPress={item.part ? () => setPart(item.part ?? null) : undefined} />)}</View>
    </Card>}
  </View>;

  return <>
    <OrganizerProfileView organizer={toPublicOrganizer(organizer)} events={guestEvents(events, organizer.id)} posts={toPublicPosts(organizer.id, posts.items ?? [])}
      edit={{
        onEdit: (next: OrganizerPart) => next === 'posts' ? setPostsOpen(true) : setPart(next), onOpenEvent: (id) => openEvent(id), below, refresh, bottomInset: tabBarContentInset(insets.bottom),
        toolbar: <IconButton icon="sliders" accessibilityLabel="Einstellungen" onPress={() => router.push('/studio/settings')} />,
      }} />
    <ProfilePartSheet part={part} organizer={organizer} onClose={() => setPart(null)} reload={reload} />
    <PostsSheet visible={postsOpen} organizer={organizer} posts={posts} onClose={() => setPostsOpen(false)} />
  </>;
}

const styles = StyleSheet.create({
  below: { gap: studio.gap },
  // „Nur für euch“: deutlich abgesetzt von dem, was Gäste sehen.
  ownHead: { gap: 2, marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: studio.accentLine },
  ownTitle: { fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4, color: studio.text },
});
