import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";

/**
 * Enhanced audio wave visualization with gradient bars, glow, and mirror reflection.
 * Uses math-driven animation (no actual audio data parsing needed).
 */
export const AudioWaveViz: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const barCount = 28;

  // Overall fade: visible while "listening"
  const overallOpacity = interpolate(
    frame,
    [0, 15, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Bell curve for center emphasis
  const centerIndex = barCount / 2;

  const bars = Array.from({ length: barCount }, (_, i) => {
    const t = frame / fps;

    // Three sine waves for organic flowing motion
    const freq1 = 2.5 + i * 0.3;
    const freq2 = 1.8 + i * 0.15;
    const freq3 = 3.2 + i * 0.22;
    const phase1 = i * 0.4;
    const phase2 = i * 0.7;
    const phase3 = i * 1.1;

    const wave1 = Math.sin(t * freq1 + phase1) * 0.5 + 0.5;
    const wave2 = Math.sin(t * freq2 + phase2) * 0.3 + 0.5;
    const wave3 = Math.sin(t * freq3 + phase3) * 0.2 + 0.5;
    const combined = (wave1 + wave2 + wave3) / 3;

    // Center emphasis: bell curve multiplier
    const dist = (i - centerIndex) / centerIndex;
    const bellCurve = 0.6 + 0.4 * Math.exp(-(dist * dist) * 3);

    // Height between 4px and 48px (doubled from original)
    const height = 4 + combined * 44 * bellCurve;

    return height;
  });

  const barWidth = Math.floor((1080 - 120 - (barCount - 1) * 3) / barCount);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 215,
        left: 60,
        right: 60,
        zIndex: 2,
        opacity: overallOpacity,
      }}
    >
      {/* Main bars */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 3,
          height: 60,
        }}
      >
        {bars.map((height, i) => {
          const glowIntensity = (height / 48) * 0.35;
          return (
            <div
              key={i}
              style={{
                width: barWidth,
                height,
                background: `linear-gradient(to top, rgba(233,69,96,0.35), rgba(255,107,107,0.55))`,
                borderRadius: 2,
                boxShadow: `0 0 ${3 + height * 0.15}px rgba(233,69,96,${glowIntensity})`,
              }}
            />
          );
        })}
      </div>

      {/* Mirror reflection */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 3,
          height: 30,
          marginTop: 3,
          opacity: 0.3,
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 90%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 90%)",
        }}
      >
        {bars.map((height, i) => (
          <div
            key={i}
            style={{
              width: barWidth,
              height: height * 0.5,
              background: `linear-gradient(to bottom, rgba(233,69,96,0.25), rgba(255,107,107,0.08))`,
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    </div>
  );
};
