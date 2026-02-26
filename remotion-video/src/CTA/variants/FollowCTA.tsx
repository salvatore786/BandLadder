import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../styles/colors";
import { fontFamily } from "../../styles/fonts";

/**
 * CTA Variant 1: Follow Us
 * Animated social media icons (Instagram, YouTube, LinkedIn) with "Follow for daily practice"
 */
export const FollowCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const socials = [
    { icon: "📸", label: "Instagram", color: "#E1306C", delay: 10 },
    { icon: "▶️", label: "YouTube", color: "#FF0000", delay: 18 },
    { icon: "💼", label: "LinkedIn", color: "#0A66C2", delay: 26 },
  ];

  // Title animation
  const titleY = spring({ frame, fps, from: 60, to: 0, durationInFrames: 25, config: { damping: 13 } });
  const titleOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pulsing ring animation behind icons
  const pulse = Math.sin(frame * 0.08) * 0.15 + 1;

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
      {/* Heading */}
      <div
        style={{
          fontSize: 52,
          fontWeight: 800,
          color: COLORS.textPrimary,
          textAlign: "center",
          marginBottom: 20,
          fontFamily,
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          lineHeight: 1.2,
        }}
      >
        Follow Us For{"\n"}Daily Practice!
      </div>

      {/* Subheading */}
      <div
        style={{
          fontSize: 26,
          fontWeight: 500,
          color: COLORS.textSecondary,
          textAlign: "center",
          marginBottom: 70,
          fontFamily,
          opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Never miss an IELTS tip! 🎯
      </div>

      {/* Social icons row */}
      <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
        {socials.map((s, i) => {
          const iconScale = spring({ frame: Math.max(0, frame - s.delay), fps, from: 0, to: 1, durationInFrames: 18, config: { damping: 10, mass: 0.8 } });
          const bounce = spring({ frame: Math.max(0, frame - s.delay - 15), fps, from: 1.15, to: 1, durationInFrames: 15, config: { damping: 8 } });

          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${iconScale * bounce})` }}>
              {/* Pulsing ring */}
              <div
                style={{
                  width: 130,
                  height: 130,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${s.color}15, ${s.color}25)`,
                  border: `3px solid ${s.color}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 52,
                  transform: `scale(${pulse})`,
                  boxShadow: `0 8px 30px ${s.color}20`,
                }}
              >
                {s.icon}
              </div>
              <div
                style={{
                  marginTop: 16,
                  fontSize: 22,
                  fontWeight: 600,
                  color: COLORS.textSecondary,
                  fontFamily,
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Handle */}
      <div
        style={{
          marginTop: 60,
          fontSize: 36,
          fontWeight: 700,
          color: "#4361ee",
          fontFamily,
          opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        @bandladder
      </div>
    </div>
  );
};
