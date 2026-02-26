import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

interface TableRow {
  cells: string[];    // Cell values; "___" marks blank cells
  answers: string[];  // Answers for blank cells in order
}

interface TableGridProps {
  headers: string[];
  rows: TableRow[];
  appearFrame: number;
  revealFrame: number;
}

export const TableGrid: React.FC<TableGridProps> = ({
  headers,
  rows,
  appearFrame,
  revealFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < appearFrame) return null;

  const enterProgress = spring({
    fps,
    frame: frame - appearFrame,
    config: { damping: 14, stiffness: 100, mass: 0.8 },
  });
  const translateY = interpolate(enterProgress, [0, 1], [40, 0]);
  const opacity = interpolate(enterProgress, [0, 1], [0, 1]);

  const isRevealed = frame >= revealFrame;
  const revealElapsed = isRevealed ? frame - revealFrame : 0;

  const colCount = headers.length;
  const colWidth = Math.floor((1080 - 120) / colCount);

  return (
    <div
      style={{
        margin: "15px 40px",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid rgba(20, 25, 45, 0.08)",
        position: "relative",
        zIndex: 2,
        transform: `translateY(${translateY}px)`,
        opacity,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          background: `linear-gradient(135deg, ${COLORS.primary}33, ${COLORS.primaryDark}33)`,
          borderBottom: "2px solid rgba(233, 69, 96, 0.3)",
        }}
      >
        {headers.map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: "18px 16px",
              fontSize: 22,
              fontWeight: 700,
              color: COLORS.primaryLight,
              textAlign: "center",
              fontFamily,
              borderRight: i < colCount - 1 ? "1px solid rgba(20,25,45,0.06)" : "none",
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Data rows */}
      {rows.map((row, rowIdx) => {
        // Stagger row reveals
        const rowRevealFrame = revealFrame + rowIdx * 12;
        const isRowRevealed = frame >= rowRevealFrame;
        const rowElapsed = isRowRevealed ? frame - rowRevealFrame : 0;

        let answerIdx = 0;

        return (
          <div
            key={rowIdx}
            style={{
              display: "flex",
              background: rowIdx % 2 === 0 ? "rgba(20,25,45,0.02)" : "rgba(20,25,45,0.04)",
              borderBottom: rowIdx < rows.length - 1 ? "1px solid rgba(20,25,45,0.06)" : "none",
            }}
          >
            {row.cells.map((cell, colIdx) => {
              const isBlank = cell === "___";
              let displayContent: React.ReactNode;

              if (isBlank) {
                const answer = row.answers[answerIdx] || "";
                answerIdx++;

                if (isRowRevealed) {
                  // Typing effect
                  const typingDuration = 15;
                  const progress = Math.min(rowElapsed / typingDuration, 1);
                  const chars = Math.ceil(progress * answer.length);
                  const text = answer.substring(0, chars);
                  const cursor = rowElapsed < typingDuration + 8 && rowElapsed % 8 < 4;

                  displayContent = (
                    <span style={{ color: COLORS.success, fontWeight: 700 }}>
                      {text}
                      {cursor && <span style={{ opacity: 0.7 }}>|</span>}
                    </span>
                  );
                } else {
                  displayContent = (
                    <span
                      style={{
                        color: COLORS.accent,
                        fontWeight: 600,
                      }}
                    >
                      ____
                    </span>
                  );
                }
              } else {
                displayContent = cell;
              }

              return (
                <div
                  key={colIdx}
                  style={{
                    flex: 1,
                    padding: "16px 16px",
                    fontSize: 22,
                    fontWeight: isBlank ? 600 : 400,
                    color: isBlank ? undefined : COLORS.textSecondary,
                    textAlign: "center",
                    fontFamily,
                    borderRight: colIdx < colCount - 1 ? "1px solid rgba(20,25,45,0.06)" : "none",
                  }}
                >
                  {displayContent}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
