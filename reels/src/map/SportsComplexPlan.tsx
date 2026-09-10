import React from 'react';
import {evolvePath} from '@remotion/paths';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONTS, INK, MAP_PALETTE, SPRINGS, TYPE} from '../brand';
import {drift} from '../lib/motion';
import {PLAN, roundedRectPath, SLOT_ORDER, type SlotId} from './planGeometry';

const B = MAP_PALETTE.blobs;

/** Each room gets its own distinct hue — not tints of one colour. */
const ROOM_FILL: Record<SlotId, string> = {
  topLeft: B.peach,
  topRight: B.cyan,
  midLeft: B.lime,
  midRight: B.blue,
  lowLeft: B.green,
  lowRight: B.sage,
  baseLeft: B.blue,
};

const ROOM_STROKE = INK.strong;

/** Draw-on progress for a path that starts at `at` and takes `len` frames. */
const drawAt = (frame: number, at: number, len: number) =>
  interpolate(frame, [at, at + len], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const Drawn: React.FC<{
  d: string;
  progress: number;
  stroke?: string;
  width?: number;
  fill?: string;
  fillOpacity?: number;
}> = ({d, progress, stroke = ROOM_STROKE, width = 3, fill = 'none', fillOpacity = 1}) => {
  const e = evolvePath(progress, d);
  return (
    <>
      {fill !== 'none' ? (
        <path d={d} fill={fill} opacity={fillOpacity} />
      ) : null}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={e.strokeDasharray}
        strokeDashoffset={e.strokeDashoffset}
      />
    </>
  );
};

const Tree: React.FC<{x: number; y: number; frame: number; seed: string; scale?: number}> = ({
  x,
  y,
  frame,
  seed,
  scale = 1,
}) => {
  // Trees sway continuously so no corner of the frame is ever frozen.
  const sway = drift({frame, seed, amplitude: 3, speed: 0.02});
  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${sway.rotate * 0.5})`}>
      <rect x={-4} y={12} width={8} height={26} rx={4} fill={INK.strong} opacity={0.7} />
      <circle cx={0} cy={0} r={26} fill={B.green} stroke={INK.strong} strokeWidth={2.5} />
      <circle cx={-9} cy={8} r={16} fill={B.lime} stroke={INK.strong} strokeWidth={2.5} />
    </g>
  );
};

/**
 * The illustrated plan. Line-art style, warm colours, filled shapes with
 * rounded corners and a soft shadow — never hairline-outlined empty rectangles.
 * The whole plan DRAWS ITSELF ON via evolvePath in the opening seconds.
 */
export const SportsComplexPlan: React.FC<{
  /** slot -> label. Geometry is fixed; labels are swappable per reel. */
  labels: Partial<Record<SlotId, string>>;
  /** Frame the plan starts drawing itself on. */
  drawFrame: number;
  /** Slots that have been named by an answer, and when. */
  highlights: {slot: SlotId; at: number; color: string}[];
  planCaption: string;
}> = ({labels, drawFrame, highlights, planCaption}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {width: vw, height: vh} = PLAN.viewBox;

  const boundaryD = roundedRectPath(
    PLAN.boundary.x,
    PLAN.boundary.y,
    PLAN.boundary.w,
    PLAN.boundary.h,
    PLAN.boundary.r
  );
  const boundaryP = drawAt(frame, drawFrame, 26);
  const corridorTopD = roundedRectPath(
    PLAN.corridors.top.x,
    PLAN.corridors.top.y,
    PLAN.corridors.top.w,
    PLAN.corridors.top.h,
    18
  );
  const spineD = roundedRectPath(
    PLAN.corridors.spine.x,
    PLAN.corridors.spine.y,
    PLAN.corridors.spine.w,
    PLAN.corridors.spine.h,
    18
  );

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      width="100%"
      height="100%"
      style={{overflow: 'visible'}}
    >
      <defs>
        <filter id="planShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="7" stdDeviation="9" floodColor={INK.strong} floodOpacity="0.14" />
        </filter>
        <pattern id="corridorHatch" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill={B.sage} />
          <path d="M0 18 L18 0" stroke={INK.white} strokeWidth="5" opacity="0.75" />
        </pattern>
      </defs>

      {/* Grounds */}
      <g opacity={interpolate(boundaryP, [0, 0.5], [0, 1], {extrapolateRight: 'clamp'})}>
        <rect
          x={PLAN.boundary.x - 14}
          y={PLAN.boundary.y - 14}
          width={PLAN.boundary.w + 28}
          height={PLAN.boundary.h + 28}
          rx={34}
          fill={B.cyan}
          opacity={0.35}
        />
      </g>

      {/* Outer boundary draws itself on first */}
      <g filter="url(#planShadow)">
        <Drawn d={boundaryD} progress={boundaryP} fill={INK.white} fillOpacity={boundaryP > 0.9 ? 1 : 0} width={4} />
      </g>

      {/* Contrasting corridor */}
      <Drawn
        d={corridorTopD}
        progress={drawAt(frame, drawFrame + 14, 20)}
        fill="url(#corridorHatch)"
        fillOpacity={drawAt(frame, drawFrame + 26, 12)}
        width={3}
      />
      <Drawn
        d={spineD}
        progress={drawAt(frame, drawFrame + 20, 22)}
        fill="url(#corridorHatch)"
        fillOpacity={drawAt(frame, drawFrame + 32, 12)}
        width={3}
      />

      {/* Rooms — staggered so the plan cascades on rather than appearing at once */}
      {SLOT_ORDER.map((slot, i) => {
        const label = labels[slot];
        if (!label) return null;
        const r = PLAN.rooms[slot];
        const d = roundedRectPath(r.x, r.y, r.w, r.h, 16);
        const at = drawFrame + 22 + i * 4;
        const p = drawAt(frame, at, 18);
        const fillIn = drawAt(frame, at + 10, 14);

        const hit = highlights.find((h) => h.slot === slot);
        // A named room lifts and rings on a spring when its answer reveals.
        const hp = hit
          ? spring({frame: frame - hit.at, fps, config: SPRINGS.pop, durationInFrames: 20})
          : 0;
        const pulse = hit && frame >= hit.at ? 1 + Math.sin((frame - hit.at) * 0.12) * 0.012 : 1;
        const lift = interpolate(hp, [0, 1], [0, -9]);
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;

        return (
          <g
            key={slot}
            transform={`translate(${cx} ${cy + lift}) scale(${
              interpolate(hp, [0, 1], [1, 1.035]) * pulse
            }) translate(${-cx} ${-cy})`}
          >
            <g filter="url(#planShadow)">
              <Drawn
                d={d}
                progress={p}
                fill={ROOM_FILL[slot]}
                fillOpacity={fillIn}
                width={3.4}
              />
            </g>
            {hit ? (
              <rect
                x={r.x - 7}
                y={r.y - 7}
                width={r.w + 14}
                height={r.h + 14}
                rx={22}
                fill="none"
                stroke={hit.color}
                strokeWidth={interpolate(hp, [0, 1], [0, 6])}
                opacity={hp}
              />
            ) : null}
            <text
              x={cx}
              y={cy + 12}
              textAnchor="middle"
              fill={INK.strong}
              opacity={fillIn}
              style={{
                fontFamily: FONTS.body,
                fontSize: r.h > 140 ? 38 : 34,
                fontWeight: 600,
              }}
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Entrance arrow */}
      <g opacity={drawAt(frame, drawFrame + 40, 12)}>
        {(() => {
          const bounce = Math.sin(frame * 0.11) * 9;
          return (
            <g transform={`translate(${PLAN.entrance.x} ${PLAN.entrance.y + bounce})`}>
              <path
                d="M 0 34 L 0 -14 M -20 6 L 0 -16 L 20 6"
                fill="none"
                stroke={INK.handwriting}
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })()}
      </g>

      {/* Scenery: trees and water */}
      <g opacity={drawAt(frame, drawFrame + 34, 14)}>
        <Tree x={-52} y={296} frame={frame} seed="t1" scale={1.25} />
        <Tree x={-46} y={476} frame={frame} seed="t2" scale={1} />
        <Tree x={950} y={326} frame={frame} seed="t3" scale={1.15} />
        <ellipse
          cx={946}
          cy={520}
          rx={46}
          ry={34}
          fill={B.cyan}
          stroke={INK.strong}
          strokeWidth={2.5}
        />
        <path
          d={`M 918 ${516 + Math.sin(frame * 0.09) * 3} q 14 -7 28 0 q 14 7 28 0`}
          fill="none"
          stroke={INK.white}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </g>

      {/* Key — inside the grounds band so nothing bleeds outside the stage box */}
      <g opacity={drawAt(frame, drawFrame + 46, 14)}>
        <rect
          x={44}
          y={46}
          width={470}
          height={54}
          rx={27}
          fill={INK.white}
          stroke={INK.hairline}
          strokeWidth={2}
        />
        <rect x={64} y={60} width={26} height={26} rx={8} fill="url(#corridorHatch)" />
        <text
          x={102}
          y={81}
          fill={INK.body}
          style={{fontFamily: FONTS.body, fontSize: 26, fontWeight: 500}}
        >
          corridor
        </text>
        <circle cx={258} cy={73} r={13} fill={B.cyan} stroke={INK.strong} strokeWidth={2} />
        <text
          x={280}
          y={81}
          fill={INK.body}
          style={{fontFamily: FONTS.body, fontSize: 26, fontWeight: 500}}
        >
          water
        </text>
        <text
          x={408}
          y={81}
          fill={INK.muted}
          style={{fontFamily: FONTS.mono, fontSize: 22, letterSpacing: 2}}
        >
          KEY
        </text>
      </g>

      <text
        x={856}
        y={81}
        textAnchor="end"
        fill={INK.muted}
        opacity={drawAt(frame, drawFrame + 50, 14)}
        style={{fontFamily: FONTS.mono, fontSize: 22, letterSpacing: 2}}
      >
        {planCaption}
      </text>

    </svg>
  );
};
