import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, MOTION, TYPE, alpha } from "../brand";
import { FONT } from "../fonts";

/**
 * The numbered spine of the walkthrough: which step of the method we are on.
 * A step is "done" once the next one has started.
 */
export const StepProgress: React.FC<{
  steps: { label: string; atFrame: number }[];
  accent: string;
}> = ({ steps, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activeIndex = steps.reduce(
    (acc, s, i) => (frame >= s.atFrame ? i : acc),
    -1
  );

  // The filled track runs to the centre of the active node.
  const reach = activeIndex < 0 ? 0 : (activeIndex / (steps.length - 1)) * 100;
  const fill = interpolate(reach, [0, 100], [0, 100]);

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
          width: `${(100 - (100 / steps.length)) * (fill / 100)}%`,
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
            config: MOTION.snap,
            durationInFrames: 16,
          });
          const scale = active ? 1 + pop * 0.12 : 1;

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
                  transform: `scale(${scale})`,
                  backgroundColor: done || active ? accent : COLOR.white,
                  border: `4px solid ${done || active ? accent : alpha(COLOR.body, 0.45)}`,
                  boxShadow: active ? `0 0 0 8px ${alpha(accent, 0.14)}` : "none",
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
