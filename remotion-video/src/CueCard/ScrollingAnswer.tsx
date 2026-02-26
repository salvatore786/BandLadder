import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";
import { SentenceTiming } from "../types";

interface ScrollingAnswerProps {
  sentences: string[];
  sentenceTimings: SentenceTiming[];
  audioDurationSeconds: number;
  category: string;
}

/**
 * Model-answer phase with a centered pulsing mic icon, topic badge, and
 * vertically scrolling text with per-sentence voice-highlight sync.
 *
 * Inspired by voice-focused speaking reels: mic in centre, text card below.
 */
export const ScrollingAnswer: React.FC<ScrollingAnswerProps> = ({
  sentences,
  sentenceTimings,
  audioDurationSeconds,
  category,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeSec = frame / fps;

  // ── Active sentence ──
  const activeSentenceIndex = useMemo(() => {
    for (let i = sentenceTimings.length - 1; i >= 0; i--) {
      if (currentTimeSec >= sentenceTimings[i].startTime) return i;
    }
    return -1;
  }, [currentTimeSec, sentenceTimings]);

  // ── Layout constants ──
  const MIC_CENTER_Y = 480;           // centre of mic area (moved down)
  const TEXT_TOP = 750;                // where text container starts (shifted for larger mic)
  const SENTENCE_HEIGHT = 120;
  const VISIBLE_HEIGHT = 930;
  const CENTER_Y = VISIBLE_HEIGHT * 0.32;

  // ── Scroll position ──
  const scrollInputFrames: number[] = [0];
  const scrollOutputY: number[] = [0];

  for (let i = 0; i < sentenceTimings.length; i++) {
    const targetY = Math.max(0, i * SENTENCE_HEIGHT - CENTER_Y + SENTENCE_HEIGHT / 2);
    const startFrame = Math.ceil(sentenceTimings[i].startTime * fps);
    scrollInputFrames.push(
      Math.max(scrollInputFrames[scrollInputFrames.length - 1] + 1, startFrame + 8)
    );
    scrollOutputY.push(targetY);
  }

  const lastY = scrollOutputY[scrollOutputY.length - 1] || 0;
  scrollInputFrames.push(Math.ceil(audioDurationSeconds * fps) + 30);
  scrollOutputY.push(lastY);

  const scrollY = interpolate(frame, scrollInputFrames, scrollOutputY, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Entrance animations ──
  const enterScale = spring({
    fps,
    frame: frame - 3,
    config: { damping: 14, stiffness: 60, mass: 0.9 },
  });
  const badgeOpacity = interpolate(enterScale, [0, 1], [0, 1]);

  // ── Mic pulse (pulses with voice activity) ──
  const isSpeaking = activeSentenceIndex >= 0;
  const pulseBase = isSpeaking
    ? 1 + 0.06 * Math.sin(frame * 0.25)
    : 1 + 0.02 * Math.sin(frame * 0.08);
  const glowOpacity = isSpeaking
    ? 0.35 + 0.15 * Math.sin(frame * 0.2)
    : 0.12;

  // ── Sound wave rings around mic ──
  const ringCount = 3;
  const rings = Array.from({ length: ringCount }, (_, i) => {
    const ringFrame = (frame + i * 18) % 60;
    const ringScale = interpolate(ringFrame, [0, 60], [0.7, 1.8]);
    const ringOp = isSpeaking
      ? interpolate(ringFrame, [0, 30, 60], [0.3, 0.15, 0])
      : interpolate(ringFrame, [0, 30, 60], [0.08, 0.04, 0]);
    return { scale: ringScale, opacity: ringOp };
  });

  return (
    <>
      {/* ── Mic area (centred top section) ── */}
      <div
        style={{
          position: "absolute",
          top: MIC_CENTER_Y - 200,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 8,
          opacity: badgeOpacity,
          pointerEvents: "none" as const,
        }}
      >
        {/* Pulsing sound wave rings */}
        {rings.map((ring, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 340,
              height: 340,
              marginLeft: -170,
              marginTop: -170,
              borderRadius: "50%",
              border: `2px solid ${COLORS.primary}`,
              opacity: ring.opacity,
              transform: `scale(${ring.scale})`,
            }}
          />
        ))}

        {/* Mic circle */}
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            transform: `scale(${pulseBase})`,
            boxShadow: `0 0 ${isSpeaking ? 50 : 20}px rgba(233, 69, 96, ${glowOpacity})`,
          }}
        >
          {/* Mic icon (SVG) */}
          <svg width="104" height="104" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3" fill="white" />
            <path
              d="M5 11a7 7 0 0 0 14 0"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="9" y1="22" x2="15" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* "Speaking" indicator */}
        {isSpeaking && (
          <div
            style={{
              marginTop: 18,
              fontSize: 16,
              fontWeight: 600,
              color: COLORS.primary,
              letterSpacing: 3,
              textTransform: "uppercase" as const,
              fontFamily,
              opacity: 0.6 + 0.3 * Math.sin(frame * 0.15),
            }}
          >
            Speaking...
          </div>
        )}
      </div>

      {/* ── Category + Model Answer badge ── */}
      <div
        style={{
          position: "absolute",
          top: TEXT_TOP - 55,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: badgeOpacity,
          zIndex: 7,
          pointerEvents: "none" as const,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 30px",
            background: "rgba(233, 69, 96, 0.1)",
            border: "1px solid rgba(233, 69, 96, 0.2)",
            borderRadius: 50,
            fontSize: 24,
            fontWeight: 600,
            color: COLORS.primary,
            letterSpacing: 1.5,
            textTransform: "uppercase" as const,
            fontFamily,
          }}
        >
          {category} {"\u2022"} Model Answer
        </div>
      </div>

      {/* ── Scrolling text container ── */}
      <div
        style={{
          position: "absolute",
          top: TEXT_TOP,
          left: 40,
          right: 40,
          height: VISIBLE_HEIGHT,
          overflow: "hidden",
          zIndex: 5,
          pointerEvents: "none" as const,
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 4%, black 85%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 4%, black 85%, transparent 100%)",
        }}
      >
        <div
          style={{
            transform: `translateY(${-scrollY}px)`,
            paddingTop: CENTER_Y,
            paddingBottom: VISIBLE_HEIGHT,
          }}
        >
          {sentences.map((sentence, i) => {
            const isActive = i === activeSentenceIndex;
            const isPast = activeSentenceIndex >= 0 && i < activeSentenceIndex;
            const isFuture = activeSentenceIndex < 0 || i > activeSentenceIndex;

            const timing = sentenceTimings[i];
            const entranceFrame = timing
              ? Math.ceil(timing.startTime * fps) - 12
              : i * 30;
            const sentenceEnter = spring({
              fps,
              frame: frame - Math.max(0, entranceFrame),
              config: { damping: 20, stiffness: 80, mass: 0.7 },
            });
            const enterOpacity = interpolate(sentenceEnter, [0, 1], [0, 1]);
            const enterX = interpolate(sentenceEnter, [0, 1], [40, 0]);

            const highlightPulse = isActive
              ? 1 + 0.006 * Math.sin(frame * 0.12)
              : 1;

            const barWidth = isActive
              ? timing
                ? interpolate(
                    currentTimeSec,
                    [timing.startTime, timing.endTime],
                    [0, 100],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  )
                : 100
              : 0;

            const finalOpacity = isFuture
              ? enterOpacity * 0.55
              : isPast
                ? 0.4
                : 1;

            return (
              <div
                key={i}
                style={{
                  position: "relative",
                  fontSize: isActive ? 32 : 27,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive
                    ? COLORS.textPrimary
                    : isPast
                      ? COLORS.textTertiary
                      : COLORS.textSecondary,
                  lineHeight: 1.55,
                  padding: isActive ? "16px 24px" : "12px 24px",
                  marginBottom: 10,
                  borderRadius: 14,
                  background: isActive
                    ? "rgba(255, 255, 255, 0.75)"
                    : "transparent",
                  borderLeft: isActive
                    ? `4px solid ${COLORS.primary}`
                    : "4px solid transparent",
                  boxShadow: isActive
                    ? "0 4px 24px rgba(233, 69, 96, 0.1), 0 2px 8px rgba(0,0,0,0.04)"
                    : "none",
                  opacity: finalOpacity,
                  transform: `translateX(${isFuture ? enterX : 0}px) scale(${highlightPulse})`,
                  fontFamily,
                }}
              >
                {sentence}

                {/* Progress bar under active sentence */}
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 4,
                      left: 24,
                      height: 3,
                      width: `${barWidth}%`,
                      maxWidth: "calc(100% - 48px)",
                      background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`,
                      borderRadius: 2,
                      opacity: 0.6,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
