import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, LAYOUT, MOTION, TYPE, alpha } from "../brand";
import { FONT } from "../fonts";
import { useIdle } from "../motion";
import { MotionTrail } from "./MotionTrail";
import { Eyebrow } from "./Page";
import { RoughUnderlineFit } from "./RoughShape";

/**
 * The opening beat. Every composition starts with this.
 *
 * Reach is decided by the 3-second skip rate, so frames 0-60 must never be a
 * held static title card — and the first cut's version, a three-frame fade per
 * word, barely registered as movement. Five things now move through the window,
 * overlapping so there is no gap between them:
 *
 *   f0-16   an accent block wipes across behind the eyebrow and clears
 *   f2-18   the eyebrow flies in from the left
 *   f6-22   the ink rule springs out past full width and settles back
 *   f6-52   headline words arrive one every 3 frames, each rising 58px and
 *           scaling up from 0.82, with a motion-blur trail behind it
 *   f34-60  a rough underline is drawn beneath the emphasis phrase
 *
 * The composition's own visual — bars growing, the plan drawing itself in —
 * animates underneath at the same time. The hook never covers it.
 */
export const Hook: React.FC<{
  eyebrow: string;
  headline: { lead: string; emphasis: string; trail?: string };
  accent: string;
}> = ({ eyebrow, headline, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Springs rather than ramps, so the rule overshoots full width and comes back.
  const ruleSpring = spring({
    frame: frame - 6,
    fps,
    config: MOTION.bounce,
    durationInFrames: 16,
  });
  const ruleWidth = interpolate(ruleSpring, [0, 1], [0, 100]);

  const eyebrowIn = spring({
    frame: frame - 2,
    fps,
    config: MOTION.bounce,
    durationInFrames: 16,
  });

  // A block of accent sweeps left to right behind the eyebrow and off again.
  const wipe = interpolate(frame, [0, 16], [0, 1], {
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

  const underlineProgress = interpolate(frame, [34, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Once the words have landed the headline keeps breathing, so the top of the
  // frame is never completely still either.
  const breathe = useIdle(221) * 2.4;

  return (
    <div>
      <div style={{ position: "relative", overflow: "hidden", paddingBottom: 2 }}>
        <div
          style={{
            position: "absolute",
            top: -6,
            bottom: -2,
            left: `${interpolate(wipe, [0, 1], [-46, 104])}%`,
            width: "46%",
            background: `linear-gradient(90deg, ${alpha(accent, 0)}, ${alpha(accent, 0.3)}, ${alpha(accent, 0)})`,
          }}
        />
        <div
          style={{
            transform: `translateX(${interpolate(eyebrowIn, [0, 1], [-MOTION.travel, 0]).toFixed(2)}px)`,
            opacity: interpolate(eyebrowIn, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      </div>

      {/* Ink rule directly beneath the eyebrow */}
      <div
        style={{
          height: LAYOUT.rule,
          width: `${Math.min(100, ruleWidth)}%`,
          backgroundColor: COLOR.ink,
          marginTop: 14,
        }}
      />

      <h1
        style={{
          margin: "26px 0 0",
          fontFamily: FONT.display,
          fontSize: TYPE.headline.size,
          lineHeight: TYPE.headline.lineHeight,
          fontWeight: 600,
          color: COLOR.ink,
          display: "flex",
          flexWrap: "wrap",
          columnGap: 18,
          rowGap: 2,
          transform: `translateY(${breathe.toFixed(2)}px)`,
        }}
      >
        {allWords.map((w, i) => {
          const at = 6 + i * MOTION.staggerFrames;
          const progressAt = (framesAgo: number) =>
            spring({
              frame: frame - at - framesAgo,
              fps,
              config: MOTION.bounce,
              durationInFrames: MOTION.keyRevealFrames,
            });
          const enter = progressAt(0);
          const wordTransform = (framesAgo: number) => {
            const p = progressAt(framesAgo);
            return (
              `translateY(${interpolate(p, [0, 1], [58, 0]).toFixed(2)}px) ` +
              `scale(${interpolate(p, [0, 1], [0.82, 1]).toFixed(4)})`
            );
          };
          // The ghosts are only worth their cost while the word is moving.
          const moving = frame >= at && frame < at + MOTION.keyRevealFrames + 4;

          return (
            <MotionTrail
              key={`${w.text}-${i}`}
              transform={wordTransform}
              active={moving}
              layers={MOTION.trail.layers}
              lagInFrames={MOTION.trail.lagInFrames}
              opacity={MOTION.trail.opacity}
            >
              <span
                style={{
                  position: "relative",
                  display: "inline-block",
                  fontWeight: w.italic ? 700 : 600,
                  color: w.italic ? accent : COLOR.ink,
                  opacity: interpolate(enter, [0, 0.35], [0, 1], { extrapolateRight: "clamp" }),
                  transformOrigin: "left bottom",
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
            </MotionTrail>
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
