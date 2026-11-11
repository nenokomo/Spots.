import { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { colors, radius, space, squircle, type } from '../constants/theme';
import { TEST_POST_IMAGES } from '../services/testEvents';
import type { PublicOrganizer, PublicOrganizerPost } from '../types/accounts';
import { Icon } from './Icon';

const postDate = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'long' });

export function initials(name: string) {
  return name.split(/\s+/).filter((part) => /^\p{L}/u.test(part)).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('de')).join('') || 'S';
}

/** Resolve a post image path: local test photo, or a remote URL. */
function source(path: string): ImageSourcePropType | null {
  if (path in TEST_POST_IMAGES) return TEST_POST_IMAGES[path];
  return /^https:\/\//.test(path) ? { uri: path } : null;
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

/**
 * Instagram-style post: header with author, a swipeable square gallery with
 * page dots, then the caption. Text-only posts render without the gallery.
 */
export function GalleryPost({ post, organizer, width }: { post: PublicOrganizerPost; organizer: PublicOrganizer; width: number }) {
  const [page, setPage] = useState(0);
  const images = post.images.map(source).filter((item): item is ImageSourcePropType => item !== null);
  return (
    <View style={styles.post}>
      <View style={styles.header}>
        <OrganizerAvatar organizer={organizer} size={34} />
        <View style={styles.headerCopy}><Text numberOfLines={1} style={styles.author}>{organizer.displayName}</Text><Text style={styles.date}>{postDate.format(new Date(post.createdAt))}</Text></View>
      </View>
      {images.length > 0 && (
        <View>
          <FlatList
            horizontal
            pagingEnabled
            data={images}
            keyExtractor={(_, index) => String(index)}
            renderItem={({ item, index }) => <Image source={item} resizeMode="cover" style={{ width, height: width }} accessibilityLabel={`Bild ${index + 1} von ${images.length}`} />}
            onMomentumScrollEnd={({ nativeEvent }) => setPage(Math.round(nativeEvent.contentOffset.x / width))}
            showsHorizontalScrollIndicator={false}
            bounces={false}
          />
          {images.length > 1 && <>
            <View style={styles.counter}><Text style={styles.counterText}>{page + 1}/{images.length}</Text></View>
            <View style={styles.dots}>{images.map((_, index) => <View key={index} style={[styles.dot, index === page && styles.dotActive]} />)}</View>
          </>}
        </View>
      )}
      <View style={styles.caption}>
        {images.length === 0 && <Icon name="wave" size={16} color={colors.pink} />}
        <Text style={styles.captionText}><Text style={styles.captionAuthor}>{organizer.displayName} </Text>{post.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh },
  initials: { fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  post: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#ffffff08', ...squircle },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm },
  headerCopy: { flex: 1, minWidth: 0 },
  author: { ...type.label, fontSize: 14, color: colors.text },
  date: { ...type.footnote, fontSize: 11, color: colors.faint },
  counter: { position: 'absolute', top: space.md, right: space.md, paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: '#100b15b3' },
  counterText: { ...type.footnote, fontSize: 11, fontWeight: '700', color: colors.text },
  dots: { position: 'absolute', bottom: space.md, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff66' },
  dotActive: { backgroundColor: colors.text },
  caption: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.md },
  captionText: { ...type.callout, color: colors.text, flex: 1 },
  captionAuthor: { fontWeight: '700' },
});
