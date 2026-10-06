import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, LAYOUT, MOTION, SHADOW, TYPE, alpha, lighten } from "../../brand";
import { FONT } from "../../fonts";
import { countUp } from "../../motion";
import type { ChartWalkthroughProps } from "../../schemas";

/**
 * Grouped bar chart as plain SVG.
 *
 * Written by hand rather than with a chart library because the walkthrough
 * needs two things a library makes awkward: per-bar reveal control (bars grow
 * from the axis on a frame schedule, and individual bars dim while one is
 * being discussed), and exported pixel geometry so the rough.js annotations
 * can point at a specific bar.
 */

export const CHART = {
  width: 860,
  height: 520,
  padTop: 52, // headroom for the value labels and the grow overshoot
  padBottom: 82, // category labels
  padLeft: 78, // y axis
  padRight: 12,
  groupGap: 0.28, // share of the group slot left as gap
  barGap: 12,
  /** How far the earlier series is mixed toward white. */
  earlierMix: 0.42,
} as const;

export interface BarBox {
  category: string;
  seriesIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  value: number;
}

/** Pixel geometry of every bar, in the chart SVG's own coordinate space. */
export function barLayout(chart: ChartWalkthroughProps["chart"]): BarBox[] {
  const plotW = CHART.width - CHART.padLeft - CHART.padRight;
  const plotH = CHART.height - CHART.padTop - CHART.padBottom;
  const slot = plotW / chart.categories.length;
  const groupW = slot * (1 - CHART.groupGap);
  const barW = (groupW - CHART.barGap * (chart.series.length - 1)) / chart.series.length;

  const boxes: BarBox[] = [];
  chart.categories.forEach((cat, ci) => {
    const groupX = CHART.padLeft + slot * ci + (slot - groupW) / 2;
    cat.values.forEach((value, si) => {
      const h = (value / chart.yMax) * plotH;
      boxes.push({
        category: cat.name,
        seriesIndex: si,
        x: groupX + si * (barW + CHART.barGap),
        y: CHART.padTop + plotH - h,
        w: barW,
        h,
        value,
      });
    });
  });
  return boxes;
}

export const BarChart: React.FC<{
  chart: ChartWalkthroughProps["chart"];
  /** Bars not in this set are dimmed. Undefined means every bar is at full strength. */
  focus?: Set<string>;
}> = ({ chart, focus }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const plotH = CHART.height - CHART.padTop - CHART.padBottom;
  const baseline = CHART.padTop + plotH;
  const boxes = barLayout(chart);

  const ticks: number[] = [];
  for (let v = 0; v <= chart.yMax; v += chart.yTick) ticks.push(v);

  return (
    <svg
      width={CHART.width}
      height={CHART.height}
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      style={{ display: "block" }}
    >
      {/* Gridlines and y-axis values */}
      {ticks.map((v) => {
        const y = baseline - (v / chart.yMax) * plotH;
        return (
          <g key={v}>
            <line
              x1={CHART.padLeft}
              x2={CHART.width - CHART.padRight}
              y1={y}
              y2={y}
              stroke={v === 0 ? alpha(COLOR.ink, 0.35) : COLOR.lavender}
              strokeWidth={v === 0 ? 3 : 1.5}
            />
            <text
              x={CHART.padLeft - 16}
              y={y + 8}
              textAnchor="end"
              fontFamily={FONT.sans}
              fontSize={25}
              fontWeight={500}
              fill={COLOR.body}
            >
              {v}
            </text>
          </g>
        );
      })}

      {/* Bars grow out of the axis on a spring, staggered left to right, and
          overshoot their value before settling back onto it. Each one's number
          counts up alongside rather than appearing at the total. */}
      {boxes.map((b, i) => {
        const at = i * MOTION.staggerFrames;
        const grow = spring({
          frame: frame - at,
          fps,
          config: MOTION.bounce,
          durationInFrames: Math.max(MOTION.keyRevealFrames, chart.growEndFrame),
        });
        const dimmed = focus ? !focus.has(barKey(b.category, b.seriesIndex)) : false;
        // A focused bar lifts once as it comes into focus and holds there.
        const lift = !dimmed && focus ? 6 : 0;
        const h = Math.min(plotH, Math.max(0, b.h * grow + lift));
        const settled = grow > 0.08;

        return (
          <g key={`${b.category}-${b.seriesIndex}`}>
            <rect
              x={b.x}
              y={baseline - h}
              width={b.w}
              height={h}
              rx={LAYOUT.shapeRadius}
              fill={barFill(chart, b)}
              opacity={dimmed ? 0.42 : 1}
              style={{ filter: dimmed ? "none" : `drop-shadow(${SHADOW.shape})` }}
            />
            {settled ? (
              <text
                x={b.x + b.w / 2}
                y={baseline - h - 13}
                textAnchor="middle"
                fontFamily={FONT.sans}
                fontSize={26}
                fontWeight={700}
                fill={dimmed ? COLOR.muted : COLOR.ink}
                opacity={dimmed ? 0.5 : 1}
              >
                {countUp(grow, b.value)}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Category labels */}
      {chart.categories.map((cat, ci) => {
        const group = boxes.filter((b) => b.category === cat.name);
        const mid = (group[0].x + group[group.length - 1].x + group[group.length - 1].w) / 2;
        return (
          <text
            key={cat.name}
            x={mid}
            y={baseline + 40}
            textAnchor="middle"
            fontFamily={FONT.sans}
            fontSize={TYPE.label.size}
            fontWeight={700}
            fill={cat.color}
          >
            {cat.name}
          </text>
        );
      })}
    </svg>
  );
};

export const barKey = (category: string, seriesIndex: number) => `${category}#${seriesIndex}`;

/** Colour is the category's; the shade says which year. */
export function barFill(chart: ChartWalkthroughProps["chart"], b: BarBox): string {
  const base = chart.categories.find((c) => c.name === b.category)?.color ?? COLOR.ink;
  const isEarlier = b.seriesIndex < chart.series.length - 1;
  return isEarlier ? lighten(base, CHART.earlierMix) : base;
}

/**
 * Hue now means category, so the legend explains the shade instead: pale is the
 * earlier year, solid is the later one.
 */
export const Legend: React.FC<{ chart: ChartWalkthroughProps["chart"] }> = ({ chart }) => {
  // Neutral, so the swatch cannot be read as "blue means 2020".
  const sample = COLOR.body;
  return (
    <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
      {chart.series.map((s, i) => {
        const isEarlier = i < chart.series.length - 1;
        return (
          <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: isEarlier ? lighten(sample, CHART.earlierMix) : sample,
                border: `2px solid ${alpha(COLOR.ink, 0.12)}`,
              }}
            />
            <span
              style={{
                fontFamily: FONT.sans,
                fontSize: TYPE.label.size,
                fontWeight: 600,
                color: COLOR.ink,
              }}
            >
              {s.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
