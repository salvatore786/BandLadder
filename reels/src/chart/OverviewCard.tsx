import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONTS, INK, LAYOUT, SHADOW, SPRINGS, TYPE} from '../brand';
import {fitToWidth} from '../lib/text';

type Piece = {text: string; highlighted: boolean};

/** Split the overview into plain and highlighted pieces, preserving order. */
const split = (text: string, phrases: string[]): Piece[] => {
  const found: {start: number; end: number}[] = [];
  for (const p of phrases) {
    const i = text.toLowerCase().indexOf(p.toLowerCase());
    if (i >= 0) found.push({start: i, end: i + p.length});
  }
  found.sort((a, b) => a.start - b.start);
  const pieces: Piece[] = [];
  let cursor = 0;
  for (const f of found) {
    if (f.start < cursor) continue;
    if (f.start > cursor) pieces.push({text: text.slice(cursor, f.start), highlighted: false});
    pieces.push({text: text.slice(f.start, f.end), highlighted: true});
    cursor = f.end;
  }
  if (cursor < text.length) pieces.push({text: text.slice(cursor), highlighted: false});
  return pieces;
};

/** Final beat: the completed model overview, scoring phrases in a pale tint. */
export const OverviewCard: React.FC<{
  text: string;
  highlight: string[];
  startFrame: number;
  width: number;
  eyebrow: string;
}> = ({text, highlight, startFrame, width, eyebrow}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pieces = split(text, highlight);

  const card = spring({
    frame: frame - startFrame,
    fps,
    config: SPRINGS.glide,
    durationInFrames: 22,
  });

  const fontSize = fitToWidth({
    text: text.slice(0, 34),
    maxWidth: width - 96,
    fontFamily: FONTS.body,
    fontWeight: 500,
    max: 38,
    min: 28,
  });

  // Each highlight tint wipes in on its own beat, after the card has settled.
  let hiIndex = 0;

  return (
    <div
      style={{
        width,
        backgroundColor: INK.white,
        borderRadius: LAYOUT.radius.xl,
        padding: '34px 40px 40px',
        boxShadow: SHADOW.raised,
        opacity: card,
        transform: `translateY(${interpolate(card, [0, 1], [130, 0])}px) scale(${interpolate(
          card,
          [0, 1],
          [0.9, 1]
        )})`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 24,
          letterSpacing: 5,
          textTransform: 'uppercase',
          color: INK.muted,
          marginBottom: 18,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize,
          fontWeight: 500,
          lineHeight: 1.42,
          color: INK.strong,
        }}
      >
        {pieces.map((p, i) => {
          if (!p.highlighted) return <span key={i}>{p.text}</span>;
          const at = startFrame + 16 + hiIndex * 16;
          hiIndex += 1;
          const w = spring({
            frame: frame - at,
            fps,
            config: SPRINGS.sustain,
            durationInFrames: 20,
          });
          return (
            <span key={i} style={{position: 'relative', display: 'inline'}}>
              <span
                style={{
                  position: 'relative',
                  backgroundImage: `linear-gradient(${INK.highlight}, ${INK.highlight})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${w * 100}% 100%`,
                  backgroundPosition: '0 0',
                  boxDecorationBreak: 'clone',
                  WebkitBoxDecorationBreak: 'clone',
                  padding: '2px 4px',
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                {p.text}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};
