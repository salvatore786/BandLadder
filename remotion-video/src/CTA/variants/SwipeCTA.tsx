import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../styles/colors";
import { fontFamily } from "../../styles/fonts";

/**
 * CTA Variant 7: Swipe / Link in Bio
 * Animated upward arrow with "Link in Bio" CTA and floating action items
 */
export const SwipeCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleO = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = spring({ frame, fps, from: 40, to: 0, durationInFrames: 20, config: { damping: 13 } });

  // Arrow bounce animation (continuous)
  const arrowY = Math.sin(frame * 0.15) * 12;
  const arrowO = interpolate(frame, [20, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Action items cascade
  const actions = [
    { emoji: "📝", text: "Take a practice test", delay: 15 },
    { emoji: "📈", text: "Track your progress", delay: 23 },
    { emoji: "🎯", text: "Improve your score", delay: 31 },
    { emoji: "🏆", text: "Ace your exam!", delay: 39 },
  ];

  // Link pill
  const linkScale = spring({ frame: Math.max(0, frame - 50), fps, from: 0, to: 1, durationInFrames: 20, config: { damping: 10, mass: 0.7 } });
  const linkGlow = 0.15 + Math.sin(frame * 0.1) * 0.08;

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2 }}>

      {/* Heading */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: COLORS.textPrimary,
          textAlign: "center",
          fontFamily,
          opacity: titleO,
          transform: `translateY(${titleY}px)`,
          marginBottom: 16,
          lineHeight: 1.2,
        }}
      >
        Want More{"\n"}Practice? 🤔
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 500,
          color: COLORS.textSecondary,
          textAlign: "center",
          fontFamily,
          marginBottom: 50,
          opacity: interpolate(frame, [10, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Here's what you can do next:
      </div>

      {/* Action items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 50, padding: "0 80px", width: "100%" }}>
        {actions.map((action, i) => {
          const itemX = spring({ frame: Math.max(0, frame - action.delay), fps, from: 300, to: 0, durationInFrames: 20, config: { damping: 13 } });
          const itemO = interpolate(frame, [action.delay, action.delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                background: "#fff",
                borderRadius: 18,
                padding: "20px 28px",
                border: "2px solid rgba(233, 69, 96, 0.08)",
                boxShadow: "0 3px 12px rgba(20, 25, 45, 0.04)",
                transform: `translateX(${itemX}px)`,
                opacity: itemO,
              }}
            >
              <div style={{ fontSize: 34 }}>{action.emoji}</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: COLORS.textPrimary, fontFamily }}>{action.text}</div>
            </div>
          );
        })}
      </div>

      {/* Animated arrow */}
      <div
        style={{
          opacity: arrowO,
          transform: `translateY(${arrowY}px)`,
          marginBottom: 20,
        }}
      >
        <svg width={60} height={60} viewBox="0 0 24 24" fill="none">
          <path d="M12 19V5M5 12l7-7 7 7" stroke={COLORS.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Link in bio pill */}
      <div
        style={{
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
          borderRadius: 50,
          padding: "20px 60px",
          boxShadow: `0 8px 30px rgba(233, 69, 96, ${linkGlow + 0.2})`,
          transform: `scale(${linkScale})`,
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", fontFamily }}>🔗 Link in Bio</div>
      </div>

      <div
        style={{
          marginTop: 20,
          fontSize: 22,
          fontWeight: 600,
          color: COLORS.textTertiary,
          fontFamily,
          opacity: interpolate(frame, [60, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        bandladder.com
      </div>
    </div>
  );
};
