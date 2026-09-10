import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Trail} from '@remotion/motion-blur';

/**
 * <Trail> stacks AbsoluteFill layers, so it collapses any element that takes
 * part in normal flow layout. This gives it the sized, positioned box it needs
 * — motion blur on fast-moving elements without breaking the layout around it.
 */
export const TrailBox: React.FC<{
  height: number;
  width?: number | string;
  layers?: number;
  lag?: number;
  opacity?: number;
  align?: 'flex-start' | 'center' | 'flex-end';
  children: React.ReactNode;
}> = ({
  height,
  width = '100%',
  layers = 4,
  lag = 0.9,
  opacity = 0.35,
  align = 'center',
  children,
}) => (
  <div style={{position: 'relative', width, height}}>
    <Trail layers={layers} lagInFrames={lag} trailOpacity={opacity}>
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: align,
        }}
      >
        {children}
      </AbsoluteFill>
    </Trail>
  </div>
);
