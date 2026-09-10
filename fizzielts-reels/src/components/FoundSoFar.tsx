import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLOR, SHADOW, TYPE, VIVID, alpha } from "../brand";
import { FONT } from "../fonts";
import { Card, Eyebrow } from "./Page";
import type { FoundTag } from "../schemas";

/**
 * The evidence panel. Each tag is on screen from the start so the viewer can
 * see how many boxes are still to fill; the value arrives when it is found.
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

  return (
    <Card accent={accent} style={{ padding: "26px 30px 28px", ...style }}>
      <Eyebrow color={COLOR.muted} size={TYPE.small.size}>
        Found so far
      </Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
        {tags.map((t) => {
          const color = TAG_COLOR[t.tag];
          const shown = frame >= t.atFrame;
          const enter = interpolate(frame - t.atFrame, [0, 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

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
                }}
              >
                {t.tag}
              </div>

              {shown && t.value ? (
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
                    opacity: enter,
                    transform: `translateX(${interpolate(enter, [0, 1], [-14, 0])}px)`,
                  }}
                >
                  {t.value}
                </div>
              ) : (
                <div
                  style={{
                    width: 132,
                    height: 50,
                    borderRadius: 12,
                    border: `3px dashed ${COLOR.lavender}`,
                    backgroundColor: alpha(COLOR.ink, 0.03),
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

