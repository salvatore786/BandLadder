import React from "react";
import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, MODULE_ACCENT, MOTION, TYPE } from "../../brand";
import { FONT } from "../../fonts";
import { Card, Page } from "../../components/Page";
import { Hook } from "../../components/Hook";
import { StepProgress } from "../../components/StepProgress";
import { FoundSoFar } from "../../components/FoundSoFar";
import { Captions } from "../../components/Captions";
import { RoughShape } from "../../components/RoughShape";
import { beat, idle } from "../../motion";
import { BarChart, CHART, Legend, barKey, barLayout } from "./BarChart";
import { OverviewCard } from "./OverviewCard";
import type { Annotation, ChartWalkthroughProps } from "../../schemas";

export const ChartWalkthrough: React.FC<ChartWalkthroughProps> = ({
  module,
  eyebrow,
  headline,
  handSubtitle,
  chart,
  annotations,
  steps,
  foundSoFar,
  captions,
  overview,
  audioSrc,
}) => {
  const frame = useCurrentFrame();
  const accent = MODULE_ACCENT[module];

  // An annotation stays in the list through its exit, so the outgoing one is
  // still moving while the next is arriving and the frame never settles.
  const live = annotations.filter(
    (a) => frame >= a.fromFrame && frame < a.fromFrame + a.durationInFrames + MOTION.exitFrames
  );
  // While an annotation is up, its bar is the only one at full strength.
  const focus =
    live.length > 0
      ? new Set(live.map((a) => barKey(a.target.category, a.target.seriesIndex)))
      : undefined;

  const showOverview = frame >= overview.atFrame;

  return (
    <Page
      accent={accent}
      header={
        <>
          <Hook eyebrow={eyebrow} headline={headline} accent={accent} />
          <div
            style={{
              fontFamily: FONT.hand,
              fontSize: TYPE.handwritten.size,
              fontWeight: 700,
              color: COLOR.coral,
              marginTop: 8,
              opacity: interpolate(frame, [26, 38], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              transform:
                `translateY(${interpolate(frame, [26, 48], [34, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }).toFixed(2)}px) ` +
                `rotate(${(idle(frame, 233) * 0.7).toFixed(2)}deg)`,
              transformOrigin: "left center",
            }}
          >
            {handSubtitle}
          </div>
        </>
      }
    >
      <Card accent={accent} style={{ padding: "26px 26px 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: FONT.sans,
              fontSize: TYPE.label.size,
              fontWeight: 700,
              color: COLOR.ink,
              maxWidth: 440,
              lineHeight: 1.28,
            }}
          >
            {chart.title}
          </div>
          <Legend chart={chart} />
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <div
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontFamily: FONT.sans,
              fontSize: TYPE.small.size,
              fontWeight: 500,
              color: COLOR.body,
              alignSelf: "center",
              paddingBottom: 60,
            }}
          >
            {chart.yAxisLabel}
          </div>

          <div style={{ position: "relative", width: CHART.width, height: CHART.height }}>
            <BarChart chart={chart} focus={focus} />
            {live.map((a) => (
              <AnnotationLayer key={a.text} annotation={a} chart={chart} accent={accent} />
            ))}
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 24 }}>
        <StepProgress steps={steps} accent={accent} />
      </div>

      {/* Fixed minimum so the layout does not jump when FOUND SO FAR is
          replaced by the shorter overview card. */}
      <div style={{ marginTop: 22, position: "relative", minHeight: 352 }}>
        {showOverview ? (
          <OverviewCard
            text={overview.text}
            highlights={overview.highlights}
            accent={accent}
            atFrame={overview.atFrame}
          />
        ) : (
          <FoundSoFar tags={foundSoFar} accent={accent} />
        )}
      </div>

      <Captions words={captions} accent={accent} style={{ marginTop: "auto", paddingTop: 18 }} />

      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}
    </Page>
  );
};

/**
 * A handwritten note plus a rough.js mark aimed at one bar. Positions come from
 * the chart's own geometry, so an annotation stays glued to its bar when the
 * data changes.
 */
const AnnotationLayer: React.FC<{
  annotation: Annotation;
  chart: ChartWalkthroughProps["chart"];
  accent: string;
}> = ({ annotation, chart, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const boxes = barLayout(chart);
  const bar = boxes.find(
    (b) => b.category === annotation.target.category && b.seriesIndex === annotation.target.seriesIndex
  );
  if (!bar) return null;

  // The stroke draws itself on over 20 frames, holds, then leaves while the
  // next annotation is already arriving.
  const { enter: progress, exit } = beat(
    frame,
    annotation.fromFrame,
    annotation.durationInFrames,
    MOTION.keyRevealFrames
  );
  const textSpring = spring({
    frame: frame - annotation.fromFrame - 4,
    fps,
    config: MOTION.bounce,
    durationInFrames: MOTION.keyRevealFrames,
  });
  const textIn = interpolate(textSpring, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });
  const leaving = 1 - exit;

  const cx = bar.x + bar.w / 2;
  const labelX = cx + annotation.offset.dx;
  const labelY = bar.y + annotation.offset.dy;

  const shape = (() => {
    switch (annotation.shape) {
      case "circle":
        return {
          kind: "ellipse" as const,
          cx,
          cy: bar.y + Math.min(bar.h, 60) / 2 + 8,
          w: bar.w + 34,
          h: Math.min(bar.h, 76) + 26,
        };
      case "underline":
        return { kind: "underline" as const, x: bar.x - 6, y: bar.y + bar.h + 10, width: bar.w + 12 };
      case "arrow":
      default:
        return {
          kind: "arrow" as const,
          x1: labelX + 30,
          y1: labelY + 14,
          x2: cx,
          y2: bar.y - 8,
        };
    }
  })();

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: leaving }}>
      <RoughShape
        shape={shape}
        color={accent}
        strokeWidth={3}
        progress={progress}
        seed={annotation.text.length * 3 + 5}
      />
      <div
        style={{
          position: "absolute",
          left: labelX,
          top: labelY,
          fontFamily: FONT.hand,
          fontSize: TYPE.handwritten.size,
          fontWeight: 700,
          color: accent,
          opacity: textIn,
          transform:
            `translate(${interpolate(textSpring, [0, 1], [-34, 0]).toFixed(2)}px, ` +
            `${interpolate(textSpring, [0, 1], [26, 0]).toFixed(2)}px) ` +
            `scale(${interpolate(textSpring, [0, 1], [0.8, 1]).toFixed(4)}) ` +
            // The handwriting keeps a slow tilt, as if held rather than placed.
            `rotate(${(-3 + idle(frame, 71, annotation.fromFrame) * 1.4).toFixed(2)}deg)`,
          transformOrigin: "left center",
          whiteSpace: "nowrap",
        }}
      >
        {annotation.text}
      </div>
    </AbsoluteFill>
  );
};

