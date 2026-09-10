/**
 * Font loading. Import the families from here, never call loadFont elsewhere —
 * each call registers @font-face rules and the render waits on all of them.
 *
 * Headlines are a rounded, chunky sans rather than a serif: this is a friendly
 * teaching brand, not an editorial one. Swap `display` to Nunito or Poppins
 * here if Fredoka ever reads too playful.
 */

import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";

const fredoka = loadFredoka("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
const poppins = loadPoppins("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });
const plexMono = loadPlexMono("normal", { weights: ["400", "500"], subsets: ["latin"] });
const caveat = loadCaveat("normal", { weights: ["400", "700"], subsets: ["latin"] });

export const FONT = {
  /** Headlines — large, chunky, confident. */
  display: fredoka.fontFamily,
  /** Body text, option labels, chart labels. */
  sans: poppins.fontFamily,
  /** Small uppercase labels and the footer. */
  mono: plexMono.fontFamily,
  /** Handwritten annotations over charts and maps. */
  hand: caveat.fontFamily,
} as const;
