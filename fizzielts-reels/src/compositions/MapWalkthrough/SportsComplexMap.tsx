import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLOR, LAYOUT, SHADOW, VIVID, alpha, lighten } from "../../brand";
import { FONT } from "../../fonts";
import type { MapWalkthroughProps } from "../../schemas";

/**
 * The floor plan, drawn rather than plotted.
 *
 * Geometry is fixed and every word on it comes from `fixtures`, so the same
 * plan serves many reels by changing the JSON. Rooms are filled shapes with
 * soft shadows, the corridor is a warm path, and the grounds carry trees and
 * water so it reads as an illustration instead of a wireframe.
 */

export const MAP = { width: 860, height: 940 } as const;

const GROUND = "#F3F7EE"; // lawn inside the site boundary
const PATH = "#F6E3C6"; // corridor / walkway
const PATH_EDGE = "#E4C89C";
const WATER = "#BFE3F2";
const TREE = "#78B98A";
const TREE_DARK = "#4E9367";
const ROOM_IDLE = "#FBF4E9"; // warm ivory, not grey

const ROOMS: Record<string, { x: number; y: number; w: number; h: number }> = {
  E: { x: 70, y: 136, w: 310, h: 169 },
  C: { x: 70, y: 510, w: 310, h: 169 },
  A: { x: 70, y: 697, w: 310, h: 169 },
  F: { x: 480, y: 136, w: 310, h: 169 },
  G: { x: 480, y: 323, w: 310, h: 169 },
  D: { x: 480, y: 510, w: 310, h: 169 },
  B: { x: 480, y: 697, w: 310, h: 169 },
  H: { x: 190, y: 34, w: 420, h: 80 },
};

/** The one left-hand block that is pre-labelled rather than an answer slot. */
const FIXTURE_BLOCK = { x: 70, y: 323, w: 310, h: 169 };

const CORRIDOR = { x: 395, w: 70, top: 114, bottom: 880 };

export interface ResolvedSlot {
  name: string;
  color: string;
  revealFrame: number;
}

export const SportsComplexMap: React.FC<{
  fixtures: MapWalkthroughProps["map"]["fixtures"];
  /** Slot letter -> what it turned out to be. Absent slots stay unlabelled. */
  resolved: Record<string, ResolvedSlot>;
}> = ({ fixtures, resolved }) => {
  const frame = useCurrentFrame();

  // The plan draws itself in over the first second — the hook window must move.
  const draw = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Must exceed the wall perimeter (2 * (800 + 860)) or the last stretch of
  // the outline never gets drawn.
  const OUTLINE_LEN = 4000;

  return (
    <svg
      width={MAP.width}
      height={MAP.height}
      viewBox={`0 0 ${MAP.width} ${MAP.height}`}
      style={{ display: "block" }}
    >
      <defs>
        <filter id="softshadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#161233" floodOpacity="0.16" />
        </filter>
      </defs>

      {/* Grounds */}
      <rect x={30} y={20} width={800} height={860} rx={18} fill={GROUND} opacity={draw} />

      {/* Water feature along the east edge */}
      <path
        d={`M 822 60 C 862 220, 806 380, 838 540 C 862 690, 810 790, 828 866`}
        stroke={WATER}
        strokeWidth={34}
        strokeLinecap="round"
        fill="none"
        opacity={draw * 0.9}
      />

      {/* Corridor / walkway */}
      <rect
        x={CORRIDOR.x}
        y={CORRIDOR.top}
        width={CORRIDOR.w}
        height={CORRIDOR.bottom - CORRIDOR.top}
        rx={12}
        fill={PATH}
        stroke={PATH_EDGE}
        strokeWidth={3}
        opacity={draw}
      />
      <text
        x={CORRIDOR.x + CORRIDOR.w / 2}
        y={(CORRIDOR.top + CORRIDOR.bottom) / 2}
        textAnchor="middle"
        fontFamily={FONT.sans}
        fontSize={22}
        fontWeight={600}
        fill="#9A7B4A"
        opacity={draw}
        transform={`rotate(-90 ${CORRIDOR.x + CORRIDOR.w / 2} ${(CORRIDOR.top + CORRIDOR.bottom) / 2})`}
      >
        {fixtures.corridor}
      </text>

      {/* Site boundary, drawn on */}
      <rect
        x={30}
        y={20}
        width={800}
        height={860}
        rx={18}
        fill="none"
        stroke={COLOR.ink}
        strokeWidth={4}
        strokeDasharray={OUTLINE_LEN}
        strokeDashoffset={OUTLINE_LEN * (1 - draw)}
      />

      {/* Entrance: a gap in the boundary with a bold arrow */}
      <rect x={CORRIDOR.x} y={873} width={CORRIDOR.w} height={14} fill={GROUND} />
      <g opacity={draw}>
        <line
          x1={CORRIDOR.x + CORRIDOR.w / 2}
          y1={928}
          x2={CORRIDOR.x + CORRIDOR.w / 2}
          y2={866}
          stroke={VIVID.orange}
          strokeWidth={7}
          strokeLinecap="round"
        />
        <polygon
          points={`${CORRIDOR.x + CORRIDOR.w / 2},852 ${CORRIDOR.x + CORRIDOR.w / 2 - 15},884 ${CORRIDOR.x + CORRIDOR.w / 2 + 15},884`}
          fill={VIVID.orange}
        />
        <text
          x={CORRIDOR.x + CORRIDOR.w / 2 + 30}
          y={922}
          fontFamily={FONT.sans}
          fontSize={26}
          fontWeight={700}
          fill={VIVID.orange}
        >
          {fixtures.entrance}
        </text>
      </g>

      {/* Trees dotted through the grounds */}
      {TREES.map((t, i) => (
        <Tree key={i} x={t[0]} y={t[1]} r={t[2]} opacity={draw} />
      ))}

      {/* Pre-labelled block */}
      <FixtureBox {...FIXTURE_BLOCK} label={fixtures.blockA} opacity={draw} />

      <text
        x={MAP.width - 48}
        y={922}
        textAnchor="end"
        fontFamily={FONT.hand}
        fontSize={30}
        fontWeight={700}
        fill="#8E7BB0"
        opacity={draw}
      >
        {fixtures.northLabel}
      </text>

      {/* The eight answer slots */}
      {Object.entries(ROOMS).map(([letter, r]) => (
        <RoomBox
          key={letter}
          letter={letter}
          rect={r}
          resolved={resolved[letter]}
          frame={frame}
          appear={draw}
          fallbackLabel={letter === "H" ? fixtures.blockB : undefined}
        />
      ))}

      <Key opacity={draw} />
    </svg>
  );
};

