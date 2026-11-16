import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '../constants/theme';
import type { ExploreOrganizer } from '../services/organizerStories';
import { eventDayLabel, eventTimeLabel } from '../utils/events';
import { organizerCover } from '../utils/stories';
import { Icon } from './Icon';
import { PressableScale } from './ui/PressableScale';

type Props = { organizer: ExploreOrganizer; today: string; onOpen: () => void };

/**
 * Explore directory: one organizer as a tall story tile (like StoryTile for events).
 * Cover: newest story picture, else the logo, else just the name. Basic layout – design open for Noyan.
 */
export function OrganizerStoryTile({ organizer, today, onOpen }: Props) {
  const cover = organizerCover(organizer);
  const next = organizer.nextEvent;
  const when = next ? `${eventDayLabel(next.startsAt, today)} · ${eventTimeLabel(next.startsAt)}` : 'Veranstalter';
  return (
    <PressableScale accessibilityRole="button"
      accessibilityLabel={`${organizer.displayName}${organizer.city ? `, ${organizer.city}` : ''}${next ? `, nächstes Event ${when} Uhr` : ''}, Story öffnen`}
      onPress={onOpen} style={styles.tile}>
      {cover && !cover.logo && <Image source={{ uri: cover.uri }} resizeMode="cover" style={styles.cover} accessibilityLabel={`Story von ${organizer.displayName}`} />}
      {cover?.logo && <View style={[styles.cover, styles.logoWrap]}>
        <Image source={{ uri: cover.uri }} resizeMode="cover" blurRadius={24} style={styles.cover} />
        <Image source={{ uri: cover.uri }} resizeMode="cover" style={styles.logo} accessibilityLabel={`Logo von ${organizer.displayName}`} />
      </View>}
      {!cover && <View style={[styles.cover, styles.logoWrap]}>
        <LinearGradient colors={colors.accentFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cover, styles.soft]} />
        <Text style={styles.initial}>{organizer.displayName.replace(/^TEST · /, '').trim().charAt(0).toLocaleUpperCase('de')}</Text>
      </View>}
      <LinearGradient pointerEvents="none" colors={['#0a090c00', '#0a090c00', '#0a090ce0', '#0a090cfc']} locations={[0, 0.34, 0.68, 1]} style={styles.cover} />
      {organizer.story.length > 0 && <View style={styles.ring} pointerEvents="none" />}
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.when}>{when}</Text>
        <Text numberOfLines={2} style={styles.title}>{organizer.displayName}</Text>
        {organizer.city && <View style={styles.meta}><Icon name="pin" size={12} color={colors.muted} /><Text numberOfLines={1} style={styles.metaText}>{organizer.city}</Text></View>}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, aspectRatio: 0.62, overflow: 'hidden', borderRadius: 8, backgroundColor: colors.surface, justifyContent: 'flex-end' },
  cover: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  logoWrap: { alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  logo: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: '#ffffff33' },
  soft: { opacity: 0.45 },
  initial: { color: colors.text, fontSize: 44, fontWeight: '800' },
  // Thin accent frame: this organizer has a story.
  ring: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, borderWidth: 2, borderColor: colors.pink },
  content: { padding: space.md, gap: 3 },
  when: { ...type.overline, fontSize: 11, color: colors.pink },
  title: { ...type.label, fontWeight: '700', color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...type.footnote, fontSize: 12, color: colors.muted, flexShrink: 1 },
});
