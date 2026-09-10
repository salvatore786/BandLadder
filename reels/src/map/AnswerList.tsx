import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {TrailBox} from '../components/TrailBox';
import {ACCENT_CYCLE, FONTS, INK, LAYOUT, SHADOW, SPRINGS, TYPE} from '../brand';
import {fitToWidth} from '../lib/text';
import {enterStaggered, travelIn} from '../lib/motion';
import type {MapWalkthroughProps} from '../schema';

/** Numbered answer rows, each filling in progressively, each with its own hue. */
export const AnswerList: React.FC<{
  answers: MapWalkthroughProps['answers'];
  /** Frame the panel itself slides up. */
  panelFrame: number;
  width: number;
}> = ({answers, panelFrame, width}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const panel = spring({
    frame: frame - panelFrame,
    fps,
    config: SPRINGS.glide,
    durationInFrames: 20,
  });

  const rowH = 58;

  return (
    <div
      style={{
        width,
        backgroundColor: INK.white,
        borderRadius: LAYOUT.radius.xl,
        padding: '20px 28px 22px',
        boxShadow: SHADOW.card,
        opacity: panel,
        transform: `translateY(${interpolate(panel, [0, 1], [110, 0])}px)`,
      }}
    >
      {answers.map((a, i) => {
        const color = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
        const rowIn = enterStaggered({
          frame,
          fps,
          at: panelFrame + 4,
          index: i,
          config: 'pop',
          durationInFrames: 12,
        });
        const revealed = frame >= a.revealFrame && !a.practice;
        const reveal = revealed
          ? spring({
              frame: frame - a.revealFrame,
              fps,
              config: SPRINGS.pop,
              durationInFrames: 20,
            })
          : 0;
        const t = travelIn(rowIn, {axis: 'x', travel: 60, from: -1, scaleFrom: 0.92});

        const promptSize = fitToWidth({
          text: a.prompt,
          maxWidth: width - 300,
          fontFamily: FONTS.body,
          fontWeight: 500,
          max: TYPE.bodySm.size,
          min: 24,
        });

        return (
          <div
            key={a.number}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              height: rowH,
              opacity: t.opacity,
              transform: t.transform,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: LAYOUT.radius.pill,
                backgroundColor: revealed ? color : INK.hairline,
                color: revealed ? INK.white : INK.muted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.body,
                fontSize: 28,
                fontWeight: 600,
                flexShrink: 0,
                transform: `scale(${1 + reveal * 0.12})`,
              }}
            >
              {a.number}
            </div>
            <div
              style={{
                flex: 1,
                fontFamily: FONTS.body,
                fontSize: promptSize,
                fontWeight: 500,
                color: INK.body,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {a.prompt}
            </div>
            {/* The answer slot: fills in on the narration beat, or stays blank
                for the practice section. */}
            <div
              style={{
                minWidth: 210,
                height: 54,
                borderRadius: LAYOUT.radius.md,
                backgroundColor: revealed ? color : INK.highlight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 18px',
                overflow: 'hidden',
                boxShadow: revealed ? SHADOW.chip : 'none',
                transform: `scale(${interpolate(reveal, [0, 1], [0.9, 1])})`,
              }}
            >
              <TrailBox height={44} layers={3} lag={0.8} opacity={0.3}>
                <span
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 30,
                    fontWeight: 600,
                    color: revealed ? INK.white : INK.muted,
                    whiteSpace: 'nowrap',
                    opacity: revealed ? reveal : 1,
                    transform: revealed
                      ? `translateY(${interpolate(reveal, [0, 1], [46, 0])}px)`
                      : 'none',
                    display: 'inline-block',
                  }}
                >
                  {revealed ? a.answer : a.practice ? '?' : '—'}
                </span>
              </TrailBox>
            </div>
          </div>
        );
      })}
    </div>
  );
};
