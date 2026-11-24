import type { TextStyle } from 'react-native';
import { colors } from '../../constants/theme';

/**
 * Spots Studio – Oberfläche für Veranstalter, Teil der Spots-Familie (Design Noyan, 19.11.):
 * derselbe fast schwarze Hintergrund und dasselbe Rosa wie die Besucher-App, Aktionen im Orchidee-Verlauf.
 * Erkennungszeichen von Studio ist das „STUDIO“-Abzeichen. Status: Entwurf grau, In Prüfung gelb, Live rosa, Abgesagt rot.
 */
export const studio = {
  bg: colors.background,
  panel: '#ffffff0a',
  panelHigh: '#ffffff14',
  line: '#ffffff14',
  text: colors.text,
  muted: colors.muted,
  faint: colors.faint,
  accent: colors.pink,
  /** Text und Symbole auf gefüllten Aktionen (Orchidee-Verlauf). */
  onAccent: colors.text,
  accentSoft: colors.accentSoft,
  accentLine: colors.accentLine,
  accentFill: colors.accentFill,
  pink: colors.pink,
  amber: '#ffc24d',
  amberSoft: '#ffc24d1f',
  red: '#ff6b6b',
  redSoft: '#ff6b6b1f',
  green: '#45e0a0',
  greenSoft: '#45e0a01f',
  radius: 20,
  radiusSmall: 14,
  gap: 16,
  page: 20,
} as const;

export const studioType = {
  mark: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 2 } satisfies TextStyle,
  title: { fontSize: 32, lineHeight: 37, fontWeight: '800', letterSpacing: -0.6 } satisfies TextStyle,
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2 } satisfies TextStyle,
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' } satisfies TextStyle,
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400' } satisfies TextStyle,
  label: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' } satisfies TextStyle,
  number: { fontSize: 32, lineHeight: 36, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] } satisfies TextStyle,
} as const;
