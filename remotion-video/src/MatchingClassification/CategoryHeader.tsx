import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

interface CategoryHeaderProps {
  categories: string[];
  appearFrame: number;
}

export const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  categories,
  appearFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasAppeared = frame >= appearFrame;
  if (!hasAppeared) return null;

  const enterProgress = spring({
    fps,
    frame: frame - appearFrame,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });

  const translateY = interpolate(enterProgress, [0, 1], [20, 0]);
  const opacity = interpolate(enterProgress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 20px",
        marginBottom: 12,
        transform: `translateY(${translateY}px)`,
        opacity,
      }}
    >
      {/* Spacer for item number + text area */}
      <div style={{ flex: 1 }} />

      {/* Category labels */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {categories.map((cat, i) => (
          <div
            key={i}
            style={{
              width: 44,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 700,
              color: COLORS.primary,
              letterSpacing: 0.5,
              fontFamily,
              lineHeight: 1.2,
              wordBreak: "break-word" as const,
            }}
          >
            {cat}
          </div>
        ))}
      </div>
    </div>
  );
};
