import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, MOTION, TYPE } from "../brand";
import { FONT } from "../fonts";
import type { CaptionWord } from "../schemas";

/**
 * Karaoke captions from a pre-scripted word list.
 *
 * A word is "current" from its startFrame until the next word's startFrame, so
 * something is always highlighted — no dead gaps between words. Words are shown
 * a page at a time; each word gets its own pill, as in the reference reels.
 */

const WORDS_PER_PAGE = 6;

export const Captions: React.FC<{
  words: CaptionWord[];
  accent: string;
  style?: React.CSSProperties;
}> = ({ words, accent, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (words.length === 0) return null;

  const activeIndex = words.reduce(
    (acc, w, i) => (frame >= w.startFrame ? i : acc),
    -1
  );
  if (activeIndex < 0) return null;

  const page = Math.floor(activeIndex / WORDS_PER_PAGE);
  const pageWords = words.slice(page * WORDS_PER_PAGE, (page + 1) * WORDS_PER_PAGE);
  const pageStart = pageWords[0].startFrame;

  const enter = spring({
    frame: frame - pageStart,
    fps,
    config: MOTION.settle,
    durationInFrames: 8,
  });

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "10px 8px",
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [14, 0])}px)`,
        ...style,
      }}
    >
      {pageWords.map((w, i) => {
        const globalIndex = page * WORDS_PER_PAGE + i;
        const isCurrent = globalIndex === activeIndex;
        const isSpoken = globalIndex < activeIndex;

        const pop = isCurrent
          ? spring({
              frame: frame - w.startFrame,
              fps,
              config: MOTION.snap,
              durationInFrames: 10,
            })
          : 0;

        return (
          <span
            key={`${w.word}-${globalIndex}`}
            style={{
              padding: "6px 14px",
              borderRadius: 12,
              backgroundColor: COLOR.white,
              border: `2px solid ${isCurrent ? accent : COLOR.border}`,
              fontFamily: FONT.sans,
              fontSize: TYPE.caption.size,
              fontWeight: 700,
              lineHeight: 1.12,
              color: isCurrent ? accent : isSpoken ? COLOR.ink : COLOR.muted,
              transform: `scale(${1 + pop * 0.06})`,
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
