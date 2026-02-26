import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { HighlightIncorrectProps } from "../types";
import { HookIntro } from "../shared/HookIntro";
import { fontFamily } from "../styles/fonts";
import { COLORS } from "../styles/colors";
import { Background } from "../shared/Background";
import { FloatingParticles } from "../shared/FloatingParticles";
import { Header } from "../shared/Header";
import { ProgressBar } from "../shared/ProgressBar";
import { AudioWaveViz } from "../shared/AudioWaveViz";
import { Watermark } from "../shared/Watermark";
import { GlowOrbs } from "../shared/GlowOrbs";
import { MusicNotes } from "../shared/MusicNotes";
import { PulsingRings } from "../shared/PulsingRings";
import { SpinningVinylRecord } from "../shared/SpinningVinylRecord";

export const HighlightIncorrect: React.FC<HighlightIncorrectProps> = ({
  transcript,
  incorrectWords,
  category,
  scenarioDescription,
  durationSeconds,
  audioDurationSeconds,
  audioFileName,
  examType = "PTE",
  hookIntroDuration = 0,
  questionTypeLabel = "Highlight Incorrect",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hookFrames = Math.ceil(hookIntroDuration * fps);
  const totalFrames = Math.ceil(durationSeconds * fps);
  const audioFrames = Math.ceil(audioDurationSeconds * fps);

  // Timing: transcript appears during audio, corrections start AFTER audio ends
  const transcriptAppear = Math.floor(audioFrames * 0.12);
  // Corrections start 1 second after audio ends
  const correctionsStart = Math.ceil((audioDurationSeconds + 1) * fps);
  // Space corrections across the remaining time (about 3 seconds)
  const remainingFrames = totalFrames - correctionsStart;
  const correctionSpacing = Math.floor((remainingFrames * 0.7) / Math.max(incorrectWords.length, 1));

  const words = transcript.split(" ");

  // Build word-level rendering
  const wordElements = words.map((word, idx) => {
    const incorrectEntry = incorrectWords.find((iw) => iw.wordIndex === idx);

    if (!incorrectEntry) {
      // Normal word
      return (
        <span key={idx} style={{ marginRight: 10 }}>
          {word}
        </span>
      );
    }

    // This word is incorrect — calculate its reveal timing
    const entryIndex = incorrectWords.indexOf(incorrectEntry);
    const revealFrame = correctionsStart + entryIndex * correctionSpacing;
    const isRevealed = frame >= revealFrame;
    const elapsed = isRevealed ? frame - revealFrame : 0;

    const strikethroughProgress = isRevealed
      ? interpolate(elapsed, [0, 10], [0, 1], { extrapolateRight: "clamp" })
      : 0;

    const correctionOpacity = isRevealed
      ? interpolate(elapsed, [5, 18], [0, 1], { extrapolateRight: "clamp" })
      : 0;

    const correctionScale = isRevealed
      ? interpolate(elapsed, [5, 12, 18], [0.8, 1.05, 1.0], { extrapolateRight: "clamp" })
      : 0;

    return (
      <span
        key={idx}
        style={{
          display: "inline-block",
          position: "relative",
          marginRight: 10,
        }}
      >
        {/* Original word with strikethrough */}
        <span
          style={{
            color: isRevealed ? "#ff4757" : COLORS.textPrimary,
            textDecoration: isRevealed ? "line-through" : "none",
            textDecorationColor: "#ff4757",
            textDecorationThickness: 3,
            opacity: isRevealed ? 0.5 + (1 - strikethroughProgress) * 0.5 : 1,
          }}
        >
          {word}
        </span>

        {/* Correction above */}
        {isRevealed && (
          <span
            style={{
              position: "absolute",
              top: -32,
              left: "50%",
              transform: `translateX(-50%) scale(${correctionScale})`,
              opacity: correctionOpacity,
              color: COLORS.success,
              fontWeight: 800,
              fontSize: 22,
              whiteSpace: "nowrap",
              textShadow: "0 2px 8px rgba(78, 204, 163, 0.4)",
            }}
          >
            {incorrectEntry.correction}
          </span>
        )}
      </span>
    );
  });

  // Transcript entrance
  const transcriptEnter = frame >= transcriptAppear
    ? spring({
        fps,
        frame: frame - transcriptAppear,
        config: { damping: 14, stiffness: 100, mass: 0.8 },
      })
    : 0;

  return (
    <AbsoluteFill>
      {hookIntroDuration > 0 && (
        <HookIntro
          examType={examType}
          questionTypeLabel={questionTypeLabel}
          introDuration={hookIntroDuration}
        />
      )}
      <Sequence from={hookFrames}>
        <AbsoluteFill style={{ fontFamily }}>
          <Background />
          <GlowOrbs />
          <FloatingParticles />
          <PulsingRings />
          <MusicNotes />
          <SpinningVinylRecord />
          <Header examType={examType} />

          {/* Title Section */}
          <div
            style={{
              textAlign: "center",
              padding: "0 60px",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "10px 30px",
                background: "rgba(78, 204, 163, 0.15)",
                border: "1px solid rgba(78, 204, 163, 0.3)",
                borderRadius: 50,
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.success,
                letterSpacing: 2,
                textTransform: "uppercase" as const,
                marginBottom: 25,
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
                color: "rgba(20, 25, 45, 0.92)",
                fontFamily,
              }}
            >
              Highlight Incorrect Words
            </h1>

            <div
              style={{
                width: 200,
                height: 5,
                background: `linear-gradient(90deg, #ff4757, ${COLORS.success})`,
                margin: "0 auto 20px",
                borderRadius: 3,
              }}
            />

            <p
              style={{
                fontSize: 24,
                fontWeight: 400,
                color: "rgba(20, 25, 45, 0.55)",
                lineHeight: 1.5,
                fontFamily,
              }}
            >
              {scenarioDescription}
            </p>
          </div>

          {/* Instructions */}
          <div
            style={{
              textAlign: "center",
              margin: "25px 60px",
              padding: "16px 30px",
              background: COLORS.subtleBg,
              borderRadius: 16,
              border: `1px solid ${COLORS.subtleBorder}`,
              position: "relative",
              zIndex: 2,
            }}
          >
            <p
              style={{
                fontSize: 22,
                color: COLORS.textTertiary,
                fontWeight: 400,
                fontFamily,
                margin: 0,
              }}
            >
              {"\uD83C\uDFA7"} Listen and identify the incorrect words
            </p>
          </div>

          {/* Transcript */}
          <div
            style={{
              margin: "20px 50px",
              padding: "36px 32px",
              background: "rgba(20, 25, 45, 0.04)",
              border: "1px solid rgba(20, 25, 45, 0.08)",
              borderRadius: 24,
              position: "relative",
              zIndex: 2,
              opacity: interpolate(transcriptEnter, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(transcriptEnter, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontSize: 26,
                lineHeight: 2.2,
                color: COLORS.textPrimary,
                fontWeight: 400,
                fontFamily,
                flexWrap: "wrap",
                display: "flex",
              }}
            >
              {wordElements}
            </div>
          </div>

          <AudioWaveViz />
          <ProgressBar durationSeconds={durationSeconds - hookIntroDuration} />
          <Watermark />
          <Audio src={staticFile(audioFileName)} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
