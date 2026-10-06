import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

/**
 * The three.js background layer needs a WebGL-capable OpenGL renderer in the
 * headless Chromium that Remotion renders with.
 *
 * - Windows/macOS render boxes: "angle" (hardware accelerated where available).
 * - Linux/CI/servers without a GPU: "swangle" (software ANGLE) — "angle" fails
 *   on a headless box with no display.
 *
 * Override with REMOTION_GL, e.g. REMOTION_GL=angle-egl for a Linux GPU host.
 * Set three3d:false in the render props to skip WebGL entirely.
 */
type OpenGlRenderer = Parameters<typeof Config.setChromiumOpenGlRenderer>[0];

const glFromEnv = process.env.REMOTION_GL as OpenGlRenderer | undefined;
const defaultGl: OpenGlRenderer =
  process.platform === "linux" ? "swangle" : "angle";

Config.setChromiumOpenGlRenderer(glFromEnv ?? defaultGl);
