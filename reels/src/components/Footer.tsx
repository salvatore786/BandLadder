import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {BRAND, FONTS, INK, LAYOUT, TYPE} from '../brand';
import {enter} from '../lib/motion';

/** The fizzIELTS lockup: "fizz" in ink, "IELTS" in purple, handle + URL in mono. */
export const Footer: React.FC<{handle: string; url: string}> = ({handle, url}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const p = enter({frame, fps, at: 10, config: 'glide', durationInFrames: 20});
  // Never fully still: the lockup breathes on a slow sine.
  const breathe = 1 + Math.sin(frame * 0.035) * 0.008;

  return (
    <div
      style={{
        position: 'absolute',
        left: LAYOUT.gutter,
        right: LAYOUT.gutter,
        bottom: LAYOUT.footerBottom,
        width: width - LAYOUT.gutter * 2,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [34, 0])}px) scale(${breathe})`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: 46,
          fontWeight: 600,
          letterSpacing: -1,
          lineHeight: 1,
        }}
      >
        <span style={{color: BRAND.fizz}}>fizz</span>
        <span style={{color: BRAND.ielts}}>IELTS</span>
      </div>
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 22,
          color: INK.muted,
          textAlign: 'right',
          lineHeight: 1.45,
          letterSpacing: 1.2,
        }}
      >
        <div>{handle}</div>
        <div>{url}</div>
      </div>
    </div>
  );
};
