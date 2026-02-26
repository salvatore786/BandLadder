import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { WriteFromDictationProps } from "../types";
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
import { HookIntro } from "../shared/HookIntro";

export const WriteFromDictation: React.FC<WriteFromDictationProps> = ({
  sentence,
  category,
  scenarioDescription,
  durationSeconds,
  audioDurationSeconds,
  audioFileName,
  examType = "PTE",
  hookIntroDuration = 0,
  questionTypeLabel = "Write from Dictation",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hookFrames = Math.ceil(hookIntroDuration * fps);
  const totalFrames = Math.ceil(durationSeconds * fps);
  const audioFrames = Math.ceil(audioDurationSeconds * fps);

  // Phases: listening during audio, typing starts 1s after audio, complete 0.5s before end
  // Listening phase = entire audio duration
  const listeningEnd = audioFrames;
  // Typing starts 1 second after audio ends
  const typingStart = Math.ceil((audioDurationSeconds + 1) * fps);
  // Typing ends 0.5s before video ends to show "Complete!" briefly
  const typingEnd = totalFrames - Math.floor(fps * 0.5);

  const isListening = frame < listeningEnd;
  const isTyping = frame >= typingStart && frame < typingEnd;
  const isComplete = frame >= typingEnd;

  // Word-by-word typing
  const words = sentence.split(" ");
  const typingDuration = typingEnd - typingStart;
  const wordsToShow = isTyping || isComplete
    ? Math.min(
        Math.ceil(((frame - typingStart) / typingDuration) * words.length),
        words.length
      )
    : 0;
  const displayText = words.slice(0, wordsToShow).join(" ");
  const showCursor = isTyping && frame % 10 < 5;

  // Listening pulse animation
  const pulseScale = isListening
    ? 1 + Math.sin(frame * 0.1) * 0.05
    : 1;

  // Entrance animations
  const titleEnter = spring({
    fps,
    frame: Math.max(0, frame - Math.floor(fps * 0.5)),
    config: { damping: 14, stiffness: 100, mass: 0.8 },
  });

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
          opacity: interpolate(titleEnter, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleEnter, [0, 1], [20, 0])}px)`,
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
            fontSize: 48,
            fontWeight: 800,
            marginBottom: 8,
            letterSpacing: -0.5,
            color: "rgba(20, 25, 45, 0.92)",
            fontFamily,
          }}
        >
          Write from Dictation
        </h1>

        <div
          style={{
            width: 200,
            height: 5,
            background: `linear-gradient(90deg, ${COLORS.success}, ${COLORS.accent})`,
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
          {"\uD83C\uDFA7"} Listen carefully, then write the sentence
        </p>
      </div>

      {/* Main content area */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 50px",
        }}
      >
        {isListening && (
          <div
            style={{
              textAlign: "center",
              transform: `scale(${pulseScale})`,
            }}
          >
            {/* Ear icon */}
            <div style={{ fontSize: 80, marginBottom: 30 }}>
              {"\uD83D\uDC42"}
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.accent,
                letterSpacing: 4,
                textTransform: "uppercase" as const,
                fontFamily,
              }}
            >
              Listening...
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: 22,
                color: COLORS.textMuted,
                fontFamily,
              }}
            >
              Pay attention to every word
            </div>
          </div>
        )}

        {(isTyping || isComplete) && (
          <div
            style={{
              padding: "40px 36px",
              background: "rgba(20, 25, 45, 0.05)",
              border: `2px solid ${isComplete ? "rgba(78, 204, 163, 0.4)" : "rgba(20, 25, 45, 0.08)"}`,
              borderRadius: 24,
              width: "100%",
            }}
          >
            {/* Label */}
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.textMuted,
                marginBottom: 16,
                letterSpacing: 2,
                textTransform: "uppercase" as const,
                fontFamily,
              }}
            >
              YOUR ANSWER:
            </div>

            {/* Typed text */}
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                color: isComplete ? COLORS.success : COLORS.textPrimary,
                lineHeight: 1.6,
                minHeight: 120,
                fontFamily,
              }}
            >
              {displayText}
              {showCursor && (
                <span style={{ color: COLORS.accent, opacity: 0.8 }}>|</span>
              )}
            </div>

            {/* Completion indicator */}
            {isComplete && (
              <div
                style={{
                  marginTop: 20,
                  textAlign: "center",
                  fontSize: 24,
                  fontWeight: 700,
                  color: COLORS.success,
                  fontFamily,
                }}
              >
                {"\u2713"} Complete!
              </div>
            )}
          </div>
        )}
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
