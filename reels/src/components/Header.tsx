import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONTS, INK, LAYOUT, SHADOW, SPRINGS, TYPE} from '../brand';
import {fitToWidth} from '../lib/text';

/** Persistent header on a warm tinted band, with a section label that switches. */
export const Header: React.FC<{
  title: string;
  /** Section label, e.g. WALKTHROUGH. */
  section: string;
  /** Second section label the header switches to. */
  sectionAlt?: string;
  /** Frame the switch happens on. */
  switchFrame?: number;
  band: string;
  accent: string;
  /** Handwritten Caveat subtitle beneath the title. */
  subtitle?: string;
}> = ({title, section, sectionAlt, switchFrame, band, accent, subtitle}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();

  const inner = width - LAYOUT.gutter * 2;
  const bandIn = spring({frame: frame - 4, fps, config: SPRINGS.glide, durationInFrames: 18});

  const switched = switchFrame !== undefined && sectionAlt && frame >= switchFrame;
  const label = switched ? sectionAlt! : section;
  // The label flips on a spring rather than cutting.
  const flip = switchFrame === undefined
    ? 1
    : spring({frame: frame - switchFrame, fps, config: SPRINGS.pop, durationInFrames: 12});
  const flipT = switched
    ? interpolate(flip, [0, 1], [-34, 0])
    : 0;

  const titleSize = fitToWidth({
    text: title,
    maxWidth: inner - 60,
    fontFamily: FONTS.display,
    fontWeight: 600,
    max: TYPE.headline.size,
    min: 42,
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: LAYOUT.headerTop,
        left: LAYOUT.gutter,
        width: inner,
        backgroundColor: band,
        borderRadius: LAYOUT.radius.xl,
        padding: '30px 36px 34px',
        boxShadow: SHADOW.card,
        transform: `translateY(${interpolate(bandIn, [0, 1], [-70, 0])}px) scale(${interpolate(
          bandIn,
          [0, 1],
          [0.94, 1]
        )})`,
        opacity: bandIn,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: accent,
          color: INK.white,
          borderRadius: LAYOUT.radius.pill,
          padding: '9px 22px',
          fontFamily: FONTS.mono,
          fontSize: TYPE.eyebrow.size,
          letterSpacing: TYPE.eyebrow.letterSpacing,
          textTransform: 'uppercase',
          overflow: 'hidden',
          transform: `translateY(${flipT}px)`,
          opacity: switched ? flip : 1,
          marginBottom: 16,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: titleSize,
          fontWeight: 600,
          lineHeight: TYPE.headline.lineHeight,
          letterSpacing: TYPE.headline.letterSpacing,
          color: INK.strong,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            fontFamily: FONTS.hand,
            fontSize: TYPE.hand.size,
            fontWeight: TYPE.hand.weight,
            color: INK.handwriting,
            marginTop: 8,
            transform: `rotate(-1.6deg) translateX(${interpolate(
              bandIn,
              [0, 1],
              [-30, 0]
            )}px)`,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
};
