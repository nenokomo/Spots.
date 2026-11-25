import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { squircle } from '../../constants/theme';
import { reviewLabels, type MyOrganizer } from '../organizer/organizerApi';
import { Gallery } from './Gallery';
import { Avatar } from './Story';
import { useStudio } from './StudioContext';
import { TeamCard } from './TeamCard';
import { studio, studioType } from './theme';
import { Card, Check, Pill, ProgressBar, RoundButton, SectionTitle, StudioButton, StudioPage, studioStyles } from './ui';

const editPage = () => router.push('/studio/page');

/** Was dem Profil noch fehlt. Jeder Punkt führt zu „Profil bearbeiten“. */
export function profileChecklist(organizer: Pick<MyOrganizer, 'avatarUrl' | 'coverUrl' | 'motto' | 'biography' | 'websiteUrl' | 'socialUrl'>) {
  return [
    { label: 'Logo', done: !!organizer.avatarUrl },
    { label: 'Titelbild', done: !!organizer.coverUrl },
    { label: 'Motto', done: !!organizer.motto?.trim() },
    { label: 'Beschreibung', done: !!organizer.biography?.trim() },
    { label: 'Website oder Instagram', done: !!organizer.websiteUrl || !!organizer.socialUrl },
  ];
}

/** Das Profil so, wie es Gäste sehen: Titelbild, Logo, Name, Motto, Beschreibung. */
function Preview({ organizer }: { organizer: MyOrganizer }) {
  const approved = organizer.reviewStatus === 'approved';
  const status = organizer.reviewStatus;
  return <View style={styles.preview}>
    <View style={styles.cover}>
      {organizer.coverUrl
        ? <Image source={{ uri: organizer.coverUrl }} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityLabel="Titelbild" />
        : <LinearGradient colors={['#3a1530', '#1d1020']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      <LinearGradient pointerEvents="none" colors={['#0a090c00', '#0a090cd9']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.coverPill}><Pill label={approved ? 'Live in Spots' : reviewLabels[status]} tone={approved ? 'accent' : status === 'pending' ? 'amber' : status === 'draft' ? 'muted' : 'red'} /></View>
    </View>
    <View style={styles.body}>
      <View style={styles.avatar}><Avatar organizer={organizer} size={76} /></View>
      <Text style={styles.name}>{organizer.displayName}</Text>
      {organizer.city && <View style={styles.line}><Icon name="pin" size={14} color={studio.faint} /><Text style={studioStyles.muted}>{organizer.city}</Text></View>}
      {organizer.motto && <Text style={styles.motto}>{organizer.motto}</Text>}
      {organizer.biography && <Text numberOfLines={3} style={studioStyles.muted}>{organizer.biography}</Text>}
    </View>
  </View>;
}

/**
 * Reiter „Profil“ (docs/STUDIO-UMBAU-PLAN.md): das öffentliche Profil als Vorschau mit „Bearbeiten“, was noch fehlt,
 * die dauerhaften Bilder und das Team. Ansprechperson und Konto liegen hinter dem Zahnrad (Einstellungen).
 */
export default function ProfileScreen() {
  const { organizer, events } = useStudio();
  if (!organizer) return null;
  const approved = organizer.reviewStatus === 'approved';
  const checklist = profileChecklist(organizer);
  const done = checklist.filter((item) => item.done).length;
  const percent = Math.round((done / checklist.length) * 100);

  return <StudioPage title="Profil" trailing={<RoundButton icon="sliders" label="Einstellungen" onPress={() => router.push('/studio/settings')} />}>
    <Preview organizer={organizer} />
    <View style={styles.buttons}>
      <StudioButton icon="edit" label="Bearbeiten" onPress={editPage} style={styles.flex} />
      {approved && <StudioButton variant="secondary" icon="eye" label="Als Gast ansehen" onPress={() => router.push({ pathname: '/organizer/[id]', params: { id: organizer.id } })} style={styles.flex} />}
    </View>

    {done < checklist.length && <Card>
      <Text style={studioStyles.heading}>Euer Profil ist zu {percent} % fertig</Text>
      <ProgressBar value={done / checklist.length} />
      <View>{checklist.filter((item) => !item.done).map((item) => <Check key={item.label} done={false} label={item.label} onPress={editPage} />)}</View>
    </Card>}

    <Gallery organizer={organizer} events={events} />

    <SectionTitle>Team</SectionTitle>
    <TeamCard key={`team-${organizer.id}`} organizer={organizer} />
  </StudioPage>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  preview: { borderRadius: 24, overflow: 'hidden', backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, ...squircle },
  cover: { height: 130, backgroundColor: studio.panelHigh },
  coverPill: { position: 'absolute', right: 12, top: 12 },
  body: { gap: 6, paddingHorizontal: 18, paddingBottom: 18 },
  avatar: { marginTop: -40, alignSelf: 'flex-start', padding: 3, borderRadius: 41, backgroundColor: studio.bg },
  name: { fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4, color: studio.text, marginTop: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  motto: { ...studioType.body, fontSize: 17, lineHeight: 23, fontWeight: '700', color: studio.text, marginTop: 4 },
  buttons: { flexDirection: 'row', gap: 10 },
});
