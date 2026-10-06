import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, MOTION, SHADOW, TYPE, alpha } from "../brand";
import { FONT } from "../fonts";
import type { CaptionWord } from "../schemas";

/**
 * Karaoke captions, driven by the frame each word is actually spoken on.
 *
 * The timings come from scripts/build_audio.py, which force-aligns the
 * synthesised narration — so these are measured positions in the audio the
 * viewer hears, not a guess from a word count.
 *
 * A word is "current" from its startFrame until the next word's startFrame, so
 * something is always highlighted and no gap is ever dead. Words arrive a page
 * at a time; each page slides up as the previous one slides away, and the two
 * overlap, which keeps this corner of the frame in constant motion.
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

  const activeIndex = words.reduce((acc, w, i) => (frame >= w.startFrame ? i : acc), -1);
  if (activeIndex < 0) return null;

  const page = Math.floor(activeIndex / WORDS_PER_PAGE);
  const pageWords = words.slice(page * WORDS_PER_PAGE, (page + 1) * WORDS_PER_PAGE);
  const pageStart = pageWords[0].startFrame;

  // The page rises MOTION.travel on a spring with overshoot rather than fading.
  const enter = spring({
    frame: frame - pageStart,
    fps,
    config: MOTION.bounce,
    durationInFrames: MOTION.revealFrames,
  });

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "10px 8px",
        opacity: interpolate(enter, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(enter, [0, 1], [MOTION.travel, 0]).toFixed(2)}px)`,
        ...style,
      }}
    >
      {pageWords.map((w, i) => {
        const globalIndex = page * WORDS_PER_PAGE + i;
        const isCurrent = globalIndex === activeIndex;
        const isSpoken = globalIndex < activeIndex;

        // Each word also arrives on its own stagger inside the page, so a page
        // turn is a sequence of six small moves rather than one.
        const arrive = spring({
          frame: frame - pageStart - i * MOTION.staggerFrames,
          fps,
          config: MOTION.bounce,
          durationInFrames: MOTION.minEntranceFrames + 4,
        });
        const pop = isCurrent
          ? spring({
              frame: frame - w.startFrame,
              fps,
              config: MOTION.bounce,
              durationInFrames: MOTION.minEntranceFrames + 2,
            })
          : 0;

        return (
          <span
            key={`${w.word}-${globalIndex}`}
            style={{
              padding: "8px 16px",
              borderRadius: 14,
              backgroundColor: isCurrent ? COLOR.white : alpha(COLOR.white, 0.9),
              border: `3px solid ${isCurrent ? accent : COLOR.border}`,
              boxShadow: isCurrent ? SHADOW.shape : "none",
              fontFamily: FONT.sans,
              fontSize: TYPE.caption.size,
              fontWeight: 700,
              lineHeight: 1.12,
              color: isCurrent ? accent : isSpoken ? COLOR.ink : COLOR.body,
              transform:
                `translateY(${interpolate(arrive, [0, 1], [20, 0]).toFixed(2)}px) ` +
                `scale(${(interpolate(arrive, [0, 1], [0.84, 1]) + pop * 0.07).toFixed(4)})`,
              opacity: interpolate(arrive, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
