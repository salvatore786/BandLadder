import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, MOTION, SHADOW, TYPE, VIVID, alpha } from "../brand";
import { FONT } from "../fonts";
import { idle } from "../motion";
import { Card, Eyebrow } from "./Page";
import { MotionTrail } from "./MotionTrail";
import type { FoundTag } from "../schemas";

/**
 * The evidence panel. Each tag is on screen from the start so the viewer can
 * see how many boxes are still to fill; the value arrives when it is found.
 *
 * A value slides the full travel distance in from the right with a motion-blur
 * tail and overshoots before settling — the first cut moved it 14px, which was
 * not enough to read as an arrival at all.
 */

const TAG_COLOR: Record<FoundTag["tag"], string> = {
  UP: VIVID.green,
  DOWN: VIVID.red,
  LARGEST: VIVID.amber,
  SMALLEST: VIVID.blue,
};

export const FoundSoFar: React.FC<{
  tags: FoundTag[];
  accent: string;
  style?: React.CSSProperties;
}> = ({ tags, accent, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Card accent={accent} style={{ padding: "26px 30px 28px", ...style }}>
      <Eyebrow color={COLOR.muted} size={TYPE.small.size}>
        Found so far
      </Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
        {tags.map((t, row) => {
          const color = TAG_COLOR[t.tag];
          const shown = frame >= t.atFrame;

          // A still-empty row breathes, so the panel is never a frozen block.
          const waiting = idle(frame, 137 + row * 19, row * 1.3) * 1.8;

          const progressAt = (framesAgo: number) =>
            spring({
              frame: frame - t.atFrame - framesAgo,
              fps,
              config: MOTION.bounce,
              durationInFrames: MOTION.keyRevealFrames,
            });
          const enter = progressAt(0);
          const valueTransform = (framesAgo: number) => {
            const p = progressAt(framesAgo);
            return (
              `translateX(${interpolate(p, [0, 1], [MOTION.travel + 18, 0]).toFixed(2)}px) ` +
              `scale(${interpolate(p, [0, 1], [0.88, 1]).toFixed(4)})`
            );
          };
          const moving = shown && frame < t.atFrame + MOTION.keyRevealFrames + 4;

          return (
            <div key={t.tag} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  minWidth: 186,
                  textAlign: "center",
                  padding: "10px 20px",
                  borderRadius: 999,
                  border: `3px solid ${color}`,
                  backgroundColor: alpha(color, 0.16),
                  boxShadow: SHADOW.shape,
                  fontFamily: FONT.mono,
                  fontSize: TYPE.small.size,
                  fontWeight: 500,
                  letterSpacing: 3,
                  color,
                  transform: shown ? "none" : `translateX(${waiting.toFixed(2)}px)`,
                }}
              >
                {t.tag}
              </div>

              {shown && t.value ? (
                <MotionTrail
                  transform={valueTransform}
                  active={moving}
                  layers={MOTION.trail.layers}
                  lagInFrames={MOTION.trail.lagInFrames}
                  opacity={MOTION.trail.opacity}
                >
                  <div
                    style={{
                      padding: "10px 22px",
                      borderRadius: 12,
                      border: `3px solid ${color}`,
                      backgroundColor: alpha(color, 0.1),
                      fontFamily: FONT.sans,
                      fontSize: TYPE.label.size,
                      fontWeight: 700,
                      color,
                      opacity: interpolate(enter, [0, 0.35], [0, 1], { extrapolateRight: "clamp" }),
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.value}
                  </div>
                </MotionTrail>
              ) : (
                <div
                  style={{
                    width: 132,
                    height: 50,
                    borderRadius: 12,
                    border: `3px dashed ${COLOR.lavender}`,
                    backgroundColor: alpha(COLOR.ink, 0.03),
                    transform: `translateX(${(-waiting).toFixed(2)}px)`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
