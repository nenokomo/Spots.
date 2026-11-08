import type { ImageSourcePropType } from 'react-native';

export type OrganizerPost = {
  id: string;
  organizerId: string;
  image: ImageSourcePropType;
  caption: string;
  isDemo: boolean;
};

const previews = [
  { image: require('../../assets/events/nightlife.jpg'), caption: 'Licht & Atmosphäre. Symbolfoto zur Vorschau eines Spots-Beitrags.' },
  { image: require('../../assets/events/club.jpg'), caption: 'Auf dem Dancefloor. Dieses Symbolfoto zeigt kein Event dieses Veranstalters.' },
  { image: require('../../assets/events/today-hero-dj.png'), caption: 'Hinter den Decks. Eine Beitragsvorschau mit Symbolfoto und Beschreibung.' },
];

export function getDemoOrganizerPosts(organizerId: string): OrganizerPost[] {
  return previews.map((post, index) => ({ ...post, id: `${organizerId}-preview-${index + 1}`, organizerId, isDemo: true }));
}
