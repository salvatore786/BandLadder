import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {TrailBox} from '../components/TrailBox';
import {
  ACCENTS,
  CHART_PALETTE,
  FONTS,
  INK,
  LAYOUT,
  SHADOW,
  SPRINGS,
  TYPE,
} from '../brand';
import {countUp} from '../lib/motion';
import {fitToWidth} from '../lib/text';
import type {ChartWalkthroughProps} from '../schema';

/** Fully saturated, dark marks against the warm light ground — that contrast is the point. */
export const SERIES_COLORS = [ACCENTS.teal, CHART_PALETTE.bars, ACCENTS.orange];

export const CHART_BOX = {width: 952, height: 700};
const AXIS_W = 86;
const LABEL_H = 66;
const LEGEND_H = 62;

/** Normalised (0-1) centre of a bar, so annotations can arrow at it. */
export const barCentre = (
  seriesIndex: number,
  categoryIndex: number,
  categoryCount: number,
  seriesCount: number,
  value: number,
  max: number
) => {
  const plotW = CHART_BOX.width - AXIS_W;
  const plotH = CHART_BOX.height - LABEL_H - LEGEND_H;
  const groupW = plotW / categoryCount;
  const barW = Math.min(78, (groupW - 34) / seriesCount);
  const groupLeft = AXIS_W + categoryIndex * groupW;
  const inner = (groupW - barW * seriesCount - 14 * (seriesCount - 1)) / 2;
  const x = groupLeft + inner + seriesIndex * (barW + 14) + barW / 2;
  const h = (value / max) * plotH;
  const y = LEGEND_H + plotH - h;
  return {x: x / CHART_BOX.width, y: y / CHART_BOX.height, barW, plotH};
};

