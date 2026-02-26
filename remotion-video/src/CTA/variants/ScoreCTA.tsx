import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../styles/colors";
import { fontFamily } from "../../styles/fonts";

/**
 * CTA Variant 4: Score Boost
 * Animated counter stats (users, tests, score improvement) with progress ring
 */
export const ScoreCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { value: 10000, suffix: "+", label: "Students", emoji: "👨‍🎓", delay: 8 },
    { value: 50, suffix: "+", label: "Practice Tests", emoji: "📝", delay: 18 },
    { value: 2, suffix: "+", label: "Band Score Boost", emoji: "📈", delay: 28 },
  ];

  // Title
  const titleO = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = spring({ frame, fps, from: 40, to: 0, durationInFrames: 20, config: { damping: 13 } });

  // Score ring animation
  const ringProgress = interpolate(frame, [40, 90], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ringO = interpolate(frame, [35, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ringProgress);

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
          marginBottom: 10,
          lineHeight: 1.2,
        }}
      >
        Boost Your{"\n"}Band Score! 🚀
      </div>

      {/* Score ring */}
      <div style={{ position: "relative", width: 240, height: 240, margin: "30px 0", opacity: ringO }}>
        <svg width={240} height={240} style={{ transform: "rotate(-90deg)" }}>
          {/* Background circle */}
          <circle cx={120} cy={120} r={radius} fill="none" stroke="rgba(67, 97, 238, 0.1)" strokeWidth={14} />
          {/* Progress arc */}
          <circle
            cx={120} cy={120} r={radius} fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4361ee" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center text */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 240, height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#4361ee", fontFamily }}>
            {Math.round(ringProgress * 8.5 * 10) / 10}
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.textTertiary, fontFamily }}>Target Band</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 24, padding: "0 50px" }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, from: 0, to: 1, durationInFrames: 20, config: { damping: 11 } });
          // Animated counter
          const countProgress = interpolate(frame, [stat.delay, stat.delay + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const displayValue = stat.value >= 1000
            ? `${Math.round(countProgress * stat.value / 1000)}K`
            : `${Math.round(countProgress * stat.value * 10) / 10}`;

          return (
            <div
              key={i}
              style={{
                flex: 1,
                background: "#fff",
                borderRadius: 20,
                padding: "24px 16px",
                textAlign: "center",
                border: "2px solid rgba(67, 97, 238, 0.08)",
                boxShadow: "0 4px 16px rgba(20, 25, 45, 0.05)",
                transform: `scale(${s})`,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{stat.emoji}</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#4361ee", fontFamily }}>
                {displayValue}{stat.suffix}
              </div>
              <div style={{ fontSize: 18, fontWeight: 500, color: COLORS.textTertiary, fontFamily, marginTop: 4 }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div
        style={{
          marginTop: 45,
          fontSize: 26,
          fontWeight: 700,
          color: "#4361ee",
          fontFamily,
          opacity: interpolate(frame, [55, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Join at bandladder.com →
      </div>
    </div>
  );
};
