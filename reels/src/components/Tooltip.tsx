import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONTS, INK, LAYOUT, SHADOW, SPRINGS, TYPE} from '../brand';

/** Timed dark bubble over the stage, e.g. "Wait for the correction." */
export const Tooltip: React.FC<{
  text: string;
  startFrame: number;
  durationInFrames: number;
  /** Normalised stage coordinates. */
  at: {x: number; y: number};
  stage: {width: number; height: number};
}> = ({text, startFrame, durationInFrames, at, stage}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < startFrame || frame > startFrame + durationInFrames) return null;

  const p = spring({
    frame: frame - startFrame,
    fps,
    config: SPRINGS.pop,
    durationInFrames: 13,
  });
  const out = interpolate(
    frame,
    [startFrame + durationInFrames - 9, startFrame + durationInFrames],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
  // Bubbles bob so the frame never comes to a full stop while one is showing.
  const bob = Math.sin((frame - startFrame) * 0.13) * 6;

  return (
    <div
      style={{
        position: 'absolute',
        left: at.x * stage.width,
        top: at.y * stage.height,
        transform: `translate(-50%, -50%) translateY(${
          interpolate(p, [0, 1], [46, 0]) + bob
        }px) scale(${interpolate(p, [0, 1], [0.72, 1])})`,
        opacity: Math.min(p, out),
        backgroundColor: INK.bubble,
        color: INK.bubbleText,
        borderRadius: LAYOUT.radius.lg,
        padding: '18px 26px',
        fontFamily: FONTS.body,
        fontSize: TYPE.bodySm.size,
        fontWeight: 600,
        lineHeight: 1.25,
        boxShadow: SHADOW.raised,
        maxWidth: stage.width * 0.72,
        textAlign: 'center',
      }}
    >
      {text}
      <div
        style={{
          position: 'absolute',
          bottom: -13,
          left: '50%',
          marginLeft: -13,
          width: 0,
          height: 0,
          borderLeft: '13px solid transparent',
          borderRight: '13px solid transparent',
          borderTop: `14px solid ${INK.bubble}`,
        }}
      />
    </div>
  );
};
