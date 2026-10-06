/**
 * Motion primitives.
 *
 * Measuring the reference reels against the first cut showed the gap was never
 * which properties were animated — it was how. Ours snapped into place in three
 * frames, travelled almost no distance, and left long stretches where nothing
 * changed at all. The rules that came out of that live here rather than in each
 * component, so a value can be tuned once:
 *
 *   - no entrance shorter than MOTION.minEntranceFrames (8); key reveals get 18-22
 *   - an entrance travels MOTION.travel (52px) or scales 0.82 -> 1, never a
 *     bare opacity fade at the final position
 *   - everything eases on a spring with a little overshoot, never linearly
 *   - grouped elements stagger by MOTION.staggerFrames so a row of chips reads
 *     as one gesture instead of a simultaneous blink
 *   - a completed state is held for MOTION.holdFrames before anything replaces it
 *   - something ambient is always moving, so the frame never fully stops
 */

import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MOTION } from "./brand";

type SpringConfig = { damping: number; stiffness: number; mass: number };

export interface EnterOptions {
  /** How long the whole move takes. Clamped to the 8-frame floor. */
  duration?: number;
  config?: SpringConfig;
  /** Index within a staggered group. */
  index?: number;
  stagger?: number;
}

/**
 * Spring progress for something entering at `at`.
 *
 * Returns 0 before the move starts and settles at 1, overshooting slightly on
 * the way — so a transform driven off it arrives, passes, and comes back.
 */
export function useEnter(at: number, opts: EnterOptions = {}): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const {
    duration = MOTION.revealFrames,
    config = MOTION.bounce,
    index = 0,
    stagger = MOTION.staggerFrames,
  } = opts;

  return spring({
    frame: frame - at - index * stagger,
    fps,
    config,
    durationInFrames: Math.max(MOTION.minEntranceFrames, duration),
  });
}

/** A key reveal: longer, softer, lands with weight. */
export function useReveal(at: number, opts: EnterOptions = {}): number {
  return useEnter(at, { duration: MOTION.keyRevealFrames, config: MOTION.settle, ...opts });
}

/**
 * Entrance transform from one progress value: travel plus a scale-up.
 *
 * `from` is where the element comes from, in px, as [x, y]. The default is a
 * rise from below, which is the one that reads best at reel size.
 */
export function entrance(
  p: number,
  from: [number, number] = [0, MOTION.travel],
  scaleFrom = 0.86
): string {
  const x = interpolate(p, [0, 1], [from[0], 0]);
  const y = interpolate(p, [0, 1], [from[1], 0]);
  const s = interpolate(p, [0, 1], [scaleFrom, 1]);
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)})`;
}

/** Opacity that is done well before the movement is, so nothing ghosts in. */
export function fadeIn(p: number): number {
  return interpolate(p, [0, 0.45], [0, 1], { extrapolateRight: "clamp" });
}

/**
 * A number counting up to its value, rather than appearing at it.
 *
 * Counts on a decelerating curve so the last few digits land slowly, which is
 * what makes it read as a number settling instead of a spinner stopping.
 */
export function countUp(p: number, to: number, decimals = 0): string {
  const eased = 1 - (1 - Math.min(1, Math.max(0, p))) ** 3;
  return (to * eased).toFixed(decimals);
}

/**
 * Continuous ambient motion: a slow, seamless oscillation.
 *
 * Every element that has nothing scheduled still drifts on one of these, which
 * is what keeps the static-frame share down between beats. `phase` separates
 * neighbours so a group never breathes in unison.
 */
export function idle(frame: number, periodInFrames: number, phase = 0): number {
  return Math.sin((frame / periodInFrames) * Math.PI * 2 + phase);
}

/** The same thing as a hook, for a component that is not inside a loop. */
export function useIdle(periodInFrames: number, phase = 0): number {
  return idle(useCurrentFrame(), periodInFrames, phase);
}

/**
 * Progress through a timed beat, with a held tail.
 *
 * Returns `enter` (0 -> 1 as it arrives), `exit` (0 -> 1 as it leaves) and
 * `visible`. The exit begins only after the completed state has been held, and
 * overlaps the next beat's entrance so the frame never comes to a stop.
 */
export function beat(
  frame: number,
  from: number,
  durationInFrames: number,
  enterFrames: number = MOTION.revealFrames,
  exitFrames: number = MOTION.exitFrames
): { enter: number; exit: number; visible: boolean } {
  const t = frame - from;
  const enter = interpolate(t, [0, Math.max(MOTION.minEntranceFrames, enterFrames)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitStart = Math.max(
    from + enterFrames + MOTION.holdFrames,
    from + durationInFrames - exitFrames
  );
  const exit = interpolate(frame, [exitStart, exitStart + exitFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { enter, exit, visible: t >= 0 && exit < 1 };
}
