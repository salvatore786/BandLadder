import { loadFont } from "@remotion/google-fonts/Poppins";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";

const { fontFamily } = loadFont();
const { fontFamily: playfairFamily } = loadPlayfair();
const { fontFamily: bangersFamily } = loadBangers();

export { fontFamily, playfairFamily, bangersFamily };
