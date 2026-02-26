import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

interface AnswerRevealProps {
  answer: string;
  revealFrame: number;
  index: number;
}

export const AnswerReveal: React.FC<AnswerRevealProps> = ({
  answer,
  revealFrame,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isRevealed = frame >= revealFrame;

  if (!isRevealed) {
    // Show blank placeholder
    return (
      <span
        style={{
          display: "inline-block",
          minWidth: 120,
          borderBottom: `3px solid ${COLORS.accent}`,
          color: COLORS.accent,
          fontWeight: 700,
          textAlign: "center",
          padding: "0 6px",
          margin: "0 4px",
          fontFamily,
        }}
      >
        ____
      </span>
    );
  }

  // Typing effect: characters appear over ~18 frames (0.6s)
  const typingDuration = 18;
  const elapsed = frame - revealFrame;
  const typingProgress = Math.min(elapsed / typingDuration, 1);
  const charsToShow = Math.ceil(typingProgress * answer.length);
  const displayText = answer.substring(0, charsToShow);
  const showCursor = elapsed < typingDuration + 10 && elapsed % 8 < 4;

  // Scale pulse on reveal
  const scale = spring({
    fps,
    frame: elapsed,
    config: { damping: 12, stiffness: 150, mass: 0.6 },
  });
  const scaleValue = interpolate(scale, [0, 1], [1.0, 1.0], {
    extrapolateRight: "clamp",
  });
  // Quick pulse at start
  const pulseScale =
    elapsed < 15
      ? interpolate(elapsed, [0, 7, 15], [1.0, 1.1, 1.0], {
          extrapolateRight: "clamp",
        })
      : 1;

  // Color transition from accent gold to success green
  const colorProgress = interpolate(elapsed, [0, typingDuration], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Glow effect
  const glowOpacity = interpolate(elapsed, [0, 8, 25], [0, 0.4, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <span
      style={{
        display: "inline-block",
        position: "relative",
        minWidth: 120,
        borderBottom: `3px solid ${COLORS.success}`,
        color: COLORS.success,
        fontWeight: 700,
        textAlign: "center",
        padding: "0 6px",
        margin: "0 4px",
        fontFamily,
        transform: `scale(${pulseScale})`,
      }}
    >
      {/* Glow effect behind text */}
      <span
        style={{
          position: "absolute",
          top: -10,
          left: -15,
          right: -15,
          bottom: -10,
          background: `radial-gradient(circle, rgba(78, 204, 163, ${glowOpacity}), transparent)`,
          borderRadius: 8,
          zIndex: -1,
        }}
      />
      {displayText}
      {showCursor && (
        <span style={{ opacity: 0.7, marginLeft: 1 }}>|</span>
      )}
    </span>
  );
};
