import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../styles/colors";
import { fontFamily } from "../../styles/fonts";

/**
 * CTA Variant 2: Visit Platform
 * Phone mockup showing BandLadder.com with floating URL and "Try it free" badge
 */
export const VisitCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phone mockup slide up
  const phoneY = spring({ frame, fps, from: 200, to: 0, durationInFrames: 30, config: { damping: 14 } });
  const phoneOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // URL fade in
  const urlOpacity = interpolate(frame, [25, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const urlScale = spring({ frame: Math.max(0, frame - 25), fps, from: 0.8, to: 1, durationInFrames: 20, config: { damping: 12 } });

  // Floating badge bounce
  const badgeScale = spring({ frame: Math.max(0, frame - 40), fps, from: 0, to: 1, durationInFrames: 20, config: { damping: 8, mass: 0.7 } });
  const badgeRotate = spring({ frame: Math.max(0, frame - 40), fps, from: -12, to: -5, durationInFrames: 25, config: { damping: 10 } });

  // Shimmer on phone
  const shimmerX = interpolate(frame, [15, 60], [-200, 600], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2 }}>

      {/* Phone mockup */}
      <div
        style={{
          width: 380,
          height: 680,
          background: "#ffffff",
          borderRadius: 40,
          border: "6px solid rgba(20, 25, 45, 0.12)",
          boxShadow: "0 20px 60px rgba(20, 25, 45, 0.15), 0 8px 25px rgba(67, 97, 238, 0.1)",
          overflow: "hidden",
          position: "relative",
          transform: `translateY(${phoneY}px)`,
          opacity: phoneOpacity,
        }}
      >
        {/* Status bar */}
        <div style={{ height: 50, background: "#4361ee", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", fontFamily, letterSpacing: 0.5 }}>bandladder.com</div>
        </div>

        {/* Screen content - simplified platform mockup */}
        <div style={{ padding: "24px 20px" }}>
          {/* Mini logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <div style={{ width: 28, height: 28, background: "#4361ee", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, fontFamily }}>B</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, fontFamily }}>BandLadder</div>
          </div>

          {/* Hero text */}
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, fontFamily, marginBottom: 8 }}>English Language</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, fontFamily, marginBottom: 16 }}>Exam Simulation</div>

          {/* Cards */}
          {["IELTS", "PTE"].map((exam, i) => (
            <div key={i} style={{ background: i === 0 ? "linear-gradient(135deg, #4361ee10, #4361ee05)" : "linear-gradient(135deg, #7c3aed10, #7c3aed05)", borderRadius: 12, padding: "14px 16px", marginBottom: 12, border: `1px solid ${i === 0 ? "#4361ee" : "#7c3aed"}20` }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, fontFamily }}>{exam}</div>
              <div style={{ fontSize: 11, color: COLORS.textTertiary, fontFamily, marginTop: 4 }}>Practice Tests Available</div>
              <div style={{ marginTop: 10, background: i === 0 ? "#4361ee" : "#7c3aed", borderRadius: 8, padding: "8px 0", textAlign: "center" as const }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily }}>Explore {exam} Tests →</div>
              </div>
            </div>
          ))}

          {/* Features row */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {["Authentic", "Feedback", "Versions"].map((f, i) => (
              <div key={i} style={{ flex: 1, background: "rgba(20,25,45,0.03)", borderRadius: 8, padding: "8px 4px", textAlign: "center" as const }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, fontFamily }}>{f}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Shimmer effect */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: shimmerX,
            width: 80,
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
            transform: "skewX(-15deg)",
          }}
        />
      </div>

      {/* "FREE" badge */}
      <div
        style={{
          position: "absolute",
          top: 360,
          right: 130,
          background: "linear-gradient(135deg, #e94560, #ff6b6b)",
          borderRadius: 16,
          padding: "12px 24px",
          transform: `scale(${badgeScale}) rotate(${badgeRotate}deg)`,
          boxShadow: "0 6px 20px rgba(233, 69, 96, 0.3)",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily }}>Try FREE!</div>
      </div>

      {/* URL */}
      <div
        style={{
          marginTop: 50,
          opacity: urlOpacity,
          transform: `scale(${urlScale})`,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 500, color: COLORS.textTertiary, fontFamily, marginBottom: 10 }}>
          Start practicing now at
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: "#4361ee",
            fontFamily,
            letterSpacing: -0.5,
          }}
        >
          BandLadder.com
        </div>
      </div>
    </div>
  );
};
