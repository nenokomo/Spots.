import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { colors } from '../constants/theme';
import { TEST_POST_IMAGES } from '../services/testEvents';
import type { PublicOrganizer, PublicOrganizerPost } from '../types/accounts';

export function initials(name: string) {
  return name.split(/\s+/).filter((part) => /^\p{L}/u.test(part)).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('de')).join('') || 'S';
}

/** Images of a post that can be shown: local test photos or remote https URLs. */
export function postImages(post: PublicOrganizerPost): ImageSourcePropType[] {
  return post.images.map((path): ImageSourcePropType | null => {
    if (path in TEST_POST_IMAGES) return TEST_POST_IMAGES[path];
    return /^https:\/\//.test(path) ? { uri: path } : null;
  }).filter((item): item is ImageSourcePropType => item !== null);
}

export function OrganizerAvatar({ organizer, size, square = false }: { organizer: PublicOrganizer; size: number; square?: boolean }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: square ? size * 0.28 : size / 2 }]}>
      {organizer.avatarUrl
        ? <Image source={{ uri: organizer.avatarUrl }} style={StyleSheet.absoluteFill} accessibilityLabel={`Logo von ${organizer.displayName}`} />
        : <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials(organizer.displayName)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh },
  initials: { fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
});
