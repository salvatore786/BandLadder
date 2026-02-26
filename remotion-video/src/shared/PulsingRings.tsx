import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";

const RING_COUNT = 5;
const CYCLE_FRAMES = 90; // 3 seconds at 30fps
const RING_STAGGER = 18; // 0.6 seconds offset between rings
const MAX_DIAMETER = 400;

const RING_COLORS = [COLORS.primary, COLORS.accent, COLORS.primary, COLORS.accent, COLORS.primary];

export const PulsingRings: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Layer fade in/out
  const layerOpacity = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ zIndex: 1, pointerEvents: "none", opacity: layerOpacity }}>
      {/* Center point: bottom-center of screen */}
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 1750,
          width: 0,
          height: 0,
        }}
      >
        {Array.from({ length: RING_COUNT }, (_, i) => {
          // Each ring cycles continuously, staggered in time
          const phase = (frame + i * RING_STAGGER) % CYCLE_FRAMES;
          const progress = phase / CYCLE_FRAMES; // 0 → 1

          // Scale: grows from 10% to 100%
          const scale = 0.1 + progress * 0.9;
          const diameter = MAX_DIAMETER * scale;

          // Opacity: fades in briefly, then gradually out
          const opacity = interpolate(
            phase,
            [0, 15, 50, CYCLE_FRAMES],
            [0, 0.12, 0.06, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          // Border width: thicker at start, thinner as it expands
          const borderWidth = interpolate(
            phase,
            [0, CYCLE_FRAMES],
            [3, 0.5],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: diameter,
                height: diameter,
                left: -diameter / 2,
                top: -diameter / 2,
                borderRadius: "50%",
                border: `${borderWidth}px solid ${RING_COLORS[i]}`,
                opacity,
                boxSizing: "border-box",
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
