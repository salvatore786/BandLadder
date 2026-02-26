import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { MatchingClassificationProps } from "../types";
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
import { CategoryHeader } from "./CategoryHeader";
import { ClassificationItem } from "./ClassificationItem";

export const MatchingClassification: React.FC<MatchingClassificationProps> = ({
  categories,
  items,
  category,
  scenarioDescription,
  durationSeconds,
  audioDurationSeconds,
  audioFileName,
  examType = "IELTS",
  hookIntroDuration = 0,
  questionTypeLabel = "Matching",
}) => {
  const { fps } = useVideoConfig();
  const hookFrames = Math.ceil(hookIntroDuration * fps);
  const audioFrames = Math.ceil(audioDurationSeconds * fps);

  // Timing — elements appear during audio, answers reveal AFTER audio
  const headerAppearFrame = Math.floor(audioFrames * 0.10);
  const itemStartFrame = Math.floor(audioFrames * 0.18);
  const itemInterval = Math.floor(audioFrames * 0.10);
  // Answer reveals 1 second AFTER audio ends
  const revealFrame = Math.ceil((audioDurationSeconds + 1) * fps);

  return (
    <AbsoluteFill style={{ fontFamily }}>
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
            {/* Category badge */}
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
                marginBottom: 20,
                fontFamily,
              }}
            >
              {category}
            </div>

            <h1
              style={{
                fontSize: 44,
                fontWeight: 800,
                marginBottom: 8,
                letterSpacing: -0.5,
                color: COLORS.textPrimary,
                fontFamily,
              }}
            >
              Matching / Classification
            </h1>

            <div
              style={{
                width: 200,
                height: 5,
                background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
                margin: "0 auto 16px",
                borderRadius: 3,
              }}
            />

            <p
              style={{
                fontSize: 22,
                fontWeight: 400,
                color: "rgba(20, 25, 45, 0.55)",
                lineHeight: 1.4,
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
              margin: "16px 60px",
              padding: "14px 30px",
              background: COLORS.subtleBg,
              borderRadius: 16,
              border: `1px solid ${COLORS.subtleBorder}`,
              position: "relative",
              zIndex: 2,
            }}
          >
            <p
              style={{
                fontSize: 20,
                color: COLORS.textTertiary,
                fontWeight: 400,
                fontFamily,
                margin: 0,
              }}
            >
              {"\uD83C\uDFA7"} Listen and match each item to its category
            </p>
          </div>

          {/* Classification Grid */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              flex: 1,
              padding: "0 40px",
            }}
          >
            <CategoryHeader
              categories={categories}
              appearFrame={headerAppearFrame}
            />

            {items.map((item, i) => (
              <ClassificationItem
                key={i}
                text={item.text}
                categoryIndex={item.categoryIndex}
                categoryCount={categories.length}
                itemIndex={i}
                appearFrame={itemStartFrame + i * itemInterval}
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
