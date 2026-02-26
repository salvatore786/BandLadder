import React from "react";
import { useVideoConfig } from "remotion";
import { SentenceItem } from "./SentenceItem";
import { calculateSentenceTimeline } from "../utils/timing";

interface SentenceListProps {
  sentences: string[];
  answers: string[];
  durationSeconds: number;
  audioDurationSeconds: number;
}

export const SentenceList: React.FC<SentenceListProps> = ({
  sentences,
  answers,
  durationSeconds,
  audioDurationSeconds,
}) => {
  const { fps } = useVideoConfig();
  const { sentenceAppearFrames, answerRevealFrame } =
    calculateSentenceTimeline(durationSeconds, audioDurationSeconds, fps);

  return (
    <div
      style={{
        padding: "30px 60px",
        position: "relative",
        zIndex: 2,
      }}
    >
      {sentences.map((sentence, i) => (
        <SentenceItem
          key={i}
          index={i}
          sentence={sentence}
          answer={answers[i] || ""}
          appearFrame={sentenceAppearFrames[i]}
          revealFrame={answerRevealFrame}
        />
      ))}
    </div>
  );
};
