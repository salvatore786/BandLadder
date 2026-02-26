import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

interface CueCardDisplayProps {
  topic: string;
  bulletPoints: string[];
  displayDurationFrames: number;
}

/**
 * A styled cue-card that slides in from the bottom, holds for a few seconds,
 * then fades/slides out upward before the model-answer phase begins.
 * Refined version with frosted glass card and accent details.
 */
export const CueCardDisplay: React.FC<CueCardDisplayProps> = ({
  topic,
  bulletPoints,
  displayDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Don't render after display phase is completely done
  if (frame > displayDurationFrames + 20) return null;

  // ── Card entrance (spring from bottom) ──
  const cardEnter = spring({
    fps,
    frame,
    config: { damping: 15, stiffness: 80, mass: 0.8 },
  });
  const cardY = interpolate(cardEnter, [0, 1], [400, 0]);
  const cardOpacity = interpolate(cardEnter, [0, 1], [0, 1]);

  // ── Card exit (slide up + fade) ──
  const exitStart = displayDurationFrames - 20;
  const cardExit = interpolate(
    frame,
    [exitStart, displayDurationFrames + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const exitY = interpolate(cardExit, [0, 1], [0, -300]);
  const exitOpacity = interpolate(cardExit, [0, 1], [1, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
        opacity: exitOpacity,
        pointerEvents: "none" as const,
      }}
    >
      <div
        style={{
          width: 920,
          padding: "45px 50px",
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 24,
          border: "1px solid rgba(255, 255, 255, 0.6)",
          boxShadow:
            "0 20px 60px rgba(20, 25, 45, 0.08), 0 4px 16px rgba(233, 69, 96, 0.06)",
          transform: `translateY(${cardY + exitY}px)`,
          opacity: cardOpacity,
          fontFamily,
        }}
      >
        {/* "CUE CARD" label with mic icon */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="white" />
              <path d="M5 11a7 7 0 0 0 14 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="9" y1="22" x2="15" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: COLORS.primary,
              letterSpacing: 4,
              textTransform: "uppercase" as const,
              fontFamily,
            }}
          >
            Cue Card
          </div>
        </div>

        {/* Topic */}
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: COLORS.textPrimary,
            lineHeight: 1.35,
            marginBottom: 26,
            textAlign: "center",
            fontFamily,
          }}
        >
          {topic}
        </div>

        {/* Accent divider */}
        <div
          style={{
            width: 160,
            height: 4,
            background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`,
            margin: "0 auto 22px",
            borderRadius: 2,
          }}
        />

        {/* "You should say:" */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: COLORS.textSecondary,
            marginBottom: 14,
            fontFamily,
          }}
        >
          You should say:
        </div>

        {/* Bullet points with staggered entrance */}
        {bulletPoints.map((bp, i) => {
          const bpDelay = 15 + i * 8;
          const bpEnter = spring({
            fps,
            frame: frame - bpDelay,
            config: { damping: 18, stiffness: 90, mass: 0.6 },
          });
          const bpOpacity = interpolate(bpEnter, [0, 1], [0, 1]);
          const bpX = interpolate(bpEnter, [0, 1], [50, 0]);

          return (
            <div
              key={i}
              style={{
                fontSize: 24,
                fontWeight: 500,
                color: COLORS.textSecondary,
                lineHeight: 1.6,
                paddingLeft: 20,
                opacity: bpOpacity,
                transform: `translateX(${bpX}px)`,
                display: "flex",
                gap: 12,
                marginBottom: 8,
                fontFamily,
              }}
            >
              <span
                style={{
                  color: COLORS.primary,
                  flexShrink: 0,
                  fontSize: 20,
                }}
              >
                {"\u25B8"}
              </span>
              <span>{bp}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
