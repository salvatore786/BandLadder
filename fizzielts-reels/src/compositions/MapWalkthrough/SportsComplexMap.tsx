import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLOR, alpha } from "../../brand";
import { FONT } from "../../fonts";
import type { MapWalkthroughProps } from "../../schemas";

/**
 * The floor plan.
 *
 * The geometry is fixed and the text is not: every word on the plan comes from
 * `fixtures`, and the eight lettered boxes are filled from `resolved`. To reuse
 * this plan for another reel, change the JSON — never this file.
 */

export const MAP = { width: 860, height: 940 } as const;

/** Bottom-left to top-right, so "far end" means the top of the plan. */
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
  const draw = interpolate(frame, [0, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Must exceed the wall perimeter (2 * (800 + 860)) or the last stretch
  // of the outline never gets drawn.
  const OUTLINE_LEN = 4000;

  return (
    <svg
      width={MAP.width}
      height={MAP.height}
      viewBox={`0 0 ${MAP.width} ${MAP.height}`}
      style={{ display: "block" }}
    >
      {/* Outer wall, drawn on */}
      <rect
        x={30}
        y={20}
        width={800}
        height={860}
        fill="none"
        stroke={COLOR.ink}
        strokeWidth={3}
        strokeDasharray={OUTLINE_LEN}
        strokeDashoffset={OUTLINE_LEN * (1 - draw)}
      />

      {/* Corridor */}
      <rect
        x={CORRIDOR.x}
        y={CORRIDOR.top}
        width={CORRIDOR.w}
        height={CORRIDOR.bottom - CORRIDOR.top}
        fill={alpha(COLOR.ink, 0.04)}
        stroke={COLOR.lavender}
        strokeWidth={2}
        opacity={draw}
      />
      <text
        x={CORRIDOR.x + CORRIDOR.w / 2}
        y={(CORRIDOR.top + CORRIDOR.bottom) / 2}
        textAnchor="middle"
        fontFamily={FONT.sans}
        fontSize={19}
        fill={COLOR.muted}
        opacity={draw}
        transform={`rotate(-90 ${CORRIDOR.x + CORRIDOR.w / 2} ${(CORRIDOR.top + CORRIDOR.bottom) / 2})`}
      >
        {fixtures.corridor}
      </text>

      {/* Entrance: a gap in the bottom wall with an arrow pointing in */}
      <rect x={CORRIDOR.x} y={873} width={CORRIDOR.w} height={14} fill={COLOR.cream} />
      <g opacity={draw}>
        <line
          x1={CORRIDOR.x + CORRIDOR.w / 2}
          y1={928}
          x2={CORRIDOR.x + CORRIDOR.w / 2}
          y2={866}
          stroke={COLOR.ink}
          strokeWidth={3}
        />
        <polygon
          points={`${CORRIDOR.x + CORRIDOR.w / 2},858 ${CORRIDOR.x + CORRIDOR.w / 2 - 9},878 ${CORRIDOR.x + CORRIDOR.w / 2 + 9},878`}
          fill={COLOR.ink}
        />
        <text
          x={CORRIDOR.x + CORRIDOR.w / 2 + 22}
          y={922}
          fontFamily={FONT.sans}
          fontSize={22}
          fontWeight={700}
          fill={COLOR.ink}
        >
          {fixtures.entrance}
        </text>
      </g>

      {/* Pre-labelled blocks */}
      <FixtureBox {...FIXTURE_BLOCK} label={fixtures.blockA} opacity={draw} />
      <text
        x={MAP.width - 48}
        y={922}
        textAnchor="end"
        fontFamily={FONT.sans}
        fontSize={20}
        fontStyle="italic"
        fill={COLOR.muted}
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
    </svg>
  );
};

const FixtureBox: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  opacity: number;
}> = ({ x, y, w, h, label, opacity }) => (
  <g opacity={opacity}>
    <rect x={x} y={y} width={w} height={h} rx={6} fill={alpha(COLOR.ink, 0.05)} stroke={COLOR.lavender} strokeWidth={2} />
    <text
      x={x + w / 2}
      y={y + h / 2 + 8}
      textAnchor="middle"
      fontFamily={FONT.sans}
      fontSize={23}
      fill={COLOR.muted}
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
  const fill = interpolate(frame - (resolved?.revealFrame ?? 0), [0, 10], [0, 1], {
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
        rx={6}
        fill={answered ? alpha(color, 0.1 * fill) : COLOR.white}
        stroke={answered ? color : COLOR.lavender}
        strokeWidth={answered ? 3 : 2}
      />

      {/* Letter chip, top-left of the room */}
      <rect
        x={rect.x + 12}
        y={rect.y + 12}
        width={38}
        height={38}
        rx={5}
        fill={answered ? color : COLOR.white}
        stroke={answered ? color : COLOR.ink}
        strokeWidth={2}
      />
      <text
        x={rect.x + 31}
        y={rect.y + 39}
        textAnchor="middle"
        fontFamily={FONT.sans}
        fontSize={23}
        fontWeight={700}
        fill={answered ? COLOR.white : COLOR.ink}
      >
        {letter}
      </text>

      {(answered || fallbackLabel) && (
        <text
          x={rect.x + rect.w / 2 + 18}
          y={rect.y + rect.h / 2 + 9}
          textAnchor="middle"
          fontFamily={FONT.sans}
          fontSize={25}
          fontWeight={answered ? 700 : 400}
          fill={answered ? color : COLOR.muted}
          opacity={answered ? fill : 1}
        >
          {answered ? resolved!.name : fallbackLabel}
        </text>
      )}
    </g>
  );
};
