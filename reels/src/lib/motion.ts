import {interpolate, spring} from 'remotion';
import {noise2D} from '@remotion/noise';
import {MOTION, SPRINGS} from '../brand';

type SpringName = keyof typeof SPRINGS;

/**
 * Every animated value in this project derives from useCurrentFrame() through
 * these helpers. No CSS transitions, no Framer Motion, no rAF, no setTimeout —
 * Remotion seeks each frame in isolation and those would render as a freeze.
 */

/** A 0->1 entrance with overshoot. Never completes in fewer than 5 frames. */
export const enter = ({
  frame,
  fps,
  at,
  config = 'pop',
  durationInFrames,
}: {
  frame: number;
  fps: number;
  at: number;
  config?: SpringName;
  durationInFrames?: number;
}) =>
  spring({
    frame: frame - at,
    fps,
    config: SPRINGS[config],
    durationInFrames: Math.max(
      MOTION.minEntrance,
      durationInFrames ?? MOTION.keyReveal
    ),
  });

/** Entrance for item `index` of a list, cascading rather than appearing as a block. */
export const enterStaggered = ({
  frame,
  fps,
  at,
  index,
  stagger = MOTION.stagger,
  config = 'pop',
  durationInFrames,
}: {
  frame: number;
  fps: number;
  at: number;
  index: number;
  stagger?: number;
  config?: SpringName;
  durationInFrames?: number;
}) => enter({frame, fps, at: at + index * stagger, config, durationInFrames});

/** Exits accelerate away — faster than the entrance, and they travel. */
export const exit = ({
  frame,
  fps,
  at,
  durationInFrames = 10,
}: {
  frame: number;
  fps: number;
  at: number;
  durationInFrames?: number;
}) =>
  spring({
    frame: frame - at,
    fps,
    config: {damping: 200, stiffness: 220, mass: 0.6},
    durationInFrames,
  });

/**
 * Entrances must TRAVEL. Returns a transform that slides `travel` px along the
 * axis and scales 0.8 -> 1 with overshoot. A fade at the destination is not an
 * animation.
 */
export const travelIn = (
  progress: number,
  {
    axis = 'y',
    travel = MOTION.travel,
    from = 1,
    scaleFrom = 0.82,
  }: {axis?: 'x' | 'y'; travel?: number; from?: 1 | -1; scaleFrom?: number} = {}
) => {
  const offset = interpolate(progress, [0, 1], [travel * from, 0]);
  const scale = interpolate(progress, [0, 1], [scaleFrom, 1]);
  return {
    transform: `translate${axis.toUpperCase()}(${offset}px) scale(${scale})`,
    opacity: interpolate(progress, [0, 0.45], [0, 1], {
      extrapolateRight: 'clamp',
    }),
  };
};

/**
 * Continuous ambient drift. Seeded on frame through noise so it wanders
 * endlessly and never loops visibly. Something is always moving.
 */
export const drift = ({
  frame,
  seed,
  amplitude = 40,
  speed = 0.0055,
}: {
  frame: number;
  seed: string;
  amplitude?: number;
  speed?: number;
}) => ({
  x: noise2D(seed + '-x', frame * speed, 0) * amplitude,
  y: noise2D(seed + '-y', 0, frame * speed) * amplitude,
  scale: 1 + noise2D(seed + '-s', frame * speed * 0.7, 11) * 0.09,
  rotate: noise2D(seed + '-r', frame * speed * 0.5, 23) * 7,
});

/** The slow push-in applied across the whole composition. */
export const pushIn = (frame: number, durationInFrames: number) =>
  interpolate(frame, [0, durationInFrames], [1, MOTION.pushIn], {
    extrapolateRight: 'clamp',
  });

/** Numbers count up rather than appear. */
export const countUp = ({
  frame,
  fps,
  at,
  to,
  durationInFrames = 24,
}: {
  frame: number;
  fps: number;
  at: number;
  to: number;
  durationInFrames?: number;
}) => {
  const p = spring({
    frame: frame - at,
    fps,
    config: SPRINGS.sustain,
    durationInFrames,
  });
  return Math.round(interpolate(p, [0, 1], [0, to]));
};

/** True once a beat has started; used to hold completed states. */
export const isLive = (frame: number, at: number, until?: number) =>
  frame >= at && (until === undefined || frame < until);
