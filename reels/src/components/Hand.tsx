import React, {useMemo} from 'react';
import rough from 'roughjs';
import {evolvePath} from '@remotion/paths';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {INK, FONTS, TYPE} from '../brand';
import {enter} from '../lib/motion';

const gen = rough.generator();

/** Turn a rough.js drawable into plain path strings, deterministically. */
const toPaths = (drawable: ReturnType<typeof gen.line>) =>
  gen.toPaths(drawable).map((p) => p.d);

/** A stroke that draws itself on via evolvePath — never just appears. */
const Stroke: React.FC<{
  d: string;
  progress: number;
  color?: string;
  width?: number;
  delay?: number;
}> = ({d, progress, color = INK.handwriting, width = 3.4, delay = 0}) => {
  const local = interpolate(progress, [delay, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const evolution = evolvePath(local, d);
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={evolution.strokeDasharray}
      strokeDashoffset={evolution.strokeDashoffset}
    />
  );
};

/** Hand-drawn arrow from an annotation to the thing it refers to. */
export const RoughArrow: React.FC<{
  from: {x: number; y: number};
  to: {x: number; y: number};
  progress: number;
  color?: string;
  seed?: number;
  /** Sideways bow of the curve, in px. */
  bow?: number;
}> = ({from, to, progress, color = INK.handwriting, seed = 11, bow = 46}) => {
  const paths = useMemo(() => {
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    // Bow perpendicular to the run so the arrow arcs like a drawn one.
    const cx = mx + (-dy / len) * bow;
    const cy = my + (dx / len) * bow;
    const shaft = toPaths(
      gen.curve(
        [
          [from.x, from.y],
          [cx, cy],
          [to.x, to.y],
        ],
        {seed, roughness: 1.15, stroke: color, strokeWidth: 3}
      )
    );
    // Arrowhead aimed along the tangent leaving the control point.
    const ax = to.x - cx;
    const ay = to.y - cy;
    const al = Math.max(1, Math.hypot(ax, ay));
    const ux = ax / al;
    const uy = ay / al;
    const head = 30;
    const wing = (rot: number) => {
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      return [
        to.x - (ux * c - uy * s) * head,
        to.y - (ux * s + uy * c) * head,
      ] as [number, number];
    };
    const [w1x, w1y] = wing(0.5);
    const [w2x, w2y] = wing(-0.5);
    const heads = [
      ...toPaths(
        gen.line(to.x, to.y, w1x, w1y, {seed: seed + 1, roughness: 1, strokeWidth: 3})
      ),
      ...toPaths(
        gen.line(to.x, to.y, w2x, w2y, {seed: seed + 2, roughness: 1, strokeWidth: 3})
      ),
    ];
    return {shaft, heads};
  }, [from.x, from.y, to.x, to.y, seed, bow, color]);

  return (
    <g>
      {paths.shaft.map((d, i) => (
        <Stroke key={`s${i}`} d={d} progress={progress} color={color} />
      ))}
      {paths.heads.map((d, i) => (
        // The head lands after the shaft has arrived.
        <Stroke key={`h${i}`} d={d} progress={progress} color={color} delay={0.72} />
      ))}
    </g>
  );
};

/** Hand-drawn ring around the value under discussion. */
export const RoughRing: React.FC<{
  box: {x: number; y: number; w: number; h: number};
  progress: number;
  color?: string;
  seed?: number;
}> = ({box, progress, color = INK.handwriting, seed = 5}) => {
  const paths = useMemo(
    () =>
      toPaths(
        gen.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w, box.h, {
          seed,
          roughness: 1.35,
          strokeWidth: 3.4,
          fill: undefined,
        })
      ),
    [box.x, box.y, box.w, box.h, seed]
  );
  return (
    <g>
      {paths.map((d, i) => (
        <Stroke key={i} d={d} progress={progress} color={color} delay={i * 0.18} />
      ))}
    </g>
  );
};

/** Hand-drawn underline beneath a phrase. */
export const RoughUnderline: React.FC<{
  x: number;
  y: number;
  width: number;
  progress: number;
  color?: string;
  seed?: number;
}> = ({x, y, width, progress, color = INK.handwriting, seed = 9}) => {
  const paths = useMemo(
    () =>
      toPaths(
        gen.line(x, y, x + width, y + 3, {seed, roughness: 1.6, strokeWidth: 4})
      ),
    [x, y, width, seed]
  );
  return (
    <g>
      {paths.map((d, i) => (
        <Stroke key={i} d={d} progress={progress} color={color} width={4} />
      ))}
    </g>
  );
};

/**
 * A Caveat aside in warm orange with its rough.js arrow / ring.
 * `at`, `pointsAt` and `ring` are normalised 0-1 stage coordinates.
 */
export const Annotation: React.FC<{
  text: string;
  startFrame: number;
  durationInFrames: number;
  at: {x: number; y: number};
  pointsAt?: {x: number; y: number};
  ring?: {x: number; y: number; w: number; h: number};
  stage: {width: number; height: number};
  seed?: number;
  fontSize?: number;
  place?: 'above' | 'below';
}> = ({
  text,
  startFrame,
  durationInFrames,
  at,
  pointsAt,
  ring,
  stage,
  seed = 13,
  fontSize = TYPE.hand.size,
  place = 'above',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < startFrame - 2 || frame > startFrame + durationInFrames) return null;

  const px = {x: at.x * stage.width, y: at.y * stage.height};
  const textIn = enter({frame, fps, at: startFrame, config: 'pop', durationInFrames: 14});
  // Strokes take ~22 frames to draw themselves on, starting after the words land.
  const drawProgress = interpolate(
    frame,
    [startFrame + 6, startFrame + 30],
    [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
  const out = interpolate(
    frame,
    [startFrame + durationInFrames - 8, startFrame + durationInFrames],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
  const rotate = interpolate(textIn, [0, 1], [-7, -2.5]);
  const slide = interpolate(textIn, [0, 1], [-38, 0]);

  return (
    <>
      <svg
        width={stage.width}
        height={stage.height}
        viewBox={`0 0 ${stage.width} ${stage.height}`}
        style={{position: 'absolute', inset: 0, overflow: 'visible', opacity: out}}
      >
        {pointsAt ? (
          <RoughArrow
            from={px}
            to={{x: pointsAt.x * stage.width, y: pointsAt.y * stage.height}}
            progress={drawProgress}
            seed={seed}
          />
        ) : null}
        {ring ? (
          <RoughRing
            box={{
              x: ring.x * stage.width,
              y: ring.y * stage.height,
              w: ring.w * stage.width,
              h: ring.h * stage.height,
            }}
            progress={drawProgress}
            seed={seed + 4}
          />
        ) : null}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: px.x,
          top: px.y,
          transform: `translate(-50%, ${place === 'above' ? '-120%' : '20%'}) translateX(${slide}px) rotate(${rotate}deg) scale(${interpolate(
            textIn,
            [0, 1],
            [0.7, 1]
          )})`,
          opacity: Math.min(textIn, out),
          fontFamily: FONTS.hand,
          fontSize,
          fontWeight: TYPE.hand.weight,
          color: INK.handwriting,
          whiteSpace: 'nowrap',
          lineHeight: TYPE.hand.lineHeight,
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </>
  );
};
