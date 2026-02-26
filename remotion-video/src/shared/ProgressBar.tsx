import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

interface ProgressBarProps {
  durationSeconds: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ durationSeconds }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: "clamp",
  });

  const elapsedSeconds = frame / fps;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = Math.floor(elapsedSeconds % 60);
  const timeStr = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 160,
        left: 60,
        right: 60,
        zIndex: 2,
      }}
    >
      {/* Progress track */}
      <div
        style={{
          width: "100%",
          height: 8,
          background: "rgba(20, 25, 45, 0.1)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {/* Progress fill */}
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryLight}, ${COLORS.accent})`,
            borderRadius: 4,
          }}
        />
      </div>

      {/* Labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          fontSize: 18,
          color: COLORS.textMuted,
          fontWeight: 500,
          fontFamily,
        }}
      >
        <span>Listening...</span>
        <span>{timeStr}</span>
      </div>
    </div>
  );
};
