import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Subtle gradient angle oscillation
  const angle = interpolate(
    frame,
    [0, durationInFrames],
    [168, 172],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill>
      {/* Main gradient */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(${angle}deg, ${COLORS.bgGradientStart} 0%, ${COLORS.bgGradientMid} 50%, ${COLORS.bgGradientEnd} 100%)`,
        }}
      />

      {/* Decorative circle top-right */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          top: -150,
          right: -200,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}, transparent)`,
          opacity: 0.08,
        }}
      />

      {/* Decorative circle bottom-left */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          bottom: 200,
          left: -150,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.bgGradientEnd}, transparent)`,
          opacity: 0.15,
        }}
      />
    </AbsoluteFill>
  );
};
