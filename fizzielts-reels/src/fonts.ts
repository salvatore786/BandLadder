/**
 * Font loading. Import the families from here, never call loadFont elsewhere —
 * each call registers @font-face rules and the render waits on all of them.
 */

import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";

// Instrument Serif ships 400 only; the italic is a separate style.
const serifRoman = loadInstrumentSerif("normal", { weights: ["400"], subsets: ["latin"] });
loadInstrumentSerif("italic", { weights: ["400"], subsets: ["latin"] });

const poppins = loadPoppins("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
const plexMono = loadPlexMono("normal", { weights: ["400", "500"], subsets: ["latin"] });
const caveat = loadCaveat("normal", { weights: ["400", "700"], subsets: ["latin"] });

export const FONT = {
  /** Headlines. Use fontStyle: "italic" for the emphasis phrase. */
  serif: serifRoman.fontFamily,
  /** Body text, option labels, chart labels. */
  sans: poppins.fontFamily,
  /** Eyebrow labels and footers — uppercase, wide tracking. */
  mono: plexMono.fontFamily,
  /** Handwritten annotations over charts and maps. */
  hand: caveat.fontFamily,
} as const;
