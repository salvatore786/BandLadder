import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ACCENT_CYCLE, FONTS, INK, LAYOUT, SHADOW, SPRINGS} from '../brand';
import {fitToWidth} from '../lib/text';
import type {ChartWalkthroughProps} from '../schema';

/** Numbered 3-step progress bar along the bottom. */
export const StepProgress: React.FC<{
  steps: ChartWalkthroughProps['steps'];
  width: number;
}> = ({steps, width}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const activeIndex = steps.reduce(
    (acc, s, i) => (frame >= s.startFrame ? i : acc),
    -1
  );

  return (
    <div style={{width, display: 'flex', gap: 14}}>
      {steps.map((s, i) => {
        const active = i <= activeIndex;
        const at = s.startFrame;
        const p = frame >= at
          ? spring({frame: frame - at, fps, config: SPRINGS.pop, durationInFrames: 16})
          : 0;
        const color = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
        const size = fitToWidth({
          text: s.label,
          maxWidth: width / steps.length - 90,
          fontFamily: FONTS.body,
          fontWeight: 600,
          max: 26,
          min: 17,
        });
        return (
          <div
            key={s.label}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              backgroundColor: active ? INK.white : INK.highlight,
              borderRadius: LAYOUT.radius.pill,
              padding: '12px 16px',
              boxShadow: active ? SHADOW.chip : 'none',
              transform: `translateY(${
                frame >= at ? interpolate(p, [0, 1], [26, 0]) : 0
              }px) scale(${
                i === activeIndex ? interpolate(p, [0, 1], [0.9, 1.03]) : 1
              })`,
              opacity: active ? 1 : 0.8,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                flexShrink: 0,
                borderRadius: LAYOUT.radius.pill,
                backgroundColor: active ? color : INK.hairline,
                color: INK.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.body,
                fontSize: 21,
                fontWeight: 600,
              }}
            >
              {i + 1}
            </div>
            <span
              style={{
                fontFamily: FONTS.body,
                fontSize: size,
                fontWeight: 600,
                color: active ? INK.strong : INK.body,
                lineHeight: 1.15,
              }}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
