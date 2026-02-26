import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

interface ClassificationItemProps {
  text: string;
  categoryIndex: number;
  categoryCount: number;
  itemIndex: number;
  appearFrame: number;
  revealFrame: number;
}

export const ClassificationItem: React.FC<ClassificationItemProps> = ({
  text,
  categoryIndex,
  categoryCount,
  itemIndex,
  appearFrame,
  revealFrame,
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

  const translateX = interpolate(enterProgress, [0, 1], [-60, 0]);
  const opacity = interpolate(enterProgress, [0, 1], [0, 1]);

  // Reveal state
  const isRevealed = frame >= revealFrame;
  const revealElapsed = isRevealed ? frame - revealFrame : 0;

  // Stagger reveal per item (150ms / ~4.5 frames apart)
  const itemRevealDelay = itemIndex * 5;
  const isItemRevealed = isRevealed && revealElapsed >= itemRevealDelay;
  const itemRevealElapsed = isItemRevealed ? revealElapsed - itemRevealDelay : 0;

  const revealTransition = isItemRevealed
    ? interpolate(itemRevealElapsed, [0, 15], [0, 1], {
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 20px",
        background: "rgba(20, 25, 45, 0.03)",
        border: `1.5px solid rgba(20, 25, 45, 0.06)`,
        borderRadius: 14,
        marginBottom: 10,
        transform: `translateX(${translateX}px)`,
        opacity,
      }}
    >
      {/* Item number */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(20, 25, 45, 0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 700,
          color: COLORS.textSecondary,
          fontFamily,
          flexShrink: 0,
        }}
      >
        {itemIndex + 1}
      </div>

      {/* Item text */}
      <div
        style={{
          flex: 1,
          fontSize: 22,
          fontWeight: 500,
          color: COLORS.textPrimary,
          lineHeight: 1.3,
          fontFamily,
          minWidth: 0,
        }}
      >
        {text}
      </div>

      {/* Category checkboxes */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {Array.from({ length: categoryCount }).map((_, ci) => {
          const isCorrectCategory = ci === categoryIndex;
          const showCheck = isItemRevealed && isCorrectCategory;

          let boxBg = "rgba(20, 25, 45, 0.04)";
          let boxBorder = "rgba(20, 25, 45, 0.1)";
          let checkOpacity = 0;
          let checkScale = 0.5;

          if (showCheck) {
            boxBg = `rgba(78, 204, 163, ${0.06 + revealTransition * 0.2})`;
            boxBorder = `rgba(78, 204, 163, ${0.1 + revealTransition * 0.5})`;
            checkOpacity = revealTransition;
            checkScale = 0.5 + revealTransition * 0.5;
          } else if (isItemRevealed && !isCorrectCategory) {
            const dimAmount = revealTransition * 0.5;
            boxBg = `rgba(20, 25, 45, ${0.04 * (1 - dimAmount)})`;
            boxBorder = `rgba(20, 25, 45, ${0.1 * (1 - dimAmount)})`;
          }

          return (
            <div
              key={ci}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: boxBg,
                border: `2px solid ${boxBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {showCheck && (
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: COLORS.success,
                    opacity: checkOpacity,
                    transform: `scale(${checkScale})`,
                  }}
                >
                  {"\u2713"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
