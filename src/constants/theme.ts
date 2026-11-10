/**
 * Spots design language (experiment/redesign).
 *
 * Principles: true black, one accent, large confident type, generous space,
 * hairlines instead of boxes, content (event imagery) first.
 * The palette follows the dark system palette of iOS so the app feels native;
 * the brand colour #c922ab is the only chromatic colour and is used sparingly.
 */
export const colors = {
  /** Brand. Fills, primary buttons, live state. */
  accent: '#c922ab',
  /** Brighter tint of the brand colour for text and icons on black (contrast ≥ 5:1). */
  pink: '#f055d1',
  accentSoft: '#c922ab29',
  accentLine: '#c922ab73',

  background: '#000000',
  /** Grouped lists, cards, sheets. */
  surface: '#1c1c1e',
  surfaceRaised: '#1c1c1e',
  /** Controls on top of a surface. */
  surfaceHigh: '#2c2c2e',
  /** Translucent fill for search fields and quiet buttons. */
  fill: '#7676803d',
  /** Translucent material for floating controls over the map or images. */
  material: '#1c1c1ed9',

  text: '#ffffff',
  /** Secondary label. */
  muted: '#ebebf599',
  /** Tertiary label. */
  faint: '#8e8e93',
  border: '#ffffff1f',
  separator: '#54545899',
  danger: '#ff453a',

  // Kept for components that still paint gradients; both are flat black now.
  gradient: ['#000000', '#000000', '#000000'] as const,
  panelGradient: ['#1c1c1e', '#1c1c1e'] as const,
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
