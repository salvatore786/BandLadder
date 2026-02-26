import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const NOTE_SYMBOLS = ["\u266A", "\u266B", "\u266C"]; // ♪ ♫ ♬

interface MusicNote {
  symbol: string;
  startX: number;
  startY: number;
  fontSize: number;
  speed: number;
  wobblePhase: number;
  wobbleAmplitude: number;
  delay: number;
  color: string;
  baseOpacity: number;
  cycleLength: number;
  rotationSpeed: number;
}

const NOTE_COUNT = 8;

export const MusicNotes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const notes = useMemo<MusicNote[]>(() => {
    const colors = ["rgba(20,25,45,0.08)", `rgba(233,69,96,0.10)`, `rgba(255,211,105,0.10)`];
    return Array.from({ length: NOTE_COUNT }, (_, i) => ({
      symbol: NOTE_SYMBOLS[i % NOTE_SYMBOLS.length],
      startX: 60 + seededRandom(200 + i * 5) * 960,
      startY: 1400 + seededRandom(201 + i * 5) * 400,
      fontSize: 28 + seededRandom(202 + i * 5) * 16,
      speed: 0.8 + seededRandom(203 + i * 5) * 0.7,
      wobblePhase: seededRandom(204 + i * 5) * Math.PI * 2,
      wobbleAmplitude: 20 + seededRandom(205 + i * 5) * 15,
      delay: Math.floor(seededRandom(206 + i * 5) * durationInFrames * 0.3),
      color: colors[i % colors.length],
      baseOpacity: 1,
      cycleLength: Math.floor(180 + seededRandom(207 + i * 5) * 120), // 6-10 seconds
      rotationSpeed: 0.03 + seededRandom(208 + i * 5) * 0.04,
    }));
  }, [durationInFrames]);

  // Layer fade in/out
  const layerOpacity = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ zIndex: 1, pointerEvents: "none", opacity: layerOpacity }}>
      {notes.map((note, i) => {
        const adjustedFrame = Math.max(0, frame - note.delay);
        const cycleFrame = adjustedFrame % note.cycleLength;
        const travel = cycleFrame * note.speed;

        // Lifecycle opacity: fade in → visible → fade out
        const lifecycle = interpolate(
          cycleFrame,
          [0, 15, note.cycleLength - 40, note.cycleLength],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        // Don't render before delay
        if (frame < note.delay) return null;

        const x = note.startX + Math.sin(cycleFrame * 0.04 + note.wobblePhase) * note.wobbleAmplitude;
        const y = note.startY - travel;
        const rotation = Math.sin(cycleFrame * note.rotationSpeed) * 15;
        const scale = interpolate(cycleFrame, [0, 20], [0.5, 1.0], { extrapolateRight: "clamp" });

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              fontSize: note.fontSize,
              color: note.color,
              opacity: lifecycle,
              transform: `rotate(${rotation}deg) scale(${scale})`,
              userSelect: "none",
            }}
          >
            {note.symbol}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
