import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

interface FormFieldProps {
  label: string;
  value: string;
  index: number;
  appearFrame: number;
  revealFrame: number;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  index,
  appearFrame,
  revealFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < appearFrame) return null;

  // Entrance animation
  const enterProgress = spring({
    fps,
    frame: frame - appearFrame,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });
  const translateX = interpolate(enterProgress, [0, 1], [30, 0]);
  const opacity = interpolate(enterProgress, [0, 1], [0, 1]);

  // Reveal state
  const isRevealed = frame >= revealFrame;
  const revealElapsed = isRevealed ? frame - revealFrame : 0;

  // Stagger reveal per field (each field reveals 8 frames after previous)
  const staggeredRevealFrame = revealFrame + index * 8;
  const isStaggerRevealed = frame >= staggeredRevealFrame;
  const staggerElapsed = isStaggerRevealed ? frame - staggeredRevealFrame : 0;

  // Typing effect
  const typingDuration = 18;
  const typingProgress = isStaggerRevealed
    ? Math.min(staggerElapsed / typingDuration, 1)
    : 0;
  const charsToShow = Math.ceil(typingProgress * value.length);
  const displayText = isStaggerRevealed ? value.substring(0, charsToShow) : "";
  const showCursor = isStaggerRevealed && staggerElapsed < typingDuration + 10 && staggerElapsed % 8 < 4;

  // Glow on reveal
  const glowOpacity = isStaggerRevealed
    ? interpolate(staggerElapsed, [0, 8, 25], [0, 0.3, 0], { extrapolateRight: "clamp" })
    : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 20,
        padding: "18px 24px",
        background: "rgba(20, 25, 45, 0.04)",
        borderRadius: 14,
        border: isStaggerRevealed
          ? `1px solid rgba(78, 204, 163, 0.3)`
          : "1px solid rgba(20, 25, 45, 0.06)",
        transform: `translateX(${translateX}px)`,
        opacity,
        position: "relative",
      }}
    >
      {/* Field number */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: 800,
          color: "#fff",
          fontFamily,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: COLORS.textSecondary,
          minWidth: 200,
          fontFamily,
        }}
      >
        {label}:
      </div>

      {/* Value / blank */}
      <div
        style={{
          flex: 1,
          fontSize: 26,
          fontWeight: 700,
          fontFamily,
          position: "relative",
        }}
      >
        {/* Glow */}
        {glowOpacity > 0 && (
          <div
            style={{
              position: "absolute",
              top: -8,
              left: -10,
              right: -10,
              bottom: -8,
              background: `radial-gradient(circle, rgba(78, 204, 163, ${glowOpacity}), transparent)`,
              borderRadius: 8,
              zIndex: -1,
            }}
          />
        )}

        {isStaggerRevealed ? (
          <span style={{ color: COLORS.success }}>
            {displayText}
            {showCursor && <span style={{ opacity: 0.7, marginLeft: 1 }}>|</span>}
          </span>
        ) : (
          <span
            style={{
              display: "inline-block",
              minWidth: 140,
              borderBottom: `3px dashed ${COLORS.accent}`,
              color: COLORS.accent,
              textAlign: "center",
              padding: "0 4px",
            }}
          >
            ________
          </span>
        )}
      </div>
    </div>
  );
};
