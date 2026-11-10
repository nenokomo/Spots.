export const colors = {
  background: '#100b15',
  /** Raised surface for cards and sheets. */
  surfaceRaised: '#1c1522',
  /** Tertiary text: hints, timestamps, footnotes. */
  faint: '#a993ae',
  accentSoft: '#c922ab1f',
  accentLine: '#c922ab59',
  danger: '#ff6b8a',
  gradient: ['#120d1c', '#281326', '#3d1a32'] as const,
  panelGradient: ['#211329', '#3a1b32'] as const,
  accent: '#c922ab',
  pink: '#ff4ab8',
  text: '#fff6ff',
  muted: '#d4bcd8',
  border: '#ffffff18',
  surface: '#25172d',
};

/** 4-pt spacing scale. Use these instead of ad-hoc paddings. */
export const space = { xxs: 4, xs: 6, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

/** Type scale shared by all screens. */
export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.6 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 14, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '400' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
} as const;

export const categories = ['Alle', 'Techno', 'House', 'Events', 'Clubs'] as const;
export type Category = (typeof categories)[number];

export const brandHeadingStyle = {
  color: '#b58ca9',
  fontSize: 11,
  fontWeight: '800',
  letterSpacing: 2.4,
  textTransform: 'uppercase',
} as const;

export const brandDotStyle = {
  color: colors.accent,
  fontSize: 11,
  fontWeight: '800',
} as const;
