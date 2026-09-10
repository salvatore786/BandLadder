import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {makeCircle} from '@remotion/shapes';
import {drift, pushIn} from '../lib/motion';

export type BlobSpec = {
  color: string;
  /** Centre, normalised to the frame. */
  x: number;
  y: number;
  r: number;
  seed: string;
  opacity?: number;
};

/**
 * An organic blob whose radii are modulated by noise on the current frame, so
 * it morphs continuously and never loops visibly. Nothing here is ever static.
 */
const blobPath = (r: number, frame: number, seed: string) => {
  const points = 7;
  const step = (Math.PI * 2) / points;
  const pts: {x: number; y: number}[] = [];
  for (let i = 0; i < points; i++) {
    const wobble = noise2D(seed + i, frame * 0.009, i * 0.9);
    const rr = r * (1 + wobble * 0.18);
    const a = i * step;
    pts.push({x: Math.cos(a) * rr, y: Math.sin(a) * rr});
  }
  // Closed Catmull-Rom through the points, emitted as cubic beziers.
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % points];
    const p3 = pts[(i + 2) % points];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(
      2
    )}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d + ' Z';
};

/**
 * The base colour plus its blobs. The blobs are obviously visible — roughly a
 * fifth of the frame reading clearly as colour, not subliminal tinting.
 */
export const Backdrop: React.FC<{
  base: string;
  blobs: BlobSpec[];
  /** Total composition length, for the slow push-in. */
  durationInFrames: number;
}> = ({base, blobs, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const scale = pushIn(frame, durationInFrames);

  return (
    <AbsoluteFill style={{backgroundColor: base}}>
      <AbsoluteFill style={{transform: `scale(${scale})`}}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{position: 'absolute', inset: 0}}
        >
          {blobs.map((b, i) => {
            const d = drift({frame, seed: b.seed, amplitude: 52, speed: 0.0055});
            const cx = b.x * width + d.x;
            const cy = b.y * height + d.y;
            return (
              <g
                key={b.seed}
                transform={`translate(${cx} ${cy}) rotate(${d.rotate}) scale(${d.scale})`}
              >
                <path
                  d={blobPath(b.r, frame + i * 90, b.seed)}
                  fill={b.color}
                  opacity={b.opacity ?? 1}
                />
              </g>
            );
          })}
          {/* A few generated dots for texture, drifting on their own noise. */}
          {blobs.slice(0, 4).map((b, i) => {
            const d = drift({
              frame,
              seed: b.seed + '-dot',
              amplitude: 80,
              speed: 0.010,
            });
            const c = makeCircle({radius: 9 + i * 2});
            return (
              <g
                key={b.seed + '-dot'}
                transform={`translate(${b.x * width + d.x * 2.2 - 9} ${
                  b.y * height + d.y * 2.6 - 9
                })`}
              >
                <path d={c.path} fill={b.color} opacity={0.85} />
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
