import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { CueCardProps } from "../types";
import { fontFamily } from "../styles/fonts";
import { COLORS } from "../styles/colors";
import { Background } from "../shared/Background";
import { FloatingParticles } from "../shared/FloatingParticles";
import { Header } from "../shared/Header";
import { HookIntro } from "../shared/HookIntro";
import { ProgressBar } from "../shared/ProgressBar";
import { AudioWaveViz } from "../shared/AudioWaveViz";
import { Watermark } from "../shared/Watermark";
import { GlowOrbs } from "../shared/GlowOrbs";
import { MusicNotes } from "../shared/MusicNotes";
import { PulsingRings } from "../shared/PulsingRings";
import { CueCardDisplay } from "./CueCardDisplay";
import { ScrollingAnswer } from "./ScrollingAnswer";

/**
 * IELTS Speaking Part 2 — Cue Card Composition
 *
 * Timeline:
 *   Hook Intro (0-5s)   — "IELTS Speaking / Speaking Part 2"
 *   Cue Card   (5-8s)   — Topic + bullet points on a styled card
 *   Model Answer (8s+)  — Mic icon + scrolling text with voice highlight
 *   CTA appended after render by the Python pipeline via ffmpeg
 */
export const CueCard: React.FC<CueCardProps> = ({
  topic,
  bulletPoints,
  modelAnswerSentences,
  sentenceTimings,
  cueCardDisplayDuration = 10,
  category,
  scenarioDescription,
  durationSeconds,
  audioDurationSeconds,
  audioFileName,
  hookIntroDuration = 0,
  questionTypeLabel = "Speaking Part 2",
  examType = "IELTS",
  backgroundMusicFileName,
  sectionLabel = "Speaking",
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const hookFrames = Math.ceil(hookIntroDuration * fps);
  const cueCardFrames = Math.ceil(cueCardDisplayDuration * fps);
  const contentDuration = durationSeconds - hookIntroDuration;

  // Fade out the title section as the scrolling answer phase begins
  const contentFrame = frame - hookFrames;
  const titleOpacity = interpolate(
    contentFrame,
    [cueCardFrames - 20, cueCardFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ fontFamily }}>
      {/* ── Hook intro overlay ── */}
      {hookIntroDuration > 0 && (
        <HookIntro
          examType={examType}
          questionTypeLabel={questionTypeLabel}
          introDuration={hookIntroDuration}
          sectionLabel={sectionLabel}
        />
      )}

      {/* ── Main content — starts after hook intro ── */}
      <Sequence from={hookFrames}>
        <AbsoluteFill style={{ fontFamily }}>
          {/* Dynamic background layers */}
          <Background />
          <GlowOrbs />
          <FloatingParticles />
          <PulsingRings />
          <MusicNotes />

          {/* Header: BandLadder logo + exam type */}
          <Header examType={examType} />

          {/* Title section — fades out when model answer starts */}
          <div
            style={{
              textAlign: "center",
              padding: "0 60px",
              position: "relative",
              zIndex: 2,
              opacity: titleOpacity,
            }}
          >
            {/* Category badge */}
            <div
              style={{
                display: "inline-block",
                padding: "8px 26px",
                background: "rgba(233, 69, 96, 0.12)",
                border: "1px solid rgba(233, 69, 96, 0.25)",
                borderRadius: 50,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.primary,
                letterSpacing: 2,
                textTransform: "uppercase" as const,
                marginBottom: 18,
                fontFamily,
              }}
            >
              {category}
            </div>

            <h1
              style={{
                fontSize: 42,
                fontWeight: 800,
                marginBottom: 8,
                letterSpacing: -0.5,
                color: COLORS.textPrimary,
                fontFamily,
              }}
            >
              Speaking Part 2
            </h1>

            <div
              style={{
                width: 180,
                height: 4,
                background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
                margin: "0 auto 14px",
                borderRadius: 2,
              }}
            />

            <p
              style={{
                fontSize: 22,
                fontWeight: 400,
                color: COLORS.textTertiary,
                lineHeight: 1.5,
                fontFamily,
                margin: 0,
              }}
            >
              {scenarioDescription}
            </p>
          </div>

          {/* ── Phase 1: Cue Card Display ── */}
          <CueCardDisplay
            topic={topic}
            bulletPoints={bulletPoints}
            displayDurationFrames={cueCardFrames}
          />

          {/* ── Phase 2: Scrolling Model Answer with Mic ── */}
          <Sequence from={cueCardFrames}>
            <ScrollingAnswer
              sentences={modelAnswerSentences}
              sentenceTimings={sentenceTimings}
              audioDurationSeconds={audioDurationSeconds}
              category={category}
            />
          </Sequence>

          {/* ── Voice narration audio ── */}
          <Sequence from={cueCardFrames}>
            <Audio src={staticFile(audioFileName)} volume={0.95} />
          </Sequence>

          {/* ── Background music ── */}
          {backgroundMusicFileName && (
            <Audio
              src={staticFile(backgroundMusicFileName)}
              volume={0.12}
              loop
            />
          )}

          {/* Bottom elements */}
          <AudioWaveViz />
          <ProgressBar durationSeconds={contentDuration} />
          <Watermark />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
