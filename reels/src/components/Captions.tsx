import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {FONTS, INK, LAYOUT, SHADOW, SPRINGS, TYPE} from '../brand';
import {wordTimings, fitToWidth} from '../lib/text';
import type {NarrationCue} from '../schema';

/**
 * Karaoke captions driven by the SAME narration timing array that drives the
 * TTS render, so voice and captions cannot drift apart.
 */
export const Captions: React.FC<{
  cues: NarrationCue[];
  accent: string;
  maxWidth: number;
}> = ({cues, accent, maxWidth}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();

  const cue = cues.find(
    (c) => frame >= c.startFrame && frame < c.startFrame + c.durationInFrames
  );
  if (!cue) return null;

  const words = wordTimings(cue.text, cue.startFrame, cue.durationInFrames);
  const fontSize = fitToWidth({
    text: cue.text.length > 46 ? cue.text.slice(0, 46) : cue.text,
    maxWidth: maxWidth * 1.85,
    fontFamily: FONTS.body,
    fontWeight: TYPE.caption.weight,
    max: TYPE.caption.size,
    min: 30,
  });

  const cardIn = spring({
    frame: frame - cue.startFrame,
    fps,
    config: SPRINGS.glide,
    durationInFrames: 10,
  });
  const cardOut = interpolate(
    frame,
    [cue.startFrame + cue.durationInFrames - 7, cue.startFrame + cue.durationInFrames],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: LAYOUT.gutter,
        width: width - LAYOUT.gutter * 2,
        bottom: LAYOUT.captionBottom,
        display: 'flex',
        justifyContent: 'center',
        opacity: Math.min(cardIn, cardOut),
        transform: `translateY(${interpolate(cardIn, [0, 1], [40, 0])}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: INK.white,
          borderRadius: LAYOUT.radius.lg,
          padding: '20px 30px',
          boxShadow: SHADOW.card,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0 14px',
          maxWidth: maxWidth,
        }}
      >
        {words.map((w) => {
          const active = frame >= w.from && frame < w.to;
          const spoken = frame >= w.to;
          // Each word snaps up as it is spoken — one word highlighting at a time.
          const lift = spring({
            frame: frame - Math.round(w.from),
            fps,
            config: SPRINGS.snap,
            durationInFrames: 9,
          });
          return (
            <span
              key={w.index}
              style={{
                fontFamily: FONTS.body,
                fontSize,
                fontWeight: TYPE.caption.weight,
                lineHeight: TYPE.caption.lineHeight,
                letterSpacing: TYPE.caption.letterSpacing,
                color: active ? accent : spoken ? INK.strong : INK.muted,
                display: 'inline-block',
                transform: active
                  ? `translateY(${interpolate(lift, [0, 1], [10, -5])}px) scale(${interpolate(
                      lift,
                      [0, 1],
                      [0.95, 1.07]
                    )})`
                  : 'translateY(0px) scale(1)',
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
