/**
 * Spots design language (experiment/redesign).
 *
 * Principles: one accent, large confident type, generous space, hairlines
 * instead of boxes, content (event imagery) first.
 * Calm and neutral in the manner of Apple's dark appearance: a near-black canvas with only
 * a trace of plum, grey surface steps, white type with grey secondary levels, hairlines.
 * Type and event imagery carry the screen. #c922ab stays the only accent.
 */
export const colors = {
  /** Brand. Fills, primary buttons, live state. */
  accent: '#c922ab',
  /** Brighter tint of the brand colour for text and icons on black (contrast ≥ 5:1). */
  pink: '#ff4ab8',
  accentSoft: '#c922ab29',
  accentLine: '#c922ab73',

  background: '#0a090c',
  /** Grouped lists, cards, sheets. */
  surface: '#1c1b1f',
  surfaceRaised: '#151417',
  /** Controls on top of a surface. */
  surfaceHigh: '#2c2b30',
  /** Translucent fill for search fields and quiet buttons. */
  fill: '#ffffff12',
  /** Translucent material for floating controls over the map or images. */
  material: '#1c1b1feb',

  text: '#ffffff',
  /** Secondary label. */
  muted: '#d6d4dc',
  /** Tertiary label. */
  faint: '#a5a3ad',
  border: '#ffffff17',
  separator: '#ffffff1a',
  danger: '#ff453a',

  /** Screen canvas, left to right. */
  gradient: ['#100e13', '#18111a', '#2a1222'] as const,
  /** Raised panels such as the radar list. */
  panelGradient: ['#18161c', '#251520'] as const,
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
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.4 },
  display: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.4 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400', letterSpacing: -0.2 },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.2 },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.1 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.1 },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
} as const;

export const categories = ['Alle', 'Techno', 'House', 'Events', 'Clubs'] as const;
export type Category = (typeof categories)[number];

export const brandHeadingStyle = { ...type.overline, color: colors.faint } as const;
export const brandDotStyle = { color: colors.accent, fontWeight: '800' } as const;
