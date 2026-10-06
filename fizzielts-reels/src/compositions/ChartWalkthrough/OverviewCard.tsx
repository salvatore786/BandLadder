import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, MOTION, TYPE, alpha } from "../../brand";
import { FONT } from "../../fonts";
import { Card, Eyebrow } from "../../components/Page";
import { idle } from "../../motion";

/**
 * The payoff: the finished overview paragraph, with the phrases that earn the
 * band score tinted so the viewer can see exactly what to copy.
 */
export const OverviewCard: React.FC<{
  text: string;
  highlights: string[];
  accent: string;
  atFrame: number;
  style?: React.CSSProperties;
}> = ({ text, highlights, accent, atFrame, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The payoff card is the longest move in the reel: it rises the full travel
  // distance over 20 frames, overshoots, and settles.
  const enter = spring({
    frame: frame - atFrame,
    fps,
    config: MOTION.settle,
    durationInFrames: MOTION.keyRevealFrames,
  });
  const breathe = idle(frame, 197) * 2.2;
  const parts = splitOnHighlights(text, highlights);

  return (
    <Card
      accent={accent}
      style={{
        padding: "26px 30px 30px",
        opacity: interpolate(enter, [0, 0.35], [0, 1], { extrapolateRight: "clamp" }),
        transform:
          `translateY(${(interpolate(enter, [0, 1], [MOTION.travel + 16, 0]) + breathe).toFixed(2)}px) ` +
          `scale(${interpolate(enter, [0, 1], [0.9, 1]).toFixed(4)})`,
        ...style,
      }}
    >
      <Eyebrow color={COLOR.muted} size={TYPE.small.size}>
        The overview
      </Eyebrow>
      <p
        style={{
          margin: "16px 0 0",
          fontFamily: FONT.sans,
          fontSize: TYPE.body.size,
          lineHeight: TYPE.body.lineHeight,
          color: COLOR.ink,
        }}
      >
        {parts.map((part, i) =>
          part.highlighted ? (
            <span
              key={i}
              style={{
                // The tints come up one phrase at a time after the card lands,
                // so the paragraph keeps moving while it is being read. Only the
                // tint animates — fading the span would grey out the words too,
                // which reads as unimportant rather than not-yet-highlighted.
                backgroundColor: alpha(
                  COLOR.blue,
                  interpolate(
                    frame - atFrame - MOTION.keyRevealFrames - highlightOrder(parts, i) * 14,
                    [0, 12],
                    [0, 0.18],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  )
                ),
                color: COLOR.deep,
                fontWeight: 500,
                borderRadius: 5,
                padding: "2px 4px",
                boxDecorationBreak: "clone",
                WebkitBoxDecorationBreak: "clone",
              }}
            >
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </p>
    </Card>
  );
};

/**
 * Split the paragraph on every highlight phrase. Longest phrases match first so
 * one highlight nested inside another cannot break the split.
 */
function splitOnHighlights(
  text: string,
  highlights: string[]
): { text: string; highlighted: boolean }[] {
  const phrases = [...highlights].filter(Boolean).sort((a, b) => b.length - a.length);
  if (phrases.length === 0) return [{ text, highlighted: false }];

  let parts: { text: string; highlighted: boolean }[] = [{ text, highlighted: false }];

  for (const phrase of phrases) {
    const next: typeof parts = [];
    for (const part of parts) {
      if (part.highlighted) {
        next.push(part);
        continue;
      }
      let rest = part.text;
      let at = rest.indexOf(phrase);
      while (at !== -1) {
        if (at > 0) next.push({ text: rest.slice(0, at), highlighted: false });
        next.push({ text: phrase, highlighted: true });
        rest = rest.slice(at + phrase.length);
        at = rest.indexOf(phrase);
      }
      if (rest) next.push({ text: rest, highlighted: false });
    }
    parts = next;
  }

  return parts;
}

/** Which highlight this is, counting from the start of the paragraph. */
function highlightOrder(parts: { text: string; highlighted: boolean }[], index: number): number {
  return parts.slice(0, index).filter((p) => p.highlighted).length;
}
