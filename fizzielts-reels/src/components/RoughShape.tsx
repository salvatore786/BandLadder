import React, { useMemo } from "react";
import rough from "roughjs";
import type { Options } from "roughjs/bin/core";

/**
 * Hand-drawn annotation shapes (rough.js) as inline SVG.
 *
 * rough.js randomises its stroke jitter, so every shape is given an explicit
 * `seed` — without it the same annotation would wobble differently on every
 * frame and the render would flicker.
 *
 * `progress` (0-1) draws the stroke on with a dash offset, so an arrow or
 * underline can be seen being drawn rather than appearing whole.
 */

const generator = rough.generator();

type Shape =
  | { kind: "circle"; cx: number; cy: number; diameter: number }
  | { kind: "ellipse"; cx: number; cy: number; w: number; h: number }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "arrow"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "underline"; x: number; y: number; width: number };

/**
 * An underline that stretches to whatever it is wrapped around. The rough path
 * is generated at a nominal width and the viewBox scales it, so the phrase
 * length can change without anyone measuring text at render time.
 */
export const RoughUnderlineFit: React.FC<{
  color: string;
  progress?: number;
  strokeWidth?: number;
  seed?: number;
  height?: number;
}> = ({ color, progress = 1, strokeWidth = 5, seed = 11, height = 18 }) => {
  const NOMINAL = 300;
  const paths = useMemo(
    () =>
      buildPaths(
        { kind: "underline", x: 2, y: height / 2, width: NOMINAL - 4 },
        { seed, roughness: 1.6, strokeWidth }
      ),
    [seed, strokeWidth, height]
  );

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${NOMINAL} ${height}`}
      preserveAspectRatio="none"
      style={{ position: "absolute", left: 0, right: 0, bottom: -6, pointerEvents: "none" }}
    >
      {paths.map((d, i) => (
        <DrawnPath key={i} d={d} color={color} strokeWidth={strokeWidth} progress={progress} />
      ))}
    </svg>
  );
};

export const RoughShape: React.FC<{
  shape: Shape;
  color: string;
  strokeWidth?: number;
  /** 0-1. 1 draws the whole shape. */
  progress?: number;
  seed?: number;
  roughness?: number;
  style?: React.CSSProperties;
}> = ({ shape, color, strokeWidth = 3, progress = 1, seed = 7, roughness = 1.4, style }) => {
  const paths = useMemo(() => buildPaths(shape, { seed, roughness, strokeWidth }), [
    shape,
    seed,
    roughness,
    strokeWidth,
  ]);

  return (
    <svg
      style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none", ...style }}
    >
      {paths.map((d, i) => (
        <DrawnPath
          key={i}
          d={d}
          color={color}
          strokeWidth={strokeWidth}
          progress={progress}
        />
      ))}
    </svg>
  );
};

const DrawnPath: React.FC<{
  d: string;
  color: string;
  strokeWidth: number;
  progress: number;
}> = ({ d, color, strokeWidth, progress }) => {
  // A generous constant beats measuring the path per frame: any dash array
  // longer than the path draws the whole thing at progress 1.
  const LEN = 4000;
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={LEN}
      strokeDashoffset={LEN * (1 - Math.max(0, Math.min(1, progress)))}
    />
  );
};

function buildPaths(shape: Shape, opts: Options & { strokeWidth: number }): string[] {
  const o: Options = {
    seed: opts.seed,
    roughness: opts.roughness,
    strokeWidth: opts.strokeWidth,
    bowing: 1.1,
  };

  const drawables = (() => {
    switch (shape.kind) {
      case "circle":
        return [generator.circle(shape.cx, shape.cy, shape.diameter, o)];
      case "ellipse":
        return [generator.ellipse(shape.cx, shape.cy, shape.w, shape.h, o)];
      case "line":
        return [generator.line(shape.x1, shape.y1, shape.x2, shape.y2, o)];
      case "underline":
        return [generator.line(shape.x, shape.y, shape.x + shape.width, shape.y, o)];
      case "arrow": {
        const { x1, y1, x2, y2 } = shape;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const head = 22;
        const spread = 0.42;
        return [
          generator.line(x1, y1, x2, y2, o),
          generator.line(
            x2,
            y2,
            x2 - head * Math.cos(angle - spread),
            y2 - head * Math.sin(angle - spread),
            o
          ),
          generator.line(
            x2,
            y2,
            x2 - head * Math.cos(angle + spread),
            y2 - head * Math.sin(angle + spread),
            o
          ),
        ];
      }
    }
  })();

  return drawables.flatMap((drawable) =>
    generator.toPaths(drawable).map((p) => p.d)
  );
}
