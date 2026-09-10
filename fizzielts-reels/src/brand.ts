/**
 * fizzIELTS brand system — the single source of truth.
 *
 * No hex value, font name, or layout constant belongs anywhere else in the
 * project. Components import from here so a brand change is a one-file change.
 */

// ── Core palette ─────────────────────────────────────────────────────────────
export const COLOR = {
  cream: "#FBFAF6", // page base
  ink: "#161233", // headlines — darkened for phone-screen contrast
  body: "#2E2950", // body copy; the old muted grey was unreadable at reel size
  deep: "#124369", // eyebrow labels, CTA lines
  blue: "#1F6FB2", // Listening accent
  purple: "#534AB7", // Writing accent
  teal: "#0D9488", // Speaking accent
  coral: "#F0654A", // Vocabulary accent / "trap" callouts
  muted: "#6B678A", // small labels only, never body copy
  lavender: "#DDD9F0", // dividers
  border: "#E8E6F2", // card borders
  white: "#FFFFFF", // cards
} as const;

/** Every reel belongs to one module, and the module picks the accent. */
export const MODULE_ACCENT = {
  listening: COLOR.blue,
  writing: COLOR.purple,
  speaking: COLOR.teal,
  vocabulary: COLOR.coral,
} as const;

export type ModuleName = keyof typeof MODULE_ACCENT;

/**
 * Full-strength content colours. Each answer, category or series takes its own
 * hue from here — never a tint of one colour, which is what made the first cut
 * read as a wireframe.
 */
export const VIVID = {
  green: "#0E9F6E",
  purple: "#7C3AED",
  blue: "#2563EB",
  orange: "#F97316",
  pink: "#EC4899",
  teal: "#0D9488",
  amber: "#F0A020",
  red: "#E23D3D",
} as const;

/** Assigned in order when content does not name its own colour. */
export const VIVID_CYCLE = [
  VIVID.green,
  VIVID.purple,
  VIVID.blue,
  VIVID.orange,
  VIVID.pink,
  VIVID.teal,
] as const;

// ── Page ground ──────────────────────────────────────────────────────────────
/** Apricot into cream. Warm before a single word has been read. */
export const PAGE_GRADIENT = "linear-gradient(168deg, #FFE9D2 0%, #FDF3E7 42%, #FBFAF6 100%)";

/** Blurred blobs behind everything. Meant to be seen, not sensed. */
export const BLOBS = [
  { color: "#8FD0EA", x: -0.18, y: -0.08, w: 0.72, h: 0.34, opacity: 0.5 }, // soft blue
  { color: "#9BE3BE", x: 0.62, y: 0.06, w: 0.62, h: 0.3, opacity: 0.46 }, // mint
  { color: "#FFD68A", x: 0.55, y: 0.52, w: 0.7, h: 0.32, opacity: 0.5 }, // warm yellow
  { color: "#F7B6C9", x: -0.22, y: 0.62, w: 0.66, h: 0.32, opacity: 0.46 }, // dusty pink
  { color: "#FFC49B", x: 0.18, y: 0.88, w: 0.78, h: 0.28, opacity: 0.42 }, // apricot
] as const;

/** Warm band the title sits on, rather than floating on the page. */
export const HEADER_BAND = "linear-gradient(180deg, #FFF1DF 0%, #FFE7CC 100%)";

// ── Layout ───────────────────────────────────────────────────────────────────
export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

export const LAYOUT = {
  margin: 82,
  get contentWidth() {
    return VIDEO.width - LAYOUT.margin * 2;
  },
  cardRadius: 24,
  cardBorder: 2,
  /** Accent stroke across the top edge of a card — top edge only. */
  cardAccentStroke: 5,
  rule: 3,
  footerHeight: 74,
  shapeRadius: 14, // filled map rooms, chips, bars
} as const;

// ── Type scale ───────────────────────────────────────────────────────────────
export const TYPE = {
  eyebrow: { size: 23, tracking: 7 },
  headline: { size: 68, lineHeight: 1.1 },
  subhead: { size: 42, lineHeight: 1.2 },
  handwritten: { size: 46 },
  body: { size: 34, lineHeight: 1.42 },
  label: { size: 30 },
  small: { size: 25 },
  footer: { size: 20, tracking: 3 },
  caption: { size: 48 },
} as const;

// ── Motion ───────────────────────────────────────────────────────────────────
export const MOTION = {
  /**
   * Reach is decided by the 3-second skip rate, so frames 0-60 must carry real
   * motion. Nothing in this window is allowed to be a held static frame.
   */
  hookFrames: 60,
  /** Entrances overshoot then settle. Nothing completes in under 8 frames. */
  minEntranceFrames: 8,
  revealFrames: 18,
  staggerFrames: 3,
  /** Slide distance for an entrance — a fade in place does not read as motion. */
  travel: 52,
  snap: { damping: 12, stiffness: 170, mass: 0.7 },
  settle: { damping: 16, stiffness: 110, mass: 0.9 },
  gentle: { damping: 22, stiffness: 70, mass: 1 },
} as const;

// ── Shadows ──────────────────────────────────────────────────────────────────
export const SHADOW = {
  card: "0 14px 40px rgba(22, 18, 51, 0.10)",
  shape: "0 6px 16px rgba(22, 18, 51, 0.13)",
  raised: "0 18px 48px rgba(22, 18, 51, 0.16)",
  bubble: "0 16px 38px rgba(22, 18, 51, 0.34)",
} as const;

// ── Derived tints ────────────────────────────────────────────────────────────
/** Translate a brand hex into an rgba() tint. Keeps derived colours honest. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Mix a hex toward white — used for the earlier year in a paired bar. */
export function lighten(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

export const TINT = {
  /** Behind the phrases that earn the band score. */
  scoring: alpha(COLOR.blue, 0.18),
  chipFill: alpha(COLOR.ink, 0.04),
} as const;
