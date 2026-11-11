/**
 * Spots design language (experiment/redesign).
 *
 * Principles: one accent, large confident type, generous space, hairlines
 * instead of boxes, content (event imagery) first.
 * The canvas is the original Spots night gradient (deep violet to plum);
 * surfaces are tinted to sit on it. #c922ab stays the only accent.
 */
export const colors = {
  /** Brand. Fills, primary buttons, live state. */
  accent: '#c922ab',
  /** Brighter tint of the brand colour for text and icons on black (contrast ≥ 5:1). */
  pink: '#ff4ab8',
  accentSoft: '#c922ab29',
  accentLine: '#c922ab73',

  background: '#100b15',
  /** Grouped lists, cards, sheets. */
  surface: '#221629',
  surfaceRaised: '#1c1522',
  /** Controls on top of a surface. */
  surfaceHigh: '#33233b',
  /** Translucent fill for search fields and quiet buttons. */
  fill: '#ffffff12',
  /** Translucent material for floating controls over the map or images. */
  material: '#261b30eb',

  text: '#fff6ff',
  /** Secondary label. */
  muted: '#d4bcd8',
  /** Tertiary label. */
  faint: '#a993ae',
  border: '#ffffff18',
  separator: '#ffffff1f',
  danger: '#ff453a',

  /** Screen canvas, left to right. */
  gradient: ['#120d1c', '#281326', '#3d1a32'] as const,
  /** Raised panels such as the radar list. */
  panelGradient: ['#211329', '#3a1b32'] as const,
};

/** 4-pt spacing scale. */
export const space = { xxs: 4, xs: 6, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

/** Corner radii; combine with `borderCurve: 'continuous'` (see `squircle`). */
export const radius = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 } as const;

/** Continuous corners on iOS, ignored elsewhere. */
export const squircle = { borderCurve: 'continuous' } as const;

/** Page gutter. */
export const gutter = 20;

/** Type scale modelled on the iOS text styles. */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.9 },
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.9 },
  title: { fontSize: 28, lineHeight: 33, fontWeight: '800', letterSpacing: -0.7 },
  title2: { fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: -0.5 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.4 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400', letterSpacing: -0.2 },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.2 },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.1 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.1 },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
} as const;

export const categories = ['Alle', 'Techno', 'House', 'Events', 'Clubs'] as const;
export type Category = (typeof categories)[number];

export const brandHeadingStyle = { ...type.overline, color: colors.faint } as const;
export const brandDotStyle = { color: colors.accent, fontWeight: '800' } as const;
