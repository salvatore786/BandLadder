import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

interface MultiOptionItemProps {
  label: string;     // "A", "B", "C", "D", "E"
  text: string;
  index: number;
  appearFrame: number;
  revealFrame: number;
  isCorrect: boolean;
}

export const MultiOptionItem: React.FC<MultiOptionItemProps> = ({
  label,
  text,
  index,
  appearFrame,
  revealFrame,
  isCorrect,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animation
  const hasAppeared = frame >= appearFrame;
  if (!hasAppeared) return null;

  const enterProgress = spring({
    fps,
    frame: frame - appearFrame,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });

  const translateY = interpolate(enterProgress, [0, 1], [40, 0]);
  const opacity = interpolate(enterProgress, [0, 1], [0, 1]);

  // Reveal state
  const isRevealed = frame >= revealFrame;
  const revealElapsed = isRevealed ? frame - revealFrame : 0;

  // Background color transition
  let bgColor = "rgba(20, 25, 45, 0.04)";
  let borderColor = "rgba(20, 25, 45, 0.08)";
  let checkboxBg = "rgba(20, 25, 45, 0.06)";
  let checkboxBorder = "rgba(20, 25, 45, 0.15)";
  let textColor = COLORS.textPrimary;

  if (isRevealed) {
    const transition = interpolate(revealElapsed, [0, 15], [0, 1], {
      extrapolateRight: "clamp",
    });

    if (isCorrect) {
      bgColor = `rgba(78, 204, 163, ${0.06 + transition * 0.14})`;
      borderColor = `rgba(78, 204, 163, ${0.1 + transition * 0.4})`;
      checkboxBg = `rgba(78, 204, 163, ${0.1 + transition * 0.5})`;
      checkboxBorder = `rgba(78, 204, 163, ${0.2 + transition * 0.5})`;
      textColor = COLORS.success;
    } else {
      const dimOpacity = 1 - transition * 0.5;
      bgColor = `rgba(20, 25, 45, ${0.04 * dimOpacity})`;
      borderColor = `rgba(20, 25, 45, ${0.08 * dimOpacity})`;
      textColor = `rgba(20, 25, 45, ${0.92 * dimOpacity})`;
      checkboxBg = `rgba(20, 25, 45, ${0.06 * dimOpacity})`;
      checkboxBorder = `rgba(20, 25, 45, ${0.15 * dimOpacity})`;
    }
  }

  // Scale pulse for correct answers
  const pulseScale =
    isRevealed && isCorrect && revealElapsed < 20
      ? interpolate(revealElapsed, [0, 8, 20], [1.0, 1.04, 1.0], {
          extrapolateRight: "clamp",
        })
      : 1;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "18px 24px",
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: 16,
        marginBottom: 12,
        transform: `translateY(${translateY}px) scale(${pulseScale})`,
        opacity,
        position: "relative",
      }}
    >
      {/* Checkbox indicator (square, not circle) */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          background: checkboxBg,
          border: `2px solid ${checkboxBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 800,
          color: isRevealed && isCorrect ? COLORS.success : COLORS.textSecondary,
          fontFamily,
          flexShrink: 0,
        }}
      >
        {isRevealed && isCorrect ? "\u2713" : label}
      </div>

      {/* Option text */}
      <div
        style={{
          fontSize: 24,
          fontWeight: 500,
          color: textColor,
          lineHeight: 1.35,
          fontFamily,
          flex: 1,
        }}
      >
        {text}
      </div>
    </div>
  );
};
