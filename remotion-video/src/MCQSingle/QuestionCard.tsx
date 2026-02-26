import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily, playfairFamily } from "../styles/fonts";

interface QuestionCardProps {
  question: string;
  appearFrame: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  appearFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < appearFrame) return null;

  const progress = spring({
    fps,
    frame: frame - appearFrame,
    config: { damping: 14, stiffness: 100, mass: 0.8 },
  });

  const translateY = interpolate(progress, [0, 1], [30, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        margin: "30px 50px 20px",
        padding: "30px 35px",
        background: "rgba(20, 25, 45, 0.04)",
        border: "1px solid rgba(20, 25, 45, 0.08)",
        borderRadius: 20,
        position: "relative",
        zIndex: 2,
        transform: `translateY(${translateY}px)`,
        opacity,
      }}
    >
      {/* Question icon */}
      <div
        style={{
          position: "absolute",
          top: -22,
          left: 30,
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 800,
          color: "#fff",
          fontFamily,
        }}
      >
        Q
      </div>

      <p
        style={{
          fontSize: 38,
          fontWeight: 700,
          fontStyle: "italic",
          color: COLORS.textPrimary,
          lineHeight: 1.4,
          margin: 0,
          fontFamily: playfairFamily,
        }}
      >
        {question}
      </p>
    </div>
  );
};
