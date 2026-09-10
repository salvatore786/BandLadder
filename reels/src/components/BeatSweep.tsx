import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {LAYOUT} from '../brand';

/**
 * A colour band that sweeps the full width of the frame on each beat. It sits
 * behind the content cards, so it reads in the margins as a flourish while
 * contributing a large, short-lived movement — the reference reels change
 * something big roughly every half second, and holding still between narration
 * lines is what made the earlier builds feel frozen.
 */
export const BeatSweep: React.FC<{
  beats: number[];
  colors: string[];
  /** Frames the band takes to cross. */
  durationInFrames?: number;
}> = ({beats, colors, durationInFrames = 20}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      {beats.map((at, i) => {
        if (frame < at || frame > at + durationInFrames + 6) return null;
        const p = interpolate(frame - at, [0, durationInFrames], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.32, 0, 0.68, 1),
        });
        const dir = i % 2 === 0 ? 1 : -1;
        const x = interpolate(p, [0, 1], [-dir * (width * 1.6), dir * (width * 1.6)]);
        const fade = interpolate(p, [0, 0.25, 0.8, 1], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={`${at}-${i}`}
            style={{
              position: 'absolute',
              left: -width * 0.3,
              width: width * 1.6,
              height: 640 + (i % 3) * 150,
              top: height * (0.16 + ((i * 0.17) % 0.62)),
              backgroundColor: colors[i % colors.length],
              borderRadius: LAYOUT.radius.pill,
              transform: `translateX(${x}px) rotate(${-7 + (i % 4) * 3.5}deg)`,
              opacity: fade * 0.85,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
