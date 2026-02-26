import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

const RECORD_SIZE = 320;
const GROOVE_RADII = [65, 85, 105, 125, 145]; // Concentric ring radii

export const SpinningVinylRecord: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Continuous rotation: 33.33 RPM = 200 degrees/sec
  const angle = ((frame / fps) * 200) % 360;

  // Fade in/out
  const opacity = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 0.7, 0.7, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scale entrance
  const scale = interpolate(frame, [0, 45], [0.85, 1.0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ zIndex: 1, pointerEvents: "none" }}>
      {/* Outer glow behind the record */}
      <div
        style={{
          position: "absolute",
          right: -40,
          bottom: 320,
          width: RECORD_SIZE + 80,
          height: RECORD_SIZE + 80,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}, transparent 60%)`,
          opacity: opacity * 0.12,
          filter: "blur(30px)",
        }}
      />

      {/* Record container — rotates */}
      <div
        style={{
          position: "absolute",
          right: -20,
          bottom: 340,
          width: RECORD_SIZE,
          height: RECORD_SIZE,
          opacity,
          transform: `scale(${scale}) rotate(${angle}deg)`,
          transformOrigin: "center center",
        }}
      >
        {/* Record body — dark disc */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `radial-gradient(circle at 45% 40%, #222233, #111118 50%, #0a0a12)`,
            boxShadow: "0 4px 30px rgba(0,0,0,0.6)",
          }}
        />

        {/* Groove rings */}
        {GROOVE_RADII.map((radius, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: RECORD_SIZE / 2 - radius,
              top: RECORD_SIZE / 2 - radius,
              width: radius * 2,
              height: radius * 2,
              borderRadius: "50%",
              border: "1px solid rgba(20, 25, 45, 0.06)",
              boxSizing: "border-box",
            }}
          />
        ))}

        {/* Outer rim — subtle highlight */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "1px solid rgba(20, 25, 45, 0.08)",
            boxSizing: "border-box",
          }}
        />

        {/* Center label — red gradient */}
        <div
          style={{
            position: "absolute",
            left: RECORD_SIZE / 2 - 30,
            top: RECORD_SIZE / 2 - 30,
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
            boxShadow: `0 0 20px rgba(233, 69, 96, 0.4)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* BL branding text */}
          <span
            style={{
              color: "white",
              fontSize: 16,
              fontWeight: 800,
              fontFamily,
              letterSpacing: 1,
            }}
          >
            BL
          </span>
        </div>

        {/* Spindle hole */}
        <div
          style={{
            position: "absolute",
            left: RECORD_SIZE / 2 - 4,
            top: RECORD_SIZE / 2 - 4,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#0a0a12",
            zIndex: 1,
          }}
        />

        {/* Shine highlight — light reflection arc */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, transparent 100%)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
