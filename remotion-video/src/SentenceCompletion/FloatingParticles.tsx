import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface Particle {
  x: number;
  startY: number;
  size: number;
  speed: number;
  opacity: number;
  delay: number;
}

// Deterministic pseudo-random for consistent renders
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export const FloatingParticles: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      x: seededRandom(i * 7 + 1) * 1080,
      startY: 1920 + seededRandom(i * 13 + 3) * 400,
      size: 4 + seededRandom(i * 17 + 5) * 8,
      speed: 0.3 + seededRandom(i * 23 + 7) * 0.7,
      opacity: 0.03 + seededRandom(i * 29 + 11) * 0.05,
      delay: seededRandom(i * 31 + 13) * durationInFrames * 0.3,
    }));
  }, [durationInFrames]);

  return (
    <AbsoluteFill style={{ zIndex: 1, pointerEvents: "none" }}>
      {particles.map((p, i) => {
        const adjustedFrame = Math.max(0, frame - p.delay);
        const travel = adjustedFrame * p.speed * 1.5;
        const y = p.startY - travel;

        // Fade in then out over lifecycle
        const lifecycle = interpolate(
          adjustedFrame,
          [0, 60, durationInFrames * 0.7, durationInFrames * 0.8],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        if (y < -20 || lifecycle <= 0) return null;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: y,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: "white",
              opacity: p.opacity * lifecycle,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
