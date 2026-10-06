import React, { useMemo } from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { COLORS } from "../styles/colors";

/**
 * three.js depth layer that sits between the flat gradient and the content.
 *
 * Everything is driven by useCurrentFrame() rather than a clock, so the render
 * is deterministic and frames can be produced out of order by Remotion's
 * parallel renderer. Kept deliberately low-contrast: it should read as depth
 * behind the question card, never compete with the text.
 *
 * Requires an OpenGL renderer that supports WebGL — see remotion.config.ts.
 */

const DEFAULT_SHAPE_COUNT = 14;

/** Brand palette, for the light-gradient compositions. */
export const BRAND_PALETTE = [
  COLORS.primary,
  COLORS.accent,
  COLORS.success,
  COLORS.primaryLight,
];

/** Chunky flat tones that sit right on the #7EC8E3 comic-style backgrounds. */
export const COMIC_PALETTE = ["#FFFFFF", "#FFD93D", "#FF9A3C", "#5AB0D6"];

interface Shape {
  position: [number, number, number];
  scale: number;
  color: string;
  spin: [number, number, number];
  driftSpeed: number;
  geometry: "icosahedron" | "octahedron" | "torus";
}

const buildShapes = (
  seedPrefix: string,
  count: number,
  palette: readonly string[]
): Shape[] =>
  Array.from({ length: count }, (_, i) => {
    const seed = (key: string) => random(`${seedPrefix}-${key}-${i}`);
    const geometries: Shape["geometry"][] = [
      "icosahedron",
      "octahedron",
      "torus",
    ];

    return {
      // A 1080x1920 frame at fov 45 / z 9 is only ~4.2 units wide but ~7.5
      // tall, so x has to stay tight or shapes drift out of frame entirely.
      position: [
        (seed("x") - 0.5) * 5.2,
        (seed("y") - 0.5) * 12,
        -2 - seed("z") * 5.5,
      ],
      scale: 0.22 + seed("scale") * 0.38,
      color: palette[Math.floor(seed("color") * palette.length)],
      spin: [
        (seed("sx") - 0.5) * 0.02,
        (seed("sy") - 0.5) * 0.02,
        (seed("sz") - 0.5) * 0.012,
      ],
      driftSpeed: 0.004 + seed("drift") * 0.008,
      geometry: geometries[Math.floor(seed("geo") * geometries.length)],
    };
  });

const FloatingShape: React.FC<{
  shape: Shape;
  frame: number;
  opacity: number;
}> = ({ shape, frame, opacity }) => {
  const [x, y, z] = shape.position;

  // Drift upward and wrap around, so the field never empties out.
  const span = 12;
  const drifted = ((y + frame * shape.driftSpeed + span / 2) % span) - span / 2;
  const sway = Math.sin((frame * shape.driftSpeed) / 2 + x) * 0.35;

  return (
    <mesh
      position={[x + sway, drifted, z]}
      rotation={[
        frame * shape.spin[0],
        frame * shape.spin[1],
        frame * shape.spin[2],
      ]}
      scale={shape.scale}
    >
      {shape.geometry === "icosahedron" && <icosahedronGeometry args={[1, 0]} />}
      {shape.geometry === "octahedron" && <octahedronGeometry args={[1, 0]} />}
      {shape.geometry === "torus" && <torusGeometry args={[0.8, 0.28, 12, 32]} />}
      <meshStandardMaterial
        color={shape.color}
        transparent
        opacity={opacity}
        roughness={0.45}
        metalness={0.15}
        flatShading
      />
    </mesh>
  );
};

export const ThreeBackground: React.FC<{
  /** 0-1 multiplier on the whole layer's opacity. */
  intensity?: number;
  seed?: string;
  count?: number;
  palette?: readonly string[];
  /** Per-shape material opacity. */
  shapeOpacity?: number;
}> = ({
  intensity = 1,
  seed = "bandladder",
  count = DEFAULT_SHAPE_COUNT,
  palette = BRAND_PALETTE,
  shapeOpacity = 0.3,
}) => {
  const frame = useCurrentFrame();
  const { width, height, props } = useVideoConfig();
  const shapes = useMemo(
    () => buildShapes(seed, count, palette),
    [seed, count, palette]
  );

  // Kill switch: `three3d: false` in props falls back to the flat background,
  // for machines without a WebGL-capable OpenGL renderer.
  if (props.three3d === false) {
    return null;
  }

  return (
    <AbsoluteFill style={{ opacity: 0.7 * intensity, pointerEvents: "none" }}>
      <ThreeCanvas
        width={width}
        height={height}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 45, position: [0, 0, 9] }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={1.4} />
        <directionalLight position={[4, 6, 6]} intensity={1.1} />
        <directionalLight
          position={[-5, -3, 2]}
          intensity={0.5}
          color={COLORS.primaryLight}
        />
        {shapes.map((shape, i) => (
          <FloatingShape
            key={i}
            shape={shape}
            frame={frame}
            opacity={shapeOpacity}
          />
        ))}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
