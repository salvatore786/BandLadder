import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../styles/colors";
import { fontFamily } from "../../styles/fonts";

/**
 * CTA Variant 5: Features Highlight
 * Three feature cards fly in from sides with icons
 */
export const FeaturesCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: "🎯", title: "Authentic Format", desc: "Real exam format, timing & question types", color: "#4361ee", delay: 10 },
    { icon: "📊", title: "Detailed Feedback", desc: "Comprehensive analysis of your performance", color: "#7c3aed", delay: 22 },
    { icon: "🔄", title: "Unlimited Practice", desc: "Multiple test versions to build confidence", color: "#e94560", delay: 34 },
  ];

  // Title
  const titleO = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = spring({ frame, fps, from: 40, to: 0, durationInFrames: 20, config: { damping: 13 } });

  // Checkmark animation
  const checkScale = spring({ frame: Math.max(0, frame - 60), fps, from: 0, to: 1, durationInFrames: 18, config: { damping: 9 } });

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2 }}>

      {/* Heading */}
      <div
        style={{
          fontSize: 46,
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
        Why Choose{"\n"}BandLadder? ✨
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
        Everything you need to succeed
      </div>

      {/* Feature cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 60px", width: "100%" }}>
        {features.map((feat, i) => {
          const slideX = spring({ frame: Math.max(0, frame - feat.delay), fps, from: i % 2 === 0 ? -400 : 400, to: 0, durationInFrames: 22, config: { damping: 14 } });
          const cardO = interpolate(frame, [feat.delay, feat.delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div
              key={i}
              style={{
                background: "#ffffff",
                borderRadius: 22,
                padding: "28px 32px",
                display: "flex",
                alignItems: "center",
                gap: 22,
                border: `2px solid ${feat.color}15`,
                boxShadow: `0 6px 24px ${feat.color}10`,
                transform: `translateX(${slideX}px)`,
                opacity: cardO,
              }}
            >
              {/* Icon circle */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: `${feat.color}10`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
                  flexShrink: 0,
                }}
              >
                {feat.icon}
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.textPrimary, fontFamily, marginBottom: 4 }}>{feat.title}</div>
                <div style={{ fontSize: 20, fontWeight: 400, color: COLORS.textSecondary, fontFamily, lineHeight: 1.4 }}>{feat.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Green checkmark */}
      <div
        style={{
          marginTop: 50,
          display: "flex",
          alignItems: "center",
          gap: 12,
          transform: `scale(${checkScale})`,
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#2da87e", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 24, color: "#fff" }}>✓</div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#2da87e", fontFamily }}>100% Free to Start</div>
      </div>

      {/* URL */}
      <div
        style={{
          marginTop: 24,
          fontSize: 24,
          fontWeight: 600,
          color: COLORS.textTertiary,
          fontFamily,
          opacity: interpolate(frame, [70, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        bandladder.com
      </div>
    </div>
  );
};
