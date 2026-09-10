import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, LAYOUT, MOTION, TYPE } from "../brand";
import { FONT } from "../fonts";
import { Eyebrow } from "./Page";
import { RoughUnderlineFit } from "./RoughShape";

/**
 * The opening beat. Every composition starts with this.
 *
 * Reach is decided by the 3-second skip rate, so frames 0-60 must never be a
 * held static title card. Three things are moving through that window:
 *
 *   f0-12   the ink rule wipes out from the left under the eyebrow
 *   f4-45   headline words snap in one at a time, each overshooting slightly
 *   f34-58  a rough underline is drawn beneath the emphasis phrase
 *
 * The composition's own visual (chart bars growing, map drawing itself in)
 * animates underneath at the same time — the hook never covers it.
 */
export const Hook: React.FC<{
  eyebrow: string;
  headline: { lead: string; emphasis: string; trail?: string };
  accent: string;
}> = ({ eyebrow, headline, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ruleWidth = interpolate(frame, [0, 12], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const leadWords = headline.lead.split(" ").filter(Boolean);
  const emphasisWords = headline.emphasis.split(" ").filter(Boolean);
  const trailWords = (headline.trail ?? "").split(" ").filter(Boolean);
  const allWords = [
    ...leadWords.map((w) => ({ text: w, italic: false })),
    ...emphasisWords.map((w) => ({ text: w, italic: true })),
    ...trailWords.map((w) => ({ text: w, italic: false })),
  ];
  const emphasisStart = leadWords.length;

  const STAGGER = 4;
  const underlineProgress = interpolate(frame, [34, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div>
      <div style={{ opacity: interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) }}>
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>

      {/* 2px ink rule directly beneath the eyebrow */}
      <div
        style={{
          height: LAYOUT.rule,
          width: `${ruleWidth}%`,
          backgroundColor: COLOR.ink,
          marginTop: 14,
        }}
      />

      <h1
        style={{
          margin: "26px 0 0",
          fontFamily: FONT.serif,
          fontSize: TYPE.headline.size,
          lineHeight: TYPE.headline.lineHeight,
          fontWeight: 400,
          color: COLOR.ink,
          display: "flex",
          flexWrap: "wrap",
          columnGap: 18,
          rowGap: 2,
        }}
      >
        {allWords.map((w, i) => {
          const enter = spring({
            frame: frame - (4 + i * STAGGER),
            fps,
            config: MOTION.snap,
            durationInFrames: 18,
          });

          return (
            <span
              key={`${w.text}-${i}`}
              style={{
                position: "relative",
                display: "inline-block",
                fontStyle: w.italic ? "italic" : "normal",
                color: w.italic ? accent : COLOR.ink,
                opacity: enter,
                transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
              }}
            >
              {w.text}
              {/* Underlined per word, so a phrase that wraps still lands right. */}
              {w.italic ? (
                <RoughUnderlineFit
                  color={accent}
                  progress={wordUnderlineProgress(underlineProgress, i - emphasisStart, emphasisWords.length)}
                  seed={11 + i}
                />
              ) : null}
            </span>
          );
        })}
      </h1>

    </div>
  );
};

/**
 * The single sweep is shared out across the emphasis words left to right, so
 * it still reads as one continuous stroke rather than several at once.
 */
function wordUnderlineProgress(overall: number, index: number, count: number): number {
  const share = 1 / count;
  return Math.max(0, Math.min(1, (overall - index * share) / share));
}
