import type { TextStyle } from 'react-native';

/**
 * Spots Studio – Oberfläche für Veranstalter. Bewusst eigener Look („Backstage“), getrennt von der Besucher-App:
 * Graphit statt Glas, Neon-Lime für Aktionen, Spots-Pink nur als Markenzeichen. Noyans theme.ts bleibt unberührt.
 */
export const studio = {
  bg: '#0e0f13',
  panel: '#17181e',
  panelHigh: '#20212a',
  line: '#2b2c36',
  text: '#f5f5f7',
  muted: '#a3a3b0',
  faint: '#6f6f7c',
  lime: '#d4ff3a',
  limeInk: '#11140a',
  limeSoft: '#d4ff3a1f',
  pink: '#ff4ab8',
  amber: '#ffb547',
  amberSoft: '#ffb5471f',
  red: '#ff6b6b',
  redSoft: '#ff6b6b1f',
  green: '#45e0a0',
  greenSoft: '#45e0a01f',
  radius: 14,
  radiusSmall: 10,
  gap: 16,
  page: 20,
} as const;

export const studioType = {
  mark: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 2.4 } satisfies TextStyle,
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 } satisfies TextStyle,
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' } satisfies TextStyle,
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' } satisfies TextStyle,
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400' } satisfies TextStyle,
  label: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' } satisfies TextStyle,
  number: { fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] } satisfies TextStyle,
} as const;
