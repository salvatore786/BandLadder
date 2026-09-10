import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Trail} from '@remotion/motion-blur';
import {TrailBox} from './TrailBox';
import {FONTS, INK, LAYOUT, SPRINGS, TYPE, MOTION} from '../brand';
import {fitToWidth} from '../lib/text';

/**
 * Frames 0-60 decide the three-second skip rate, so they must contain large,
 * colourful, CONTINUOUS motion: colour bands sweeping across the frame and
 * words arriving IN MOTION from alternating sides — never a fade-in over a
 * still title card.
 */
export const Hook: React.FC<{
  words: string[];
  kicker: string;
  durationInFrames: number;
  accents: readonly string[];
  /** Sweeping band colours, from the reel's own palette. */
  bands: string[];
}> = ({words, kicker, durationInFrames, accents, bands}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  // The whole hook lifts away rather than cutting, so the frame never stops.
  const handoff = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  const kickerIn = spring({frame: frame - 2, fps, config: SPRINGS.snap, durationInFrames: 10});

  return (
    <AbsoluteFill
      style={{
        opacity: 1 - handoff,
        transform: `scale(${1 + handoff * 0.14}) translateY(${-handoff * 90}px)`,
      }}
    >
      {/* Colour bands sweep the full width of the frame from frame 0. */}
      {bands.map((color, i) => {
        const at = i * 4;
        const p = spring({
          frame: frame - at,
          fps,
          config: SPRINGS.sustain,
          durationInFrames: 26,
        });
        const dir = i % 2 === 0 ? -1 : 1;
        const x = interpolate(p, [0, 1], [dir * (width + 400), 0]);
        const drift = Math.sin((frame - at) * 0.035) * 26;
        return (
          <Trail key={i} layers={4} lagInFrames={1.1} trailOpacity={0.35}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                width: width * 1.5,
                height: 210,
                top: height * 0.24 + i * 190,
                backgroundColor: color,
                borderRadius: LAYOUT.radius.pill,
                transform: `translateX(${x + drift - width * 0.25}px) rotate(${
                  -6 + i * 4
                }deg)`,
              }}
            />
          </Trail>
        );
      })}

      <div
        style={{
          position: 'absolute',
          top: LAYOUT.safeTop + 60,
          left: 0,
          width,
          textAlign: 'center',
          fontFamily: FONTS.mono,
          fontSize: TYPE.eyebrow.size,
          letterSpacing: TYPE.eyebrow.letterSpacing,
          textTransform: 'uppercase',
          color: INK.strong,
          opacity: kickerIn,
          transform: `translateY(${interpolate(kickerIn, [0, 1], [-40, 0])}px)`,
        }}
      >
        {kicker}
      </div>

      {/* Words snap into place one at a time, arriving from alternating sides. */}
      <div
        style={{
          position: 'absolute',
          top: height * 0.3,
          left: LAYOUT.gutter,
          width: width - LAYOUT.gutter * 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {words.map((word, i) => {
          const at = 6 + i * 7;
          const p = spring({
            frame: frame - at,
            fps,
            config: SPRINGS.pop,
            durationInFrames: Math.max(MOTION.minEntrance, 14),
          });
          const dir = i % 2 === 0 ? -1 : 1;
          const x = interpolate(p, [0, 1], [dir * 760, 0]);
          const rot = interpolate(p, [0, 1], [dir * 14, 0]);
          const fontSize = fitToWidth({
            text: word,
            maxWidth: width - LAYOUT.gutter * 2,
            fontFamily: FONTS.display,
            fontWeight: 600,
            max: 132,
            min: 56,
          });
          return (
            <TrailBox
              key={i}
              height={fontSize * 1.12}
              layers={5}
              lag={0.9}
              opacity={0.4}
              align={i % 2 === 0 ? 'flex-start' : 'flex-end'}
            >
              <div
                style={{
                  fontFamily: FONTS.display,
                  fontSize,
                  fontWeight: 600,
                  lineHeight: 1.02,
                  letterSpacing: -2,
                  color: accents[i % accents.length],
                  transform: `translateX(${x}px) rotate(${rot}deg) scale(${interpolate(
                    p,
                    [0, 1],
                    [0.7, 1]
                  )})`,
                  textAlign: i % 2 === 0 ? 'left' : 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {word}
              </div>
            </TrailBox>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
