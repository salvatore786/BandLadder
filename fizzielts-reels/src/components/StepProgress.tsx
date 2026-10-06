import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, MOTION, TYPE, alpha } from "../brand";
import { FONT } from "../fonts";

/**
 * The numbered spine of the walkthrough: which step of the method we are on.
 * A step is "done" once the next one has started.
 *
 * The filled track springs from node to node rather than jumping, the active
 * node swells and keeps a pulsing halo while it is current, and the nodes still
 * to come drift gently — so this strip is moving on every frame, not only on
 * the three frames a step changes.
 */
export const StepProgress: React.FC<{
  steps: { label: string; atFrame: number }[];
  accent: string;
}> = ({ steps, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activeIndex = steps.reduce((acc, s, i) => (frame >= s.atFrame ? i : acc), -1);

  // The track eases to the active node over 20 frames instead of snapping.
  const previousReach = activeIndex <= 0 ? 0 : (activeIndex - 1) / (steps.length - 1);
  const reach = activeIndex < 0 ? 0 : activeIndex / (steps.length - 1);
  const advance =
    activeIndex < 0
      ? 0
      : spring({
          frame: frame - steps[activeIndex].atFrame,
          fps,
          config: MOTION.settle,
          durationInFrames: MOTION.keyRevealFrames,
        });
  const fill = interpolate(advance, [0, 1], [previousReach, reach]) * 100;

  return (
    <div style={{ position: "relative", paddingTop: 8 }}>
      <div
        style={{
          position: "absolute",
          top: 34,
          left: `${50 / steps.length}%`,
          right: `${50 / steps.length}%`,
          height: 5,
          backgroundColor: COLOR.lavender,
          borderRadius: 3,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 34,
          left: `${50 / steps.length}%`,
          width: `${(100 - 100 / steps.length) * (fill / 100)}%`,
          height: 5,
          backgroundColor: accent,
          borderRadius: 2,
        }}
      />

      <div style={{ display: "flex", position: "relative" }}>
        {steps.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          const pop = spring({
            frame: frame - step.atFrame,
            fps,
            config: MOTION.bounce,
            durationInFrames: MOTION.keyRevealFrames,
          });
          // The halo rings out once as the step turns over, then holds.
          const pulse = active
            ? interpolate(frame - step.atFrame, [0, MOTION.keyRevealFrames], [2.2, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 1;
          const scale = active ? interpolate(pop, [0, 1], [0.78, 1.1]) : done ? 1 : 0.96;

          return (
            <div
              key={step.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${scale.toFixed(4)})`,
                  backgroundColor: done || active ? accent : COLOR.white,
                  border: `4px solid ${done || active ? accent : alpha(COLOR.body, 0.45)}`,
                  boxShadow: active
                    ? `0 0 0 ${(8 * pulse).toFixed(1)}px ${alpha(accent, 0.16)}`
                    : "none",
                  fontFamily: FONT.sans,
                  fontSize: 26,
                  fontWeight: 700,
                  color: done || active ? COLOR.white : COLOR.body,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  fontFamily: FONT.sans,
                  fontSize: TYPE.small.size,
                  fontWeight: active ? 700 : 500,
                  color: active ? COLOR.ink : COLOR.body,
                  textAlign: "center",
                }}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
