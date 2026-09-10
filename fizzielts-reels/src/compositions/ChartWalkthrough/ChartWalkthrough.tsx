import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLOR, LAYOUT, MODULE_ACCENT, TYPE } from "../../brand";
import { FONT } from "../../fonts";
import { Card, Page } from "../../components/Page";
import { Hook } from "../../components/Hook";
import { StepProgress } from "../../components/StepProgress";
import { FoundSoFar } from "../../components/FoundSoFar";
import { Captions } from "../../components/Captions";
import { RoughShape } from "../../components/RoughShape";
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
}) => {
  const frame = useCurrentFrame();
  const accent = MODULE_ACCENT[module];

  const live = annotations.filter(
    (a) => frame >= a.fromFrame && frame < a.fromFrame + a.durationInFrames
  );
  // While an annotation is up, its bar is the only one at full strength.
  const focus =
    live.length > 0
      ? new Set(live.map((a) => barKey(a.target.category, a.target.seriesIndex)))
      : undefined;

  const showOverview = frame >= overview.atFrame;

  return (
    <Page accent={accent}>
      <Hook eyebrow={eyebrow} headline={headline} accent={accent} />

      <div
        style={{
          fontFamily: FONT.hand,
          fontSize: TYPE.handwritten.size,
          color: accent,
          marginTop: 6,
          opacity: interpolate(frame, [26, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {handSubtitle}
      </div>

      <Card accent={accent} style={{ marginTop: 22, padding: "24px 26px 18px" }}>
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
              maxWidth: 470,
              lineHeight: 1.28,
            }}
          >
            {chart.title}
          </div>
          <Legend series={chart.series} />
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <div
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontFamily: FONT.sans,
              fontSize: TYPE.small.size,
              color: COLOR.muted,
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
  const boxes = barLayout(chart);
  const bar = boxes.find(
    (b) => b.category === annotation.target.category && b.seriesIndex === annotation.target.seriesIndex
  );
  if (!bar) return null;

  const t = frame - annotation.fromFrame;
  const progress = interpolate(t, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textIn = interpolate(t, [4, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
    <AbsoluteFill style={{ pointerEvents: "none" }}>
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
          transform: `translateY(${interpolate(textIn, [0, 1], [10, 0])}px) rotate(-3deg)`,
          whiteSpace: "nowrap",
        }}
      >
        {annotation.text}
      </div>
    </AbsoluteFill>
  );
};

export const CHART_CARD_RADIUS = LAYOUT.cardRadius;
