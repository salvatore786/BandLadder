import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

interface WordPairCardProps {
  basicWord: string;
  advancedWord: string;
  basicMeaning?: string;
  advancedMeaning?: string;
  exampleSentence?: string;
  index: number;
  basicAppearFrame: number;
  upgradeAppearFrame: number;
}

export const WordPairCard: React.FC<WordPairCardProps> = ({
  basicWord,
  advancedWord,
  basicMeaning,
  advancedMeaning,
  exampleSentence,
  index,
  basicAppearFrame,
  upgradeAppearFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Basic word slide in from left ──
  const basicEnter = spring({
    fps,
    frame: frame - basicAppearFrame,
    config: { damping: 18, stiffness: 100, mass: 0.7 },
  });
  const basicX = interpolate(basicEnter, [0, 1], [-600, 0]);
  const basicOpacity = interpolate(basicEnter, [0, 1], [0, 1]);

  // ── Arrow + Advanced word slide in from right ──
  const upgradeEnter = spring({
    fps,
    frame: frame - upgradeAppearFrame,
    config: { damping: 14, stiffness: 90, mass: 0.8 },
  });
  const upgradeX = interpolate(upgradeEnter, [0, 1], [600, 0]);
  const upgradeOpacity = interpolate(upgradeEnter, [0, 1], [0, 1]);

  // ── Arrow grows + pulses on appear ──
  const arrowScale = spring({
    fps,
    frame: frame - upgradeAppearFrame,
    config: { damping: 8, stiffness: 130, mass: 0.5 },
  });
  const arrowScaleVal = interpolate(arrowScale, [0, 1], [0.3, 1.0]);

  // Glow pulse on the advanced word when it appears
  const glowPulse =
    frame >= upgradeAppearFrame && frame < upgradeAppearFrame + 30
      ? interpolate(
          frame,
          [upgradeAppearFrame, upgradeAppearFrame + 15, upgradeAppearFrame + 30],
          [0, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        )
      : 0;

  // Example sentence fades in after upgrade word
  const exampleEnter = spring({
    fps,
    frame: frame - upgradeAppearFrame - Math.floor(fps * 0.8),
    config: { damping: 20, stiffness: 80, mass: 0.7 },
  });
  const exampleOpacity = interpolate(exampleEnter, [0, 1], [0, 1]);

  // Alternate row shading for visual variety
  const isEven = index % 2 === 0;
  const rowBg = isEven ? "rgba(233, 69, 96, 0.04)" : "rgba(20, 25, 45, 0.03)";

  return (
    <div
      style={{
        background: rowBg,
        borderRadius: 20,
        padding: "16px 24px",
        border: `1px solid ${COLORS.subtleBorder}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Main comparison row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        {/* Basic word — left side */}
        <div
          style={{
            flex: 1,
            textAlign: "center",
            transform: `translateX(${basicX}px)`,
            opacity: basicOpacity,
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: COLORS.textSecondary,
              fontFamily,
              lineHeight: 1.2,
            }}
          >
            {basicWord}
          </div>
          {basicMeaning && (
            <div
              style={{
                fontSize: 16,
                fontWeight: 400,
                color: COLORS.textMuted,
                fontFamily,
                marginTop: 4,
                fontStyle: "italic",
              }}
            >
              {basicMeaning}
            </div>
          )}
        </div>

        {/* Upgrade arrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
            boxShadow: `0 4px 20px rgba(233, 69, 96, ${0.3 + glowPulse * 0.4})`,
            transform: `scale(${arrowScaleVal})`,
            opacity: upgradeOpacity,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#fff",
              fontFamily,
              lineHeight: 1,
            }}
          >
            {"\u2192"}
          </span>
        </div>

        {/* Advanced word — right side */}
        <div
          style={{
            flex: 1,
            textAlign: "center",
            transform: `translateX(${upgradeX}px)`,
            opacity: upgradeOpacity,
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: COLORS.success,
              fontFamily,
              lineHeight: 1.2,
              textShadow: glowPulse > 0
                ? `0 0 ${12 * glowPulse}px rgba(45, 168, 126, 0.4)`
                : "none",
            }}
          >
            {advancedWord}
          </div>
          {advancedMeaning && (
            <div
              style={{
                fontSize: 16,
                fontWeight: 400,
                color: COLORS.textTertiary,
                fontFamily,
                marginTop: 4,
                fontStyle: "italic",
              }}
            >
              {advancedMeaning}
            </div>
          )}
        </div>
      </div>

      {/* Example sentence (if provided) */}
      {exampleSentence && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 16px",
            background: "rgba(45, 168, 126, 0.06)",
            borderRadius: 12,
            borderLeft: `3px solid ${COLORS.success}`,
            opacity: exampleOpacity,
          }}
        >
          <p
            style={{
              fontSize: 16,
              fontWeight: 400,
              color: COLORS.textTertiary,
              fontFamily,
              margin: 0,
              lineHeight: 1.4,
              fontStyle: "italic",
            }}
          >
            "{exampleSentence}"
          </p>
        </div>
      )}

      {/* Row number badge */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 10,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: COLORS.subtleBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: COLORS.textMuted,
          fontFamily,
          opacity: basicOpacity * 0.6,
        }}
      >
        {index + 1}
      </div>
    </div>
  );
};
