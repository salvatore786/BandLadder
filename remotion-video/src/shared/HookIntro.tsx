import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

interface HookIntroProps {
  /** e.g. "IELTS" or "PTE" */
  examType?: "IELTS" | "PTE";
  /** e.g. "Multiple Choice" or "Sentence Completion" */
  questionTypeLabel: string;
  /** Duration of this intro overlay in seconds (default 5) */
  introDuration?: number;
  /** e.g. "Listening" or "Speaking" — defaults to "Listening" */
  sectionLabel?: string;
}

/**
 * A 5-second hook/intro overlay that appears at the very start of the reel.
 *
 * Timeline (at 30fps = 150 frames):
 *   0-30   (0-1s)   — Background fades in, rings burst, "Let's Practice" slides in
 *   30-60  (1-2s)   — "IELTS Listening" slams in with scale punch + impact sound
 *   60-90  (2-3s)   — Question type label slides in, accent bar sweeps
 *   90-120 (3-4s)   — Everything holds, subtle pulse, logo visible
 *  120-150 (4-5s)   — Smooth fade out to the main content
 */
export const HookIntro: React.FC<HookIntroProps> = ({
  examType = "IELTS",
  questionTypeLabel,
  introDuration = 5,
  sectionLabel = "Listening",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const introFrames = Math.ceil(introDuration * fps); // 150 frames at 30fps

  // Don't render after intro is done
  if (frame >= introFrames) return null;

  // ── Overall fade out in the last 20 frames (smoother exit) ──
  const fadeOut = interpolate(
    frame,
    [introFrames - 25, introFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Background fade in ──
  const bgIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Line 1: "Let's Practice" — enters at ~0.3s ──
  const line1Enter = spring({
    fps,
    frame: frame - 10,
    config: { damping: 20, stiffness: 80, mass: 0.7 },
  });
  const line1X = interpolate(line1Enter, [0, 1], [700, 0]);
  const line1Opacity = interpolate(line1Enter, [0, 1], [0, 1]);

  // ── Line 2: "IELTS Listening" — enters at ~1s with slam effect ──
  const line2Enter = spring({
    fps,
    frame: frame - 30,
    config: { damping: 12, stiffness: 120, mass: 0.8 },
  });
  const line2X = interpolate(line2Enter, [0, 1], [900, 0]);
  const line2Opacity = interpolate(line2Enter, [0, 1], [0, 1]);

  // Scale slam: overshoots then settles
  const line2Scale = spring({
    fps,
    frame: frame - 30,
    config: { damping: 8, stiffness: 150, mass: 0.6 },
  });
  const line2ScaleVal = interpolate(line2Scale, [0, 1], [0.6, 1.0]);

  // Subtle breathing pulse after landing (3-4s range)
  const breathePulse =
    frame >= 90 && frame <= 120
      ? 1 + 0.015 * Math.sin(((frame - 90) / 30) * Math.PI * 2)
      : 1;

  // ── Line 3: Question type label — enters at ~2s ──
  const line3Enter = spring({
    fps,
    frame: frame - 60,
    config: { damping: 14, stiffness: 90, mass: 0.7 },
  });
  const line3X = interpolate(line3Enter, [0, 1], [1000, 0]);
  const line3Opacity = interpolate(line3Enter, [0, 1], [0, 1]);
  const line3Scale = spring({
    fps,
    frame: frame - 60,
    config: { damping: 10, stiffness: 130, mass: 0.5 },
  });
  const line3ScaleVal = interpolate(line3Scale, [0, 1], [0.7, 1.0]);

  // ── Expanding rings — 2 bursts: at start and at line2 impact ──
  const ringBursts = [
    { startFrame: 0, cx: 540, cy: 960 },
    { startFrame: 32, cx: 540, cy: 880 },
  ];

  // ── Accent bars — sweep across at different times ──
  const bar1X = interpolate(frame, [20, 80], [1400, -400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bar2X = interpolate(frame, [60, 120], [1400, -400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bar3X = interpolate(frame, [40, 100], [-400, 1400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Underline bar grows when line2 lands ──
  const underlineWidth = interpolate(
    frame,
    [35, 55],
    [0, 350],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── BandLadder logo — fades in at ~2.5s ──
  const logoOpacity = interpolate(frame, [70, 90], [0, 0.85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Corner accent shapes ──
  const cornerIn = interpolate(frame, [5, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        zIndex: 100,
        opacity: fadeOut,
        fontFamily,
      }}
    >
      {/* Background */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(170deg, ${COLORS.bgGradientStart} 0%, ${COLORS.bgGradientMid} 40%, ${COLORS.bgGradientEnd} 100%)`,
          opacity: bgIn,
        }}
      />

      {/* Corner accent — top-right */}
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}, transparent 70%)`,
          opacity: 0.1 * cornerIn * fadeOut,
          transform: `scale(${cornerIn})`,
        }}
      />

      {/* Corner accent — bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          left: -120,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.accent}, transparent 70%)`,
          opacity: 0.08 * cornerIn * fadeOut,
          transform: `scale(${cornerIn})`,
        }}
      />

      {/* Expanding ring bursts */}
      {ringBursts.map((burst, bi) =>
        [0, 1, 2, 3].map((i) => {
          const ringDelay = burst.startFrame + i * 6;
          const rFrame = Math.max(0, frame - ringDelay);
          const rScale = interpolate(rFrame, [0, 50], [0.05, 3.0 + i * 0.4], {
            extrapolateRight: "clamp",
          });
          const rOpacity = interpolate(
            rFrame,
            [0, 8, 40, 50],
            [0, 0.18, 0.03, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          return (
            <div
              key={`ring-${bi}-${i}`}
              style={{
                position: "absolute",
                left: burst.cx - 200,
                top: burst.cy - 200,
                width: 400,
                height: 400,
                borderRadius: "50%",
                border: `${3 - i * 0.5}px solid ${i % 2 === 0 ? COLORS.primary : COLORS.accent}`,
                opacity: rOpacity * fadeOut,
                transform: `scale(${rScale})`,
                boxSizing: "border-box",
              }}
            />
          );
        })
      )}

      {/* Diagonal accent bars */}
      <div
        style={{
          position: "absolute",
          top: 820,
          left: bar1X,
          width: 1600,
          height: 8,
          background: `linear-gradient(90deg, transparent, ${COLORS.primary}, ${COLORS.primaryLight}, transparent)`,
          opacity: 0.35 * fadeOut,
          transform: "rotate(-3deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 1100,
          left: bar2X,
          width: 1600,
          height: 5,
          background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`,
          opacity: 0.25 * fadeOut,
          transform: "rotate(-2deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 700,
          left: bar3X,
          width: 1400,
          height: 4,
          background: `linear-gradient(90deg, transparent, rgba(20,25,45,0.12), transparent)`,
          opacity: fadeOut,
          transform: "rotate(2deg)",
        }}
      />

      {/* Decorative floating dots */}
      {[...Array(8)].map((_, i) => {
        const dotDelay = 5 + i * 5;
        const dotIn = interpolate(frame, [dotDelay, dotDelay + 15], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const dotFloat = Math.sin((frame - dotDelay) * 0.08 + i) * 10;
        return (
          <div
            key={`dot-${i}`}
            style={{
              position: "absolute",
              left: 80 + i * 125,
              top: 730 + dotFloat,
              width: 8 + (i % 3) * 4,
              height: 8 + (i % 3) * 4,
              borderRadius: "50%",
              background: i % 3 === 0 ? COLORS.primary : i % 3 === 1 ? COLORS.accent : COLORS.success,
              opacity: 0.15 * dotIn * fadeOut,
            }}
          />
        );
      })}

      {/* Sparkle particles that appear on impact */}
      {frame >= 30 && frame <= 80 &&
        [...Array(6)].map((_, i) => {
          const sparkleFrame = frame - 32 - i * 2;
          if (sparkleFrame < 0) return null;
          const angle = (i * 60 + 15) * (Math.PI / 180);
          const distance = sparkleFrame * 4;
          const sparkleOpacity = Math.max(0, 1 - sparkleFrame / 30);
          return (
            <div
              key={`sparkle-${i}`}
              style={{
                position: "absolute",
                left: 540 + Math.cos(angle) * distance - 4,
                top: 900 + Math.sin(angle) * distance - 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i % 2 === 0 ? COLORS.primary : COLORS.accent,
                opacity: sparkleOpacity * 0.6 * fadeOut,
              }}
            />
          );
        })}

      {/* ── Main text content ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Line 1: "Let's Practice" */}
        <div
          style={{
            fontSize: 44,
            fontWeight: 500,
            color: COLORS.textSecondary,
            letterSpacing: 6,
            textTransform: "uppercase" as const,
            marginBottom: 24,
            transform: `translateX(${line1X}px)`,
            opacity: line1Opacity * fadeOut,
            fontFamily,
          }}
        >
          Let's Practice
        </div>

        {/* Line 2: "IELTS/PTE Listening" — BIG BOLD SLAM */}
        <div
          style={{
            fontSize: 86,
            fontWeight: 900,
            color: COLORS.textPrimary,
            letterSpacing: -1,
            lineHeight: 1.1,
            marginBottom: 12,
            transform: `translateX(${line2X}px) scale(${line2ScaleVal * breathePulse})`,
            opacity: line2Opacity * fadeOut,
            fontFamily,
            textAlign: "center",
          }}
        >
          {examType} {sectionLabel}
        </div>

        {/* Accent underline bar */}
        <div
          style={{
            width: underlineWidth,
            height: 7,
            background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
            borderRadius: 4,
            marginBottom: 28,
            opacity: line2Opacity * fadeOut,
          }}
        />

        {/* Line 3: Question type — accent colored, slam in */}
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: COLORS.primary,
            letterSpacing: 1,
            transform: `translateX(${line3X}px) scale(${line3ScaleVal})`,
            opacity: line3Opacity * fadeOut,
            fontFamily,
            textAlign: "center",
            padding: "0 50px",
          }}
        >
          {questionTypeLabel}
        </div>
      </div>

      {/* Hook intro sound effect */}
      <Audio src={staticFile("hook_intro_sound.mp3")} volume={0.85} />

      {/* BandLadder logo at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 180,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          opacity: logoOpacity * fadeOut,
        }}
      >
        {/* Logo icon */}
        <div
          style={{
            width: 48,
            height: 48,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 800,
            color: "#fff",
            fontFamily,
            boxShadow: `0 4px 18px rgba(233, 69, 96, 0.4)`,
          }}
        >
          B
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: -0.3,
            fontFamily,
            background: "linear-gradient(135deg, #1a1a2e 0%, #3d4663 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          BandLadder
        </div>
      </div>
    </AbsoluteFill>
  );
};
