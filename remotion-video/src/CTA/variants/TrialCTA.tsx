import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../styles/colors";
import { fontFamily } from "../../styles/fonts";

/**
 * CTA Variant 6: Free Trial
 * Pricing card with "Free 3-Day Trial" offer badge and plan comparison
 */
export const TrialCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card rise
  const cardY = spring({ frame, fps, from: 120, to: 0, durationInFrames: 25, config: { damping: 14 } });
  const cardO = interpolate(frame, [3, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Badge pop
  const badgeScale = spring({ frame: Math.max(0, frame - 25), fps, from: 0, to: 1, durationInFrames: 18, config: { damping: 8, mass: 0.7 } });

  // Features check stagger
  const features = [
    "Unlimited Mock Tests",
    "AI-Powered Feedback",
    "All Question Types",
    "Progress Tracking",
    "Expert Strategies",
  ];

  // Glow pulse
  const glowPulse = 0.2 + Math.sin(frame * 0.08) * 0.1;

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2 }}>

      {/* Heading */}
      <div
        style={{
          fontSize: 44,
          fontWeight: 800,
          color: COLORS.textPrimary,
          textAlign: "center",
          fontFamily,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          marginBottom: 40,
          lineHeight: 1.2,
        }}
      >
        Start Your Free{"\n"}Trial Today! 🎉
      </div>

      {/* Pricing card */}
      <div
        style={{
          position: "relative",
          background: "#ffffff",
          borderRadius: 28,
          padding: "40px 50px",
          width: 680,
          border: "3px solid rgba(67, 97, 238, 0.15)",
          boxShadow: `0 12px 45px rgba(67, 97, 238, ${glowPulse})`,
          transform: `translateY(${cardY}px)`,
          opacity: cardO,
        }}
      >
        {/* Plan name + price */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: COLORS.textTertiary, fontFamily, textTransform: "uppercase" as const, letterSpacing: 3, marginBottom: 8 }}>Pro Plan</div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 600, color: COLORS.textTertiary, fontFamily, textDecoration: "line-through" }}>₹5,000</span>
            <span style={{ fontSize: 56, fontWeight: 800, color: "#4361ee", fontFamily, marginLeft: 12 }}>FREE</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, color: COLORS.textSecondary, fontFamily, marginTop: 4 }}>for 3 days — no card needed</div>
        </div>

        {/* Divider */}
        <div style={{ height: 2, background: "rgba(67, 97, 238, 0.08)", borderRadius: 1, marginBottom: 28 }} />

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {features.map((feat, i) => {
            const checkO = interpolate(frame, [30 + i * 6, 36 + i * 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const checkX = spring({ frame: Math.max(0, frame - 30 - i * 6), fps, from: -20, to: 0, durationInFrames: 15, config: { damping: 12 } });

            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, opacity: checkO, transform: `translateX(${checkX}px)` }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#2da87e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>✓</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 500, color: COLORS.textPrimary, fontFamily }}>{feat}</div>
              </div>
            );
          })}
        </div>

        {/* CTA button in card */}
        <div
          style={{
            marginTop: 35,
            background: "linear-gradient(135deg, #4361ee, #3a0ca3)",
            borderRadius: 18,
            padding: "22px 0",
            textAlign: "center",
            boxShadow: "0 6px 25px rgba(67, 97, 238, 0.3)",
            opacity: interpolate(frame, [60, 72], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", fontFamily }}>Sign Up & Start Free →</div>
        </div>
      </div>

      {/* Offer badge */}
      <div
        style={{
          position: "absolute",
          top: 340,
          right: 100,
          background: "linear-gradient(135deg, #e94560, #ff6b6b)",
          borderRadius: "50%",
          width: 110,
          height: 110,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${badgeScale}) rotate(-12deg)`,
          boxShadow: "0 6px 20px rgba(233, 69, 96, 0.35)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily }}>3 DAYS</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily }}>FREE</div>
      </div>
    </div>
  );
};
