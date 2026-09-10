import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLOR, TYPE } from "../../brand";
import { FONT } from "../../fonts";
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
  padTop: 18,
  padBottom: 74, // category labels
  padLeft: 78, // y axis
  padRight: 12,
  groupGap: 0.32, // share of the group slot left as gap
  barGap: 10,
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
              stroke={COLOR.lavender}
              strokeWidth={v === 0 ? 2 : 1}
            />
            <text
              x={CHART.padLeft - 16}
              y={y + 8}
              textAnchor="end"
              fontFamily={FONT.sans}
              fontSize={22}
              fill={COLOR.muted}
            >
              {v}
            </text>
          </g>
        );
      })}

      {/* Bars grow out of the axis, staggered left to right */}
      {boxes.map((b, i) => {
        const delay = i * 2;
        const grow = interpolate(frame - delay, [0, chart.growEndFrame], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const h = b.h * grow;
        const dimmed = focus ? !focus.has(barKey(b.category, b.seriesIndex)) : false;

        return (
          <rect
            key={`${b.category}-${b.seriesIndex}`}
            x={b.x}
            y={baseline - h}
            width={b.w}
            height={h}
            rx={4}
            fill={chart.series[b.seriesIndex].color}
            opacity={dimmed ? 0.34 : 1}
          />
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
            fontWeight={500}
            fill={COLOR.ink}
          >
            {cat.name}
          </text>
        );
      })}
    </svg>
  );
};

export const barKey = (category: string, seriesIndex: number) => `${category}#${seriesIndex}`;

export const Legend: React.FC<{ series: ChartWalkthroughProps["chart"]["series"] }> = ({
  series,
}) => (
  <div style={{ display: "flex", gap: 30, alignItems: "center" }}>
    {series.map((s) => (
      <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: s.color }} />
        <span
          style={{
            fontFamily: FONT.sans,
            fontSize: TYPE.label.size,
            fontWeight: 500,
            color: COLOR.ink,
          }}
        >
          {s.name}
        </span>
      </div>
    ))}
  </div>
);
