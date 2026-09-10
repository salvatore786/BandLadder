import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ACCENTS, FONTS, INK, LAYOUT, SHADOW, SPRINGS} from '../brand';
import type {ChartWalkthroughProps} from '../schema';

const TAG_COLOR: Record<string, string> = {
  UP: ACCENTS.green,
  DOWN: ACCENTS.crimson,
  LARGEST: ACCENTS.purple,
  SMALLEST: ACCENTS.blue,
};

/** The card that accumulates tags as each is discovered, each filling with its value. */
export const FoundSoFar: React.FC<{
  tags: ChartWalkthroughProps['tags'];
  startFrame: number;
  width: number;
}> = ({tags, startFrame, width}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const card = spring({
    frame: frame - startFrame,
    fps,
    config: SPRINGS.glide,
    durationInFrames: 18,
  });

  return (
    <div
      style={{
        width,
        backgroundColor: INK.white,
        borderRadius: LAYOUT.radius.xl,
        padding: '22px 28px 26px',
        boxShadow: SHADOW.card,
        opacity: card,
        transform: `translateY(${interpolate(card, [0, 1], [70, 0])}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 24,
          letterSpacing: 5,
          textTransform: 'uppercase',
          color: INK.muted,
          marginBottom: 16,
        }}
      >
        Found so far
      </div>
      <div style={{display: 'flex', flexWrap: 'nowrap', gap: 10}}>
        {tags.map((t, i) => {
          const found = frame >= t.foundFrame;
          // Tags slide in from the side.
          const p = found
            ? spring({
                frame: frame - t.foundFrame,
                fps,
                config: SPRINGS.pop,
                durationInFrames: 18,
              })
            : 0;
          const color = TAG_COLOR[t.kind] ?? ACCENTS.purple;
          return (
              <div
                key={t.kind + i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  borderRadius: LAYOUT.radius.pill,
                  padding: '9px 16px',
                  backgroundColor: found ? color : INK.highlight,
                  boxShadow: found ? SHADOW.chip : 'none',
                  opacity: found ? 1 : 0.5,
                  transform: `translateX(${interpolate(p, [0, 1], [found ? 90 : 0, 0])}px) scale(${
                    found ? interpolate(p, [0, 1], [0.8, 1]) : 0.96
                  })`,
                }}
              >
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 19,
                    letterSpacing: 1.4,
                    color: found ? INK.white : INK.muted,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.kind}
                </span>
                <span
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 25,
                    fontWeight: 600,
                    color: found ? INK.white : INK.muted,
                    opacity: found ? p : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {found ? t.value : '—'}
                </span>
              </div>
          );
        })}
      </div>
    </div>
  );
};
