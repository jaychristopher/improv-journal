import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";

// Pre-load fonts so they render in still-frame thumbnails too.
loadInter("normal", { weights: ["400", "600", "700"] });
loadPlayfair("normal", { weights: ["400", "700", "900"] });
loadPlayfair("italic", { weights: ["400", "700"] });
