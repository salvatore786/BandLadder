/**
 * Single source of truth for every colour, font, size and layout constant.
 * Nothing else in src/ may contain a raw hex value.
 */

// ---------------------------------------------------------------- palettes

/** Map reel — white base with six clearly visible pastel blobs. */
export const MAP_PALETTE = {
  base: '#FFFFFF',
  baseLight: '#FFFFFF',
  blobs: {
    cyan: '#BDE4EA',
    peach: '#FBD7B6',
    blue: '#C0D2EE',
    lime: '#E1E5A2',
    green: '#D6EBBB',
    sage: '#CFD5CA',
  },
} as const;

/** Chart reel — warm cream base, apricot and teal blobs, deep purple data. */
export const CHART_PALETTE = {
  base: '#F0EAE1',
  baseLight: '#F9F5ED',
  blobs: {
    apricot: '#E8CCA4',
    teal: '#96B5B9',
    gold: '#DEB77E',
    greyBlue: '#BECFD1',
    apricotDeep: '#E8CCA4',
    tealSoft: '#96B5B9',
  },
  bars: '#61427D',
} as const;

/** Fully saturated marks. Each answer / category / step gets its own hue. */
export const ACCENTS = {
  green: '#2F8F5B',
  purple: '#61427D',
  blue: '#2C5FA8',
  orange: '#D4761F',
  teal: '#1E7F86',
  crimson: '#B33A42',
} as const;

/** Ordered hue cycle — index N of any list takes ACCENT_CYCLE[N % length]. */
export const ACCENT_CYCLE = [
  ACCENTS.green,
  ACCENTS.purple,
  ACCENTS.blue,
  ACCENTS.orange,
  ACCENTS.teal,
  ACCENTS.crimson,
] as const;

export const INK = {
  /** Primary text. Near-black with a warm cast so it sits on cream. */
  strong: '#1E1A24',
  body: '#3A3340',
  muted: '#6E6675',
  /** Dark tooltip bubbles over the map. */
  bubble: '#221D2A',
  bubbleText: '#FBF7F2',
  hairline: '#D9D0C6',
  white: '#FFFFFF',
  /** Handwritten annotations. */
  handwriting: '#D4761F',
  /** Pale tint behind scoring phrases in the model overview. */
  highlight: '#F3E2C8',
  shadow: 'rgba(30, 26, 36, 0.16)',
  softShadow: 'rgba(30, 26, 36, 0.09)',
} as const;

/** fizzIELTS footer lockup. */
export const BRAND = {
  fizz: '#1E1A24',
  ielts: '#61427D',
  handle: '@fizzielts',
  url: 'fizzielts.com',
} as const;

// ---------------------------------------------------------------- type

export const FONTS = {
  /** Bold, rounded, friendly sans for headlines. */
  display: 'Fredoka',
  /** Body / labels. */
  body: 'Poppins',
  /** Handwritten annotations. */
  hand: 'Caveat',
  /** Small eyebrow labels, uppercase, wide tracking. */
  mono: 'IBM Plex Mono',
} as const;

export const TYPE = {
  headline: {size: 76, weight: 600, lineHeight: 1.06, letterSpacing: -1.5},
  headlineSm: {size: 64, weight: 600, lineHeight: 1.08, letterSpacing: -1},
  subhead: {size: 44, weight: 500, lineHeight: 1.15, letterSpacing: -0.4},
  body: {size: 34, weight: 500, lineHeight: 1.35, letterSpacing: 0},
  bodySm: {size: 30, weight: 500, lineHeight: 1.3, letterSpacing: 0},
  label: {size: 30, weight: 600, lineHeight: 1.2, letterSpacing: 0},
  hand: {size: 52, weight: 600, lineHeight: 1.05, letterSpacing: 0},
  handSm: {size: 44, weight: 600, lineHeight: 1.05, letterSpacing: 0},
  eyebrow: {size: 24, weight: 500, lineHeight: 1.2, letterSpacing: 5},
  caption: {size: 46, weight: 600, lineHeight: 1.25, letterSpacing: -0.2},
  number: {size: 40, weight: 600, lineHeight: 1, letterSpacing: -0.5},
} as const;

// ---------------------------------------------------------------- layout

export const CANVAS = {width: 1080, height: 1920, fps: 30} as const;

export const LAYOUT = {
  gutter: 64,
  /** Safe area for Instagram / TikTok chrome. */
  safeTop: 96,
  safeBottom: 300,
  radius: {sm: 14, md: 24, lg: 34, xl: 48, pill: 999},
  /** Vertical bands of the frame. */
  headerTop: 130,
  headerHeight: 220,
  stageTop: 400,
  stageHeight: 900,
  panelTop: 1330,
  captionBottom: 200,
  footerBottom: 74,
} as const;

export const SHADOW = {
  card: `0 12px 34px ${INK.softShadow}`,
  raised: `0 18px 48px ${INK.shadow}`,
  chip: `0 6px 18px ${INK.softShadow}`,
} as const;

// ---------------------------------------------------------------- motion

/**
 * Motion constants. Every one of these is a FRAME count at 30fps —
 * all animation derives from useCurrentFrame(), never CSS or rAF.
 */
export const MOTION = {
  /** No entrance may be shorter than this. */
  minEntrance: 8,
  /** Key reveals. */
  keyReveal: 18,
  /** Stagger between grouped elements. */
  stagger: 3,
  /** Hold a completed state before the next beat. */
  hold: 18,
  /** Entrances must travel, never fade in place. */
  travel: 52,
  /** Slow push-in across the whole composition. */
  pushIn: 1.03,
} as const;

/** spring() configs — overshoot and settle, never linear. */
export const SPRINGS = {
  /** Default entrance: visible overshoot. */
  pop: {damping: 12, stiffness: 120, mass: 0.9},
  /** Softer settle for large objects. */
  glide: {damping: 16, stiffness: 90, mass: 1.1},
  /** Snappy, for words and small chips. */
  snap: {damping: 11, stiffness: 190, mass: 0.7},
  /** Long sustained move (>= 333ms) for key reveals. */
  sustain: {damping: 20, stiffness: 55, mass: 1.4},
} as const;
