/**
 * fizzIELTS brand system — the single source of truth.
 *
 * No hex value, font name, or layout constant belongs anywhere else in the
 * project. Components import from here so a brand change is a one-file change.
 */

// ── Colour ───────────────────────────────────────────────────────────────────
export const COLOR = {
  cream: "#FBFAF6", // page background
  ink: "#1D1A3A", // headlines, primary text
  deep: "#124369", // eyebrow labels, CTA lines
  blue: "#1F6FB2", // Listening accent
  purple: "#534AB7", // Writing accent
  teal: "#0D9488", // Speaking accent
  coral: "#F0654A", // Vocabulary accent / "trap" callouts
  muted: "#6B678A", // secondary text
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

// ── Layout ───────────────────────────────────────────────────────────────────
export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

export const LAYOUT = {
  margin: 82,
  get contentWidth() {
    return VIDEO.width - LAYOUT.margin * 2;
  },
  cardRadius: 18,
  cardBorder: 2,
  /** Accent stroke across the top edge of a card — top edge only. */
  cardAccentStroke: 4,
  rule: 2, // the ink rule under an eyebrow label
  footerHeight: 74,
} as const;

// ── Type scale ───────────────────────────────────────────────────────────────
export const TYPE = {
  eyebrow: { size: 22, tracking: 7 },
  headline: { size: 78, lineHeight: 1.06 },
  subhead: { size: 40, lineHeight: 1.2 },
  handwritten: { size: 42 },
  body: { size: 30, lineHeight: 1.45 },
  label: { size: 26 },
  small: { size: 22 },
  footer: { size: 20, tracking: 3 },
  caption: { size: 44 },
} as const;

// ── Motion ───────────────────────────────────────────────────────────────────
export const MOTION = {
  /**
   * Reach is decided by the 3-second skip rate, so frames 0-60 must carry real
   * motion. Nothing in this window is allowed to be a held static frame.
   */
  hookFrames: 60,
  snap: { damping: 14, stiffness: 260, mass: 0.5 },
  settle: { damping: 200, stiffness: 120, mass: 1 },
} as const;

// ── Shadows ──────────────────────────────────────────────────────────────────
export const SHADOW = {
  card: "0 10px 34px rgba(29, 26, 58, 0.07)",
  raised: "0 16px 44px rgba(29, 26, 58, 0.12)",
  bubble: "0 14px 34px rgba(29, 26, 58, 0.28)",
} as const;

// ── Derived tints ────────────────────────────────────────────────────────────
/** Translate a brand hex into an rgba() tint. Keeps derived colours honest. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export const TINT = {
  /** Behind the phrases that earn the band score. */
  scoring: alpha(COLOR.blue, 0.14),
  chipFill: alpha(COLOR.ink, 0.03),
} as const;
