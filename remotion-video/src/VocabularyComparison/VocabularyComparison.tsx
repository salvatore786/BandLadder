import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { VocabularyComparisonProps } from "../types";
import { fontFamily } from "../styles/fonts";
import { COLORS } from "../styles/colors";
import { Background } from "../shared/Background";
import { FloatingParticles } from "../shared/FloatingParticles";
import { Header } from "../shared/Header";
import { HookIntro } from "../shared/HookIntro";
import { ProgressBar } from "../shared/ProgressBar";
import { Watermark } from "../shared/Watermark";
import { GlowOrbs } from "../shared/GlowOrbs";
import { PulsingRings } from "../shared/PulsingRings";
import { WordPairCard } from "./WordPairCard";

export const VocabularyComparison: React.FC<VocabularyComparisonProps> = ({
  topic,
  wordPairs,
  category,
  scenarioDescription,
  durationSeconds,
  audioDurationSeconds,
  audioFileName,
  examType = "IELTS",
  hookIntroDuration = 0,
  questionTypeLabel = "Vocabulary",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hookFrames = Math.ceil(hookIntroDuration * fps);
  const contentDuration = durationSeconds - hookIntroDuration;
  const audioFrames = Math.ceil(audioDurationSeconds * fps);

  // Timing: stagger each word pair across the audio duration
  // Leave first 12% for intro, last portion for outro
  const pairStartFraction = 0.12;
  const pairEndFraction = 0.85;
  const pairWindow = (pairEndFraction - pairStartFraction) * audioFrames;
  const pairInterval = Math.floor(pairWindow / wordPairs.length);

  // Basic word appears first, then upgrade arrow + advanced word after a beat
  const basicDelay = 0; // frames after pair start
  const upgradeDelay = Math.floor(fps * 1.2); // 1.2s after basic word appears

  return (
    <AbsoluteFill style={{ fontFamily }}>
      {/* Hook intro overlay */}
      {hookIntroDuration > 0 && (
        <HookIntro
          examType={examType}
          questionTypeLabel={questionTypeLabel}
          introDuration={hookIntroDuration}
          sectionLabel="Vocabulary"
        />
      )}

      <Sequence from={hookFrames}>
        <AbsoluteFill style={{ fontFamily }}>
          <Background />
          <GlowOrbs />
          <FloatingParticles />
          <PulsingRings />
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
              {topic}
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
                color: COLORS.textTertiary,
                lineHeight: 1.4,
                fontFamily,
                margin: 0,
              }}
            >
              {scenarioDescription}
            </p>
          </div>

          {/* Band score labels */}
          <BandScoreLabels />

          {/* Word Pair Cards — scrollable area */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              padding: "10px 40px",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {wordPairs.map((pair, i) => {
              const pairStart =
                Math.floor(pairStartFraction * audioFrames) + i * pairInterval;
              return (
                <WordPairCard
                  key={i}
                  basicWord={pair.basic}
                  advancedWord={pair.advanced}
                  basicMeaning={pair.basicMeaning}
                  advancedMeaning={pair.advancedMeaning}
                  exampleSentence={pair.exampleSentence}
                  index={i}
                  basicAppearFrame={pairStart + basicDelay}
                  upgradeAppearFrame={pairStart + upgradeDelay}
                />
              );
            })}
          </div>

          <ProgressBar durationSeconds={contentDuration} />
          <Watermark />
          <Audio src={staticFile(audioFileName)} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

/** Two-column header showing "Basic" vs "Advanced" with band score indicators */
const BandScoreLabels: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 80,
        padding: "16px 60px 0",
        position: "relative",
        zIndex: 2,
      }}
    >
      {/* Basic / Band 5 */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: COLORS.textMuted,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
            fontFamily,
            marginBottom: 4,
          }}
        >
          Basic
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: COLORS.accent,
            fontFamily,
          }}
        >
          Band 5-6
        </div>
      </div>

      {/* Arrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 32,
          color: COLORS.textMuted,
        }}
      >
        {"\u2192"}
      </div>

      {/* Advanced / Band 7+ */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: COLORS.textMuted,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
            fontFamily,
            marginBottom: 4,
          }}
        >
          Advanced
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: COLORS.success,
            fontFamily,
          }}
        >
          Band 7-9
        </div>
      </div>
    </div>
  );
};
