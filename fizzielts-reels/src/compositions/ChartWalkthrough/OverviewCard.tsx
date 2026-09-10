import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLOR, TINT, TYPE } from "../../brand";
import { FONT } from "../../fonts";
import { Card, Eyebrow } from "../../components/Page";

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
  const enter = interpolate(frame - atFrame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Card
      accent={accent}
      style={{
        padding: "26px 30px 30px",
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [22, 0])}px)`,
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
        {splitOnHighlights(text, highlights).map((part, i) =>
          part.highlighted ? (
            <span
              key={i}
              style={{
                backgroundColor: TINT.scoring,
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
