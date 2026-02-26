import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../styles/colors";
import { fontFamily } from "../../styles/fonts";

/**
 * CTA Variant 3: Practice Now
 * Large pulsing "Start Practicing" button with exam type badges
 */
export const PracticeCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Headline
  const headY = spring({ frame, fps, from: 50, to: 0, durationInFrames: 22, config: { damping: 13 } });
  const headO = interpolate(frame, [3, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Exam badges
  const badgeDelay = [12, 20, 28, 36];
  const exams = [
    { name: "IELTS Academic", emoji: "📖" },
    { name: "IELTS General", emoji: "🌍" },
    { name: "PTE Academic", emoji: "💻" },
    { name: "PTE Core", emoji: "🎯" },
  ];

  // Button pulse
  const btnScale = spring({ frame: Math.max(0, frame - 50), fps, from: 0, to: 1, durationInFrames: 20, config: { damping: 9, mass: 0.7 } });
  const pulse = 1 + Math.sin(frame * 0.12) * 0.03;

  // Ripple rings
  const ripple1 = interpolate((frame - 60) % 40, [0, 40], [1, 1.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ripple1O = interpolate((frame - 60) % 40, [0, 40], [0.4, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ripple2 = interpolate((frame - 75) % 40, [0, 40], [1, 1.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ripple2O = interpolate((frame - 75) % 40, [0, 40], [0.4, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          transform: `translateY(${headY}px)`,
          opacity: headO,
          marginBottom: 14,
          lineHeight: 1.25,
        }}
      >
        Ready To Ace{"\n"}Your Exam? 🏆
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 500,
          color: COLORS.textSecondary,
          textAlign: "center",
          fontFamily,
          marginBottom: 50,
          opacity: interpolate(frame, [12, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Practice with real exam simulations
      </div>

      {/* Exam badges grid */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", maxWidth: 700, marginBottom: 60, padding: "0 60px" }}>
        {exams.map((exam, i) => {
          const s = spring({ frame: Math.max(0, frame - badgeDelay[i]), fps, from: 0, to: 1, durationInFrames: 18, config: { damping: 11 } });
          return (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "18px 28px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "2px solid rgba(67, 97, 238, 0.12)",
                boxShadow: "0 4px 15px rgba(20, 25, 45, 0.06)",
                transform: `scale(${s})`,
                minWidth: 260,
              }}
            >
              <div style={{ fontSize: 30 }}>{exam.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: COLORS.textPrimary, fontFamily }}>{exam.name}</div>
            </div>
          );
        })}
      </div>

      {/* Big CTA button with ripple */}
      <div style={{ position: "relative", transform: `scale(${btnScale})` }}>
        {/* Ripple rings */}
        {frame > 60 && (
          <>
            <div style={{ position: "absolute", top: "50%", left: "50%", width: 350, height: 80, marginTop: -40, marginLeft: -175, borderRadius: 40, border: "3px solid #4361ee", opacity: ripple1O, transform: `scale(${ripple1})`, pointerEvents: "none" as const }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", width: 350, height: 80, marginTop: -40, marginLeft: -175, borderRadius: 40, border: "3px solid #4361ee", opacity: ripple2O, transform: `scale(${ripple2})`, pointerEvents: "none" as const }} />
          </>
        )}

        <div
          style={{
            background: "linear-gradient(135deg, #4361ee, #3a0ca3)",
            borderRadius: 28,
            padding: "26px 70px",
            boxShadow: "0 8px 35px rgba(67, 97, 238, 0.35)",
            transform: `scale(${pulse})`,
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", fontFamily, letterSpacing: 0.5 }}>
            Start Practicing →
          </div>
        </div>
      </div>

      {/* Subdomain */}
      <div
        style={{
          marginTop: 30,
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
