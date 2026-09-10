import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, MODULE_ACCENT, MOTION, SHADOW, TYPE, alpha } from "../../brand";
import { FONT } from "../../fonts";
import { Card, Eyebrow, Page } from "../../components/Page";
import { Hook } from "../../components/Hook";
import { MAP, SportsComplexMap, type ResolvedSlot } from "./SportsComplexMap";
import type { Bubble, MapAnswer, MapWalkthroughProps } from "../../schemas";

export const MapWalkthrough: React.FC<MapWalkthroughProps> = ({
  module,
  eyebrow,
  headline,
  sectionLabels,
  practiceStartFrame,
  map,
  answers,
  bubbles,
}) => {
  const frame = useCurrentFrame();
  const accent = MODULE_ACCENT[module];
  const inPractice = frame >= practiceStartFrame;

  // Practice rows never resolve on screen — that is the point of them.
  const resolved: Record<string, ResolvedSlot> = {};
  for (const a of answers) {
    if (!a.practice) {
      resolved[a.slot] = { name: a.name, color: a.color, revealFrame: a.revealFrame };
    }
  }

  return (
    <Page accent={accent}>
      <Hook eyebrow={eyebrow} headline={headline} accent={accent} />

      <SectionLabel
        label={inPractice ? sectionLabels.practice : sectionLabels.walkthrough}
        accent={inPractice ? COLOR.coral : accent}
        switchedAt={practiceStartFrame}
      />

      <Card accent={accent} style={{ marginTop: 18, padding: 22 }}>
        <div style={{ position: "relative", width: MAP.width, height: MAP.height }}>
          <SportsComplexMap fixtures={map.fixtures} resolved={resolved} />
          {bubbles
            .filter((b) => frame >= b.fromFrame && frame < b.fromFrame + b.durationInFrames)
            .map((b) => (
              <TooltipBubble key={b.text} bubble={b} />
            ))}
        </div>
      </Card>

      <AnswerList answers={answers} accent={accent} style={{ marginTop: 22 }} />
    </Page>
  );
};

/** WALKTHROUGH -> PRACTICE. The flip is a beat, so it gets a spring. */
const SectionLabel: React.FC<{ label: string; accent: string; switchedAt: number }> = ({
  label,
  accent,
  switchedAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flip = spring({
    frame: frame - switchedAt,
    fps,
    config: MOTION.snap,
    durationInFrames: 14,
  });
  const scale = frame >= switchedAt ? 1 + flip * 0.08 : 1;

  return (
    <div style={{ marginTop: 18, transformOrigin: "left center", transform: `scale(${scale})` }}>
      <Eyebrow color={accent}>{label}</Eyebrow>
    </div>
  );
};

const TooltipBubble: React.FC<{ bubble: Bubble }> = ({ bubble }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - bubble.fromFrame,
    fps,
    config: MOTION.snap,
    durationInFrames: 14,
  });

  return (
    <div
      style={{
        position: "absolute",
        left: `${bubble.x * 100}%`,
        top: `${bubble.y * 100}%`,
        transform: `translate(-50%, -50%) scale(${interpolate(enter, [0, 1], [0.86, 1])})`,
        opacity: enter,
        backgroundColor: COLOR.ink,
        color: COLOR.white,
        padding: "14px 22px",
        borderRadius: 14,
        boxShadow: SHADOW.bubble,
        fontFamily: FONT.sans,
        fontSize: TYPE.label.size,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {bubble.text}
    </div>
  );
};

/**
 * Two columns: what has been answered, and what the viewer is left to do.
 * Practice rows keep a dashed slot so the ask is visible from the first frame.
 */
const AnswerList: React.FC<{
  answers: MapAnswer[];
  accent: string;
  style?: React.CSSProperties;
}> = ({ answers, accent, style }) => {
  const walk = answers.filter((a) => !a.practice);
  const practice = answers.filter((a) => a.practice);

  return (
    <Card accent={accent} style={{ padding: "28px 34px 32px", ...style }}>
      <div style={{ display: "flex", gap: 34 }}>
        <Column title="Walkthrough" rows={walk} color={COLOR.muted} />
        {practice.length > 0 ? (
          <Column title="Practice" rows={practice} color={COLOR.coral} />
        ) : null}
      </div>
    </Card>
  );
};

const Column: React.FC<{ title: string; rows: MapAnswer[]; color: string }> = ({
  title,
  rows,
  color,
}) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22 }}>
      <Eyebrow color={color} size={TYPE.small.size}>
        {title}
      </Eyebrow>
      {rows.map((row) => {
        const answered = !row.practice && frame >= row.revealFrame;
        const enter = interpolate(frame - row.revealFrame, [0, 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div key={row.n} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                fontFamily: FONT.sans,
                fontSize: TYPE.label.size,
                fontWeight: 700,
                color: COLOR.muted,
                minWidth: 22,
              }}
            >
              {row.n}
            </span>
            <span
              style={{
                flex: 1,
                fontFamily: FONT.sans,
                fontSize: TYPE.label.size,
                fontWeight: 500,
                color: answered ? row.color : COLOR.ink,
              }}
            >
              {row.name}
            </span>
            {answered ? (
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: row.color,
                  color: COLOR.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT.sans,
                  fontSize: 24,
                  fontWeight: 700,
                  opacity: enter,
                  transform: `scale(${interpolate(enter, [0, 1], [0.7, 1])})`,
                }}
              >
                {row.slot}
              </span>
            ) : (
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  border: `2px dashed ${row.practice ? COLOR.coral : COLOR.border}`,
                  backgroundColor: row.practice ? alpha(COLOR.coral, 0.06) : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT.sans,
                  fontSize: 24,
                  fontWeight: 700,
                  color: COLOR.coral,
                }}
              >
                ?
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
