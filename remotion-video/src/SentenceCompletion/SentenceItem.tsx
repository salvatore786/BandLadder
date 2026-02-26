import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";
import { AnswerReveal } from "./AnswerReveal";

interface SentenceItemProps {
  index: number;
  sentence: string;
  answer: string;
  appearFrame: number;
  revealFrame: number;
}

export const SentenceItem: React.FC<SentenceItemProps> = ({
  index,
  sentence,
  answer,
  appearFrame,
  revealFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVisible = frame >= appearFrame;
  const elapsed = Math.max(0, frame - appearFrame);

  // Spring-based entrance animation
  const entrance = isVisible
    ? spring({
        fps,
        frame: elapsed,
        config: { damping: 14, stiffness: 120, mass: 0.8 },
      })
    : 0;

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const translateY = interpolate(entrance, [0, 1], [25, 0]);

  // Split sentence on ___ to insert AnswerReveal component
  const parts = sentence.split("___");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 18,
        marginBottom: 28,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {/* Number badge */}
      <div
        style={{
          flexShrink: 0,
          width: 48,
          height: 48,
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 700,
          color: "white",
          marginTop: 4,
          boxShadow: "0 3px 15px rgba(233, 69, 96, 0.3)",
          fontFamily,
        }}
      >
        {index + 1}
      </div>

      {/* Sentence text */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 500,
          lineHeight: 1.6,
          color: COLORS.textPrimary,
          fontFamily,
        }}
      >
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <AnswerReveal
                answer={answer}
                revealFrame={revealFrame}
                index={index}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
