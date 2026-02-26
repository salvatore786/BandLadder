import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { SentenceCompletionProps } from "../types";
import { fontFamily } from "../styles/fonts";
import { Background } from "../shared/Background";
import { FloatingParticles } from "../shared/FloatingParticles";
import { Header } from "../shared/Header";
import { HookIntro } from "../shared/HookIntro";
import { TitleSection } from "./TitleSection";
import { Instructions } from "./Instructions";
import { SentenceList } from "./SentenceList";
import { ProgressBar } from "../shared/ProgressBar";
import { AudioWaveViz } from "../shared/AudioWaveViz";
import { Watermark } from "../shared/Watermark";
import { GlowOrbs } from "../shared/GlowOrbs";
import { MusicNotes } from "../shared/MusicNotes";
import { PulsingRings } from "../shared/PulsingRings";
import { SpinningVinylRecord } from "../shared/SpinningVinylRecord";

export const SentenceCompletion: React.FC<SentenceCompletionProps> = ({
  sentences,
  answers,
  category,
  scenarioDescription,
  durationSeconds,
  audioDurationSeconds,
  audioFileName,
  hookIntroDuration = 0,
  questionTypeLabel = "Sentence Completion",
}) => {
  const { fps } = useVideoConfig();
  const hookFrames = Math.ceil(hookIntroDuration * fps);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      {/* Hook intro overlay — plays from frame 0, fades out after hookIntroDuration */}
      {hookIntroDuration > 0 && (
        <HookIntro
          examType="IELTS"
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
          <Header examType="IELTS" />
          <TitleSection
            category={category}
            scenarioDescription={scenarioDescription}
          />
          <Instructions />
          <SentenceList
            sentences={sentences}
            answers={answers}
            durationSeconds={durationSeconds - hookIntroDuration}
            audioDurationSeconds={audioDurationSeconds}
          />
          <AudioWaveViz />
          <ProgressBar durationSeconds={durationSeconds - hookIntroDuration} />
          <Watermark />
          <Audio src={staticFile(audioFileName)} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
