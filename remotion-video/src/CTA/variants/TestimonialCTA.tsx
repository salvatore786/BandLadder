import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../styles/colors";
import { fontFamily } from "../../styles/fonts";

/**
 * CTA Variant 8: Testimonial / Social Proof
 * Star rating animation + student quote + "Join thousands" CTA
 */
export const TestimonialCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleO = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = spring({ frame, fps, from: 40, to: 0, durationInFrames: 20, config: { damping: 13 } });

  // Stars animation (fill one by one)
  const starCount = 5;
  const starDelay = 10;

  // Quote card
  const quoteY = spring({ frame: Math.max(0, frame - 35), fps, from: 80, to: 0, durationInFrames: 25, config: { damping: 14 } });
  const quoteO = interpolate(frame, [35, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Student avatars
  const avatarColors = ["#4361ee", "#7c3aed", "#e94560", "#2da87e", "#e6a817"];

  // Counter
  const counterProgress = interpolate(frame, [50, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const displayCount = Math.round(counterProgress * 10000);

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
          marginBottom: 10,
          lineHeight: 1.2,
        }}
      >
        Loved By{"\n"}Students! 💜
      </div>

      {/* Stars row */}
      <div style={{ display: "flex", gap: 10, marginTop: 20, marginBottom: 40 }}>
        {Array.from({ length: starCount }, (_, i) => {
          const fillProgress = interpolate(frame, [starDelay + i * 5, starDelay + i * 5 + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const starScale = spring({ frame: Math.max(0, frame - starDelay - i * 5), fps, from: 0.5, to: 1, durationInFrames: 12, config: { damping: 8 } });

          return (
            <div
              key={i}
              style={{
                fontSize: 52,
                transform: `scale(${starScale})`,
                filter: fillProgress < 1 ? "grayscale(100%)" : "none",
                opacity: 0.3 + fillProgress * 0.7,
              }}
            >
              ⭐
            </div>
          );
        })}
      </div>

      {/* Rating text */}
      <div
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: COLORS.textSecondary,
          fontFamily,
          marginBottom: 40,
          opacity: interpolate(frame, [30, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        4.8/5 from 2,000+ reviews
      </div>

      {/* Quote card */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 24,
          padding: "36px 44px",
          width: 740,
          border: "2px solid rgba(67, 97, 238, 0.1)",
          boxShadow: "0 8px 32px rgba(20, 25, 45, 0.06)",
          transform: `translateY(${quoteY}px)`,
          opacity: quoteO,
          position: "relative",
        }}
      >
        {/* Quote marks */}
        <div style={{ position: "absolute", top: 16, left: 24, fontSize: 60, color: "#4361ee", opacity: 0.15, fontFamily, lineHeight: 1 }}>"</div>

        <div style={{ fontSize: 24, fontWeight: 500, color: COLORS.textPrimary, fontFamily, lineHeight: 1.6, fontStyle: "italic", marginBottom: 24, paddingLeft: 10 }}>
          BandLadder helped me improve from Band 6 to Band 7.5 in just 3 weeks. The practice tests feel exactly like the real exam!
        </div>

        {/* Student info */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #4361ee, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 22, color: "#fff", fontWeight: 700, fontFamily }}>S</span>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, fontFamily }}>Sarah K.</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: COLORS.textTertiary, fontFamily }}>IELTS Band 7.5 · Verified Student</div>
          </div>
        </div>
      </div>

      {/* Student avatars strip */}
      <div style={{ display: "flex", marginTop: 40, alignItems: "center" }}>
        {avatarColors.map((color, i) => {
          const aScale = spring({ frame: Math.max(0, frame - 55 - i * 4), fps, from: 0, to: 1, durationInFrames: 14, config: { damping: 10 } });
          return (
            <div
              key={i}
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                border: "3px solid #fff",
                marginLeft: i > 0 ? -12 : 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${aScale})`,
                zIndex: starCount - i,
              }}
            >
              <span style={{ fontSize: 18, color: "#fff", fontWeight: 700, fontFamily }}>
                {["S", "A", "M", "R", "J"][i]}
              </span>
            </div>
          );
        })}
        <div
          style={{
            marginLeft: 14,
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.textPrimary,
            fontFamily,
            opacity: interpolate(frame, [70, 82], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {displayCount.toLocaleString()}+ students
        </div>
      </div>

      {/* Join CTA */}
      <div
        style={{
          marginTop: 35,
          fontSize: 26,
          fontWeight: 700,
          color: "#4361ee",
          fontFamily,
          opacity: interpolate(frame, [80, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Join them at bandladder.com →
      </div>
    </div>
  );
};
