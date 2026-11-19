import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { colors, gutter, space, type } from '../constants/theme';
import type { PublicOrganizer, PublicOrganizerPost } from '../types/accounts';
import { OrganizerAvatar } from './GalleryPost';
import { Icon } from './Icon';

export type OrganizerPostItem = { post: PublicOrganizerPost; images: ImageSourcePropType[] };

const postDate = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'long' });
/** Instagram posts are 4:5. */
const POST_RATIO = 5 / 4;
const PREVIEW = 3;

/**
 * One post like in the Instagram feed, directly on the page: author line, the pictures edge to edge
 * (swipe sideways, counter and dots), caption „Name Text“ with „mehr“, date. Text-only posts show their
 * text large on a calm dark field. No likes, comments or followers (Spots is no social network).
 */
function FeedPost({ item, organizer, width }: { item: OrganizerPostItem; organizer: PublicOrganizer; width: number }) {
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const { post, images } = item;
  return (
    <View>
      <View style={styles.head}>
        <OrganizerAvatar organizer={organizer} size={34} />
        <View style={styles.headCopy}>
          <Text numberOfLines={1} style={styles.name}>{organizer.displayName}</Text>
          <Text style={styles.date}>{postDate.format(new Date(post.createdAt))}</Text>
        </View>
      </View>
      {images.length > 0
        ? <View>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces={false}
              onMomentumScrollEnd={({ nativeEvent }) => setPage(Math.round(nativeEvent.contentOffset.x / width))}>
              {images.map((source, index) => <Image key={index} source={source} resizeMode="cover" style={{ width, height: width * POST_RATIO, backgroundColor: colors.surface }} accessibilityLabel={`Bild ${index + 1} von ${images.length}`} />)}
            </ScrollView>
            {images.length > 1 && <View style={styles.counter}><Text style={styles.counterText}>{page + 1}/{images.length}</Text></View>}
          </View>
        : <View style={[styles.textPost, { width }]}>
            <Text style={styles.quote}>“</Text>
            <Text style={styles.textPostText}>{post.body}</Text>
          </View>}
      {images.length > 1 && <View style={styles.dots}>{images.map((_, index) => <View key={index} style={[styles.dot, index === page && styles.dotActive]} />)}</View>}
      {images.length > 0 && post.body.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel={open ? 'Text einklappen' : 'Ganzen Text anzeigen'} onPress={() => setOpen((value) => !value)} style={styles.foot}>
        <Text numberOfLines={open ? undefined : 2} style={styles.caption}><Text style={styles.captionName}>{organizer.displayName} </Text>{post.body}</Text>
        {!open && post.body.length > 90 && <Text style={styles.captionMore}>mehr</Text>}
      </Pressable>}
    </View>
  );
}

/** The organizer's posts directly on the page, newest first; after three, the rest unfolds on request. */
export function OrganizerPostList({ items, organizer }: { items: OrganizerPostItem[]; organizer: PublicOrganizer }) {
  const { width } = useWindowDimensions();
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, PREVIEW);
  return (
    <View style={styles.list}>
      {shown.map((item) => <FeedPost key={item.post.id} item={item} organizer={organizer} width={width} />)}
      {items.length > PREVIEW && <Pressable accessibilityRole="button" onPress={() => setAll((value) => !value)} style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
        <Text style={styles.moreText}>{all ? 'Weniger anzeigen' : 'Alle Beiträge anzeigen'}</Text>
        <Icon name="down" size={14} color={colors.muted} />
      </Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.xxl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: gutter, paddingBottom: space.md },
  headCopy: { flex: 1, minWidth: 0 },
  name: { ...type.label, fontSize: 15, color: colors.text },
  date: { ...type.footnote, fontSize: 12, color: colors.faint, marginTop: 1 },
  counter: { position: 'absolute', top: space.md, right: space.md, paddingHorizontal: 9, height: 24, justifyContent: 'center', borderRadius: 12, backgroundColor: '#0a090cb3' },
  counterText: { ...type.footnote, fontSize: 12, fontWeight: '600', color: colors.text },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: space.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff40' },
  dotActive: { backgroundColor: colors.pink },
  textPost: { paddingHorizontal: gutter, paddingVertical: space.xxl, gap: space.xs, backgroundColor: colors.surface },
  quote: { fontSize: 52, lineHeight: 56, fontWeight: '800', color: colors.pink },
  textPostText: { fontSize: 21, lineHeight: 29, fontWeight: '700', color: colors.text },
  foot: { paddingHorizontal: gutter, paddingTop: space.md },
  caption: { ...type.callout, lineHeight: 21, color: colors.text },
  captionName: { fontWeight: '700' },
  captionMore: { ...type.callout, color: colors.faint, marginTop: 2 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, height: 44, marginHorizontal: gutter, borderRadius: 22, borderWidth: 1, borderColor: '#ffffff1f' },
  moreText: { ...type.label, fontSize: 14, color: colors.muted },
  pressed: { opacity: 0.85 },
});
