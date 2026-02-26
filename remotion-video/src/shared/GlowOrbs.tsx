import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

interface Orb {
  startX: number;
  startY: number;
  size: number;
  color: string;
  baseOpacity: number;
  speedX: number;
  speedY: number;
  phaseX: number;
  phaseY: number;
  amplitudeX: number;
  amplitudeY: number;
}

const ORB_COLORS = [COLORS.primary, COLORS.accent, COLORS.success, COLORS.primaryLight];

export const GlowOrbs: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const orbs = useMemo<Orb[]>(() => {
    return Array.from({ length: 4 }, (_, i) => ({
      startX: 100 + seededRandom(100 + i * 7) * 880,
      startY: 200 + seededRandom(101 + i * 7) * 1400,
      size: 140 + seededRandom(102 + i * 7) * 80,
      color: ORB_COLORS[i % ORB_COLORS.length],
      baseOpacity: 0.05 + seededRandom(103 + i * 7) * 0.03,
      speedX: 0.005 + seededRandom(104 + i * 7) * 0.007,
      speedY: 0.004 + seededRandom(105 + i * 7) * 0.008,
      phaseX: seededRandom(106 + i * 7) * Math.PI * 2,
      phaseY: seededRandom(107 + i * 7) * Math.PI * 2,
      amplitudeX: 50 + seededRandom(108 + i * 7) * 70,
      amplitudeY: 50 + seededRandom(109 + i * 7) * 70,
    }));
  }, []);

  // Fade in/out for the entire layer
  const layerOpacity = interpolate(
    frame,
    [0, 45, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ zIndex: 1, pointerEvents: "none", opacity: layerOpacity }}>
      {orbs.map((orb, i) => {
        const x = orb.startX + Math.sin(frame * orb.speedX + orb.phaseX) * orb.amplitudeX;
        const y = orb.startY + Math.sin(frame * orb.speedY + orb.phaseY) * orb.amplitudeY;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - orb.size / 2,
              top: y - orb.size / 2,
              width: orb.size,
              height: orb.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
              opacity: orb.baseOpacity,
              filter: "blur(60px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