/** [x, y, radius] */
const TREES: [number, number, number][] = [
  [408, 60, 17],
  [452, 92, 13],
  [826, 132, 15],
  [806, 300, 13],
  [842, 452, 16],
  [800, 620, 13],
  [830, 770, 15],
  [58, 96, 14],
  [46, 610, 12],
];

const Tree: React.FC<{ x: number; y: number; r: number; opacity: number }> = ({
  x,
  y,
  r,
  opacity,
}) => (
  <g opacity={opacity}>
    <rect x={x - 2.5} y={y + r - 3} width={5} height={r * 0.7} rx={2} fill="#9C7A52" />
    <circle cx={x} cy={y} r={r} fill={TREE} />
    <circle cx={x - r * 0.3} cy={y - r * 0.25} r={r * 0.55} fill={TREE_DARK} opacity={0.45} />
  </g>
);

const FixtureBox: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  opacity: number;
}> = ({ x, y, w, h, label, opacity }) => (
  <g opacity={opacity}>
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={LAYOUT.shapeRadius}
      fill="#E4E0F0"
      stroke="#CFC8E6"
      strokeWidth={3}
      filter="url(#softshadow)"
    />
    <text
      x={x + w / 2}
      y={y + h / 2 + 9}
      textAnchor="middle"
      fontFamily={FONT.sans}
      fontSize={26}
      fontWeight={600}
      fill="#5A5378"
    >
      {label}
    </text>
  </g>
);

const RoomBox: React.FC<{
  letter: string;
  rect: { x: number; y: number; w: number; h: number };
  resolved?: ResolvedSlot;
  frame: number;
  appear: number;
  fallbackLabel?: string;
}> = ({ letter, rect, resolved, frame, appear, fallbackLabel }) => {
  const answered = resolved !== undefined && frame >= resolved.revealFrame;
  const fill = interpolate(frame - (resolved?.revealFrame ?? 0), [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const color = resolved?.color ?? COLOR.ink;

  return (
    <g opacity={appear}>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        rx={LAYOUT.shapeRadius}
        fill={answered ? lighten(color, 1 - 0.32 * fill) : ROOM_IDLE}
        stroke={answered ? color : "#E0CFB4"}
        strokeWidth={answered ? 4 : 3}
        filter="url(#softshadow)"
      />

      {/* Letter chip, top-left of the room */}
      <rect
        x={rect.x + 14}
        y={rect.y + 14}
        width={46}
        height={46}
        rx={12}
        fill={answered ? color : COLOR.white}
        stroke={answered ? color : alpha(COLOR.ink, 0.5)}
        strokeWidth={3}
      />
      <text
        x={rect.x + 37}
        y={rect.y + 47}
        textAnchor="middle"
        fontFamily={FONT.sans}
        fontSize={27}
        fontWeight={700}
        fill={answered ? COLOR.white : COLOR.ink}
      >
        {letter}
      </text>

      {(answered || fallbackLabel) && (
        <text
          x={rect.x + rect.w / 2 + 22}
          y={rect.y + rect.h / 2 + 11}
          textAnchor="middle"
          fontFamily={FONT.sans}
          fontSize={29}
          fontWeight={700}
          fill={answered ? color : "#6B678A"}
          opacity={answered ? fill : 1}
        >
          {answered ? resolved!.name : fallbackLabel}
        </text>
      )}
    </g>
  );
};

/** Small legend so the plan reads as a proper drawing. */
const Key: React.FC<{ opacity: number }> = ({ opacity }) => (
  <g opacity={opacity}>
    <rect
      x={44}
      y={888}
      width={296}
      height={44}
      rx={12}
      fill={COLOR.white}
      stroke={COLOR.border}
      strokeWidth={2}
      style={{ filter: `drop-shadow(${SHADOW.shape})` }}
    />
    <rect x={58} y={902} width={22} height={16} rx={5} fill={PATH} stroke={PATH_EDGE} strokeWidth={2} />
    <text x={88} y={916} fontFamily={FONT.sans} fontSize={20} fontWeight={500} fill={COLOR.body}>
      path
    </text>
    <circle cx={168} cy={910} r={9} fill={TREE} />
    <text x={184} y={916} fontFamily={FONT.sans} fontSize={20} fontWeight={500} fill={COLOR.body}>
      trees
    </text>
    <rect x={240} y={904} width={22} height={12} rx={6} fill={WATER} />
    <text x={270} y={916} fontFamily={FONT.sans} fontSize={20} fontWeight={500} fill={COLOR.body}>
      water
    </text>
  </g>
);
