import React from "react";

/**
 * Motion blur for a single moving element.
 *
 * `@remotion/motion-blur` offers two ways to do this and neither fits here.
 * `<CameraMotionBlur>` re-renders the entire tree once per sample, which at
 * these durations costs more render time than the whole reel; `<Trail>` lays
 * its layers out with `AbsoluteFill`, so an inline word inside a flex headline
 * loses its box and stacks in the corner.
 *
 * This keeps the real element in normal flow — so layout is untouched — and
 * draws the ghosts behind it from the same transform function evaluated a
 * couple of frames in the past. Pass the transform rather than a finished
 * string, because the ghost has to know where the element *was*.
 */
export const MotionTrail: React.FC<{
  /** Transform for an element `framesAgo` frames before now. */
  transform: (framesAgo: number) => string;
  /** False skips the ghosts entirely — worth doing once the element is at rest. */
  active?: boolean;
  layers?: number;
  lagInFrames?: number;
  opacity?: number;
  display?: "inline-block" | "block";
  children: React.ReactNode;
}> = ({
  transform,
  active = true,
  layers = 3,
  lagInFrames = 1.2,
  opacity = 0.42,
  display = "inline-block",
  children,
}) => (
  <span style={{ position: "relative", display }}>
    {active
      ? Array.from({ length: layers }, (_, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              display,
              transform: transform((i + 1) * lagInFrames),
              // Fade with distance, so the tail thins out behind the element.
              opacity: opacity * (1 - i / layers),
              filter: `blur(${(i * 0.7).toFixed(1)}px)`,
              pointerEvents: "none",
            }}
          >
            {children}
          </span>
        ))
      : null}
    <span style={{ position: "relative", display, transform: transform(0) }}>{children}</span>
  </span>
);
