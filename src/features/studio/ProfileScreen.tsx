import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../../components/ui/Button';
import { tabBarContentInset } from '../../constants/navigation';
import { OrganizerProfileView, type OrganizerPart } from '../../screens/OrganizerProfileScreen';
import type { PublicOrganizerPost } from '../../types/accounts';
import { fetchMyPosts, reviewLabels, type MyOrganizer } from '../organizer/organizerApi';
import { Gallery } from './Gallery';
import { guestEvents, toPublicOrganizer, toPublicPosts } from './guestView';
import { ProfilePartSheet } from './ProfileEdit';
import { openEvent } from './routes';
import { useStudio } from './StudioContext';
import { TeamCard } from './TeamCard';
import { studio } from './theme';
import { Card, Check, Pill, ProgressBar, SectionTitle, studioStyles } from './ui';

/** Was dem Profil noch fehlt. Jeder Punkt öffnet den passenden Teil zum Bearbeiten. */
export function profileChecklist(organizer: Pick<MyOrganizer, 'avatarUrl' | 'coverUrl' | 'motto' | 'biography' | 'websiteUrl' | 'socialUrl'>): { label: string; done: boolean; part: OrganizerPart }[] {
  return [
    { label: 'Logo', done: !!organizer.avatarUrl, part: 'logo' },
    { label: 'Titelbild', done: !!organizer.coverUrl, part: 'cover' },
    { label: 'Motto', done: !!organizer.motto?.trim(), part: 'about' },
    { label: 'Beschreibung', done: !!organizer.biography?.trim(), part: 'about' },
    { label: 'Website oder Instagram', done: !!organizer.websiteUrl || !!organizer.socialUrl, part: 'about' },
  ];
}

/**
 * Tab „Profil“ (docs/STUDIO-UMBAU-PLAN.md): **die Veranstalterseite, wie Gäste sie sehen** (OrganizerProfileView der Besucher-App),
 * mit einem Stift an Titelbild, Logo, Name und „Über uns“. Events öffnen die Eventseite im Studio.
 * Darunter: Story in Entdecken, was dem Profil noch fehlt und das Team. Zahnrad oben rechts → Einstellungen.
 */
export default function ProfileScreen() {
  const { organizer, events, reload } = useStudio();
  const insets = useSafeAreaInsets();
  const [part, setPart] = useState<OrganizerPart | null>(null);
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
  const checklist = profileChecklist(organizer);
  const done = checklist.filter((item) => item.done).length;

  const below = <View style={styles.below}>
    <Gallery organizer={organizer} events={events} />

    <View style={styles.ownHead}>
      <Text style={styles.ownTitle}>Nur für euch</Text>
      <Text style={studioStyles.muted}>Das sehen Gäste nicht.</Text>
    </View>
    {!approved && <Card>
      <Pill label={reviewLabels[status]} tone={status === 'pending' ? 'amber' : status === 'draft' ? 'muted' : 'red'} />
      <Text style={studioStyles.muted}>Gäste sehen euer Profil, sobald Spots euch freigegeben hat.</Text>
    </Card>}
    {done < checklist.length && <Card>
      <Text style={studioStyles.heading}>Euer Profil ist zu {Math.round((done / checklist.length) * 100)} % fertig</Text>
      <ProgressBar value={done / checklist.length} />
      <View>{checklist.filter((item) => !item.done).map((item) => <Check key={item.label} done={false} label={item.label} onPress={() => setPart(item.part)} />)}</View>
    </Card>}
    <SectionTitle>Team</SectionTitle>
    <TeamCard key={`team-${organizer.id}`} organizer={organizer} />
  </View>;

  return <>
    <OrganizerProfileView organizer={toPublicOrganizer(organizer)} events={guestEvents(events, organizer.id)} posts={posts}
      edit={{ onEdit: setPart, onOpenEvent: openEvent, below, bottomInset: tabBarContentInset(insets.bottom),
        toolbar: <IconButton icon="sliders" accessibilityLabel="Einstellungen" onPress={() => router.push('/studio/settings')} /> }} />
    <ProfilePartSheet part={part} organizer={organizer} onClose={() => setPart(null)} reload={reload} />
  </>;
}

const styles = StyleSheet.create({
  below: { gap: studio.gap },
  // „Nur für euch“: deutlich abgesetzt von dem, was Gäste sehen.
  ownHead: { gap: 2, marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: studio.accentLine },
  ownTitle: { fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4, color: studio.text },
});
