import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { NoteCompletionProps } from "../types";
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
import { FormField } from "./FormField";

export const NoteCompletion: React.FC<NoteCompletionProps> = ({
  formTitle,
  fields,
  category,
  scenarioDescription,
  durationSeconds,
  audioDurationSeconds,
  audioFileName,
  examType = "IELTS",
  hookIntroDuration = 0,
  questionTypeLabel = "Note Completion",
}) => {
  const { fps } = useVideoConfig();
  const hookFrames = Math.ceil(hookIntroDuration * fps);
  const totalFrames = Math.ceil(durationSeconds * fps);
  const audioFrames = Math.ceil(audioDurationSeconds * fps);

  // Timing: fields appear during audio portion, reveal AFTER audio ends
  const fieldStartFrame = Math.floor(audioFrames * 0.15);
  const fieldSpacing = Math.floor((audioFrames * 0.55) / Math.max(fields.length, 1));
  // Answer reveals 1 second AFTER audio ends
  const revealFrame = Math.ceil((audioDurationSeconds + 1) * fps);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      {/* Hook intro overlay — plays from frame 0, fades out after hookIntroDuration */}
      {hookIntroDuration > 0 && (
        <HookIntro
          examType={examType}
          questionTypeLabel={questionTypeLabel}
          introDuration={hookIntroDuration}
        />
      )}

      {/* Main content — delayed by hook intro duration */}
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
                background: "rgba(233, 69, 96, 0.15)",
                border: "1px solid rgba(233, 69, 96, 0.3)",
                borderRadius: 50,
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.primaryLight,
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
              Note Completion
            </h1>

            <div
              style={{
                width: 200,
                height: 5,
                background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
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
              {"\uD83C\uDFA7"} Listen and complete the form
            </p>
          </div>

          {/* Form card */}
          <div
            style={{
              margin: "10px 40px",
              padding: "30px 24px",
              background: "rgba(20, 25, 45, 0.03)",
              border: "1px solid rgba(20, 25, 45, 0.08)",
              borderRadius: 24,
              position: "relative",
              zIndex: 2,
            }}
          >
            {/* Form title */}
            <div
              style={{
                textAlign: "center",
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.accent,
                marginBottom: 24,
                fontFamily,
                letterSpacing: 1,
              }}
            >
              {formTitle}
            </div>

            {/* Form fields */}
            {fields.map((field, i) => (
              <FormField
                key={i}
                label={field.label}
                value={field.value}
                index={i}
                appearFrame={fieldStartFrame + i * fieldSpacing}
                revealFrame={revealFrame}
              />
            ))}
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
