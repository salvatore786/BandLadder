import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

/**
 * Simulated audio wave visualization using deterministic sine waves.
 * Uses math-driven animation (no actual audio data parsing needed).
 */
export const AudioWaveViz: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const barCount = 24;

  // Overall fade: visible while "listening"
  const overallOpacity = interpolate(
    frame,
    [0, 15, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const bars = Array.from({ length: barCount }, (_, i) => {
    // Multiple sine waves for organic feel
    const t = frame / fps;
    const freq1 = 2.5 + i * 0.3;
    const freq2 = 1.8 + i * 0.15;
    const phase1 = i * 0.4;
    const phase2 = i * 0.7;

    const wave1 = Math.sin(t * freq1 + phase1) * 0.5 + 0.5;
    const wave2 = Math.sin(t * freq2 + phase2) * 0.3 + 0.5;
    const combined = (wave1 + wave2) / 2;

    // Height between 4px and 24px
    const height = 4 + combined * 20;

    return height;
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 200,
        left: 60,
        right: 60,
        zIndex: 2,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 3,
        height: 30,
        opacity: overallOpacity,
      }}
    >
      {bars.map((height, i) => (
        <div
          key={i}
          style={{
            width: Math.floor((1080 - 120 - (barCount - 1) * 3) / barCount),
            height,
            background: `rgba(20, 25, 45, 0.12)`,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
};