export const BarChart: React.FC<{
  categories: string[];
  series: ChartWalkthroughProps['series'];
  seriesRevealFrames: number[];
  unit: string;
  max?: number;
  /** The band slides to each category as the narration reaches it. */
  focus?: ChartWalkthroughProps['focus'];
}> = ({categories, series, seriesRevealFrames, unit, max = 100, focus = []}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const plotW = CHART_BOX.width - AXIS_W;
  const plotH = CHART_BOX.height - LABEL_H - LEGEND_H;
  const groupW = plotW / categories.length;
  const barW = Math.min(78, (groupW - 34) / series.length);
  const gridlines = [0, 25, 50, 75, 100];

  // Focus state: the band slides to the group under discussion and the other
  // groups step back, so the eye is led instead of left to search.
  const activeFocus = focus.filter((f) => frame >= f.startFrame);
  const currentFocus = activeFocus[activeFocus.length - 1];
  const previousFocus =
    activeFocus.length > 1 ? activeFocus[activeFocus.length - 2] : currentFocus;
  const focusP = currentFocus
    ? spring({
        frame: frame - currentFocus.startFrame,
        fps,
        config: SPRINGS.sustain,
        durationInFrames: 26,
      })
    : 0;
  const dimOf = (ci: number) => {
    if (!currentFocus) return 1;
    const from = previousFocus.categoryIndex === ci ? 1 : 0.42;
    const to = currentFocus.categoryIndex === ci ? 1 : 0.42;
    return interpolate(focusP, [0, 1], [from, to]);
  };
  const liftOf = (ci: number) => {
    if (!currentFocus) return 0;
    const from = previousFocus.categoryIndex === ci ? -16 : 0;
    const to = currentFocus.categoryIndex === ci ? -16 : 0;
    return interpolate(focusP, [0, 1], [from, to]);
  };

  return (
    <div style={{position: 'relative', width: CHART_BOX.width, height: CHART_BOX.height}}>
      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: AXIS_W,
          width: CHART_BOX.width - AXIS_W,
          height: LEGEND_H,
          display: 'flex',
          gap: 30,
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        {series.map((s, si) => {
          const p = spring({
            frame: frame - (seriesRevealFrames[si] ?? 0) + 6,
            fps,
            config: SPRINGS.pop,
            durationInFrames: 12,
          });
          return (
            <div
              key={s.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: p,
                transform: `translateX(${interpolate(p, [0, 1], [-44, 0])}px)`,
                backgroundColor: INK.white,
                borderRadius: LAYOUT.radius.pill,
                padding: '8px 20px 8px 12px',
                boxShadow: SHADOW.chip,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  backgroundColor: SERIES_COLORS[si % SERIES_COLORS.length],
                }}
              />
              <span
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 28,
                  fontWeight: 600,
                  color: INK.strong,
                }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* The focus band — slides to the group under discussion, so the eye is
          led rather than left to search, and the plot is never fully still. */}
      {(() => {
        if (!currentFocus) return null;
        const leftOf = (i: number) => AXIS_W + i * groupW;
        const left = interpolate(
          focusP,
          [0, 1],
          [leftOf(previousFocus.categoryIndex), leftOf(currentFocus.categoryIndex)]
        );
        return (
          <div
            style={{
              position: 'absolute',
              left,
              top: LEGEND_H - 10,
              width: groupW,
              height: plotH + 20,
              backgroundColor: CHART_PALETTE.blobs.apricot,
              borderRadius: LAYOUT.radius.lg,
              opacity: 0.62,
            }}
          />
        );
      })()}

      {/* Gridlines and axis */}
      {gridlines.map((g) => {
        const y = LEGEND_H + plotH - (g / max) * plotH;
        const reveal = spring({
          frame: frame - 2 - g * 0.08,
          fps,
          config: SPRINGS.glide,
          durationInFrames: 14,
        });
        return (
          <div key={g}>
            <div
              style={{
                position: 'absolute',
                left: AXIS_W,
                top: y,
                width: plotW * reveal,
                height: 2,
                backgroundColor: INK.hairline,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: y - 18,
                width: AXIS_W - 18,
                textAlign: 'right',
                fontFamily: FONTS.mono,
                fontSize: 24,
                color: INK.muted,
                opacity: reveal,
              }}
            >
              {g}
              {unit}
            </div>
          </div>
        );
      })}

      {/* Bars — grow from the axis with spring overshoot */}
      {categories.map((cat, ci) =>
        series.map((s, si) => {
          const at = (seriesRevealFrames[si] ?? 0) + ci * 4;
          const p = spring({
            frame: frame - at,
            fps,
            config: SPRINGS.pop,
            durationInFrames: 22,
          });
          const value = s.values[ci] ?? 0;
          const h = (value / max) * plotH * p;
          const groupLeft = AXIS_W + ci * groupW;
          const inner = (groupW - barW * series.length - 14 * (series.length - 1)) / 2;
          const left = groupLeft + inner + si * (barW + 14);
          const shown = countUp({frame, fps, at, to: value, durationInFrames: 24});
          return (
            <div key={`${ci}-${si}`}>
              <div
                style={{
                  position: 'absolute',
                  left,
                  width: barW,
                  bottom: LABEL_H,
                  height: Math.max(0, h),
                  backgroundColor: SERIES_COLORS[si % SERIES_COLORS.length],
                  borderRadius: `${LAYOUT.radius.md}px ${LAYOUT.radius.md}px 6px 6px`,
                  boxShadow: SHADOW.card,
                  opacity: dimOf(ci),
                  transform: `translateY(${liftOf(ci)}px)`,
                }}
              />
              {p > 0.02 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: left - 14,
                    width: barW + 28,
                    bottom: LABEL_H + Math.max(0, h) + 12 - liftOf(ci),
                    textAlign: 'center',
                    fontFamily: FONTS.body,
                    fontSize: 30,
                    fontWeight: 600,
                    color: SERIES_COLORS[si % SERIES_COLORS.length],
                    opacity:
                      interpolate(p, [0.15, 0.6], [0, 1], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                      }) * dimOf(ci),
                  }}
                >
                  <TrailBox height={38} layers={3} lag={0.7} opacity={0.3}>
                    <span>
                      {shown}
                      {unit}
                    </span>
                  </TrailBox>
                </div>
              ) : null}
            </div>
          );
        })
      )}

      {/* Category labels */}
      {categories.map((cat, ci) => {
        const p = spring({
          frame: frame - (seriesRevealFrames[0] ?? 0) - ci * 3,
          fps,
          config: SPRINGS.snap,
          durationInFrames: 12,
        });
        const size = fitToWidth({
          text: cat,
          maxWidth: groupW - 12,
          fontFamily: FONTS.body,
          fontWeight: 600,
          max: 32,
          min: 20,
        });
        return (
          <div
            key={cat}
            style={{
              position: 'absolute',
              left: AXIS_W + ci * groupW,
              width: groupW,
              bottom: 16,
              textAlign: 'center',
              fontFamily: FONTS.body,
              fontSize: size,
              fontWeight: 600,
              color: INK.strong,
              opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
            }}
          >
            {cat}
          </div>
        );
      })}
    </div>
  );
};
