import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, staticFile } from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";
import { CTAEndScreenProps } from "../types";
import { FollowCTA } from "./variants/FollowCTA";
import { VisitCTA } from "./variants/VisitCTA";
import { PracticeCTA } from "./variants/PracticeCTA";
import { ScoreCTA } from "./variants/ScoreCTA";
import { FeaturesCTA } from "./variants/FeaturesCTA";
import { TrialCTA } from "./variants/TrialCTA";
import { SwipeCTA } from "./variants/SwipeCTA";
import { TestimonialCTA } from "./variants/TestimonialCTA";

const VARIANT_MAP = {
  follow: FollowCTA,
  visit: VisitCTA,
  practice: PracticeCTA,
  score: ScoreCTA,
  features: FeaturesCTA,
  trial: TrialCTA,
  swipe: SwipeCTA,
  testimonial: TestimonialCTA,
} as const;

export const CTAEndScreen: React.FC<CTAEndScreenProps> = ({ variant, durationSeconds, audioFileName }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fade in from white → content → hold
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const VariantComponent = VARIANT_MAP[variant];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(170deg, ${COLORS.bgGradientStart} 0%, ${COLORS.bgGradientMid} 50%, ${COLORS.bgGradientEnd} 100%)`,
        fontFamily,
        opacity: fadeIn,
      }}
    >
      {/* Voiceover audio */}
      {audioFileName && (
        <Audio src={staticFile(audioFileName)} volume={1} />
      )}

      {/* Decorative gradient orbs */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          top: -100,
          right: -150,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}, transparent)`,
          opacity: 0.06,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 350,
          height: 350,
          bottom: 300,
          left: -100,
          borderRadius: "50%",
          background: `radial-gradient(circle, #4361ee, transparent)`,
          opacity: 0.06,
        }}
      />

      {/* BandLadder logo at top */}
      <CTAHeader />

      {/* Variant-specific content */}
      <VariantComponent />

      {/* Watermark at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: COLORS.watermark,
            letterSpacing: 2,
            fontFamily,
          }}
        >
          @bandladder
        </span>
      </div>
    </AbsoluteFill>
  );
};

/** Shared header for all CTA screens */
const CTAHeader: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, from: 0.6, to: 1, durationInFrames: 20, config: { damping: 12 } });

  return (
    <div
      style={{
        position: "absolute",
        top: 100,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 2,
        transform: `scale(${logoScale})`,
      }}
    >
      {/* Logo icon */}
      <div
        style={{
          width: 72,
          height: 72,
          background: `linear-gradient(135deg, #4361ee, #3a0ca3)`,
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          fontWeight: 800,
          color: "#fff",
          fontFamily,
          boxShadow: `0 6px 30px rgba(67, 97, 238, 0.35)`,
          marginBottom: 16,
        }}
      >
        B
      </div>
      <div
        style={{
          fontSize: 42,
          fontWeight: 800,
          letterSpacing: -0.5,
          fontFamily,
          background: "linear-gradient(135deg, #1a1a2e 0%, #3d4663 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        BandLadder
      </div>
    </div>
  );
};
