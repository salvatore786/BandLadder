import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useVideoConfig,
  useCurrentFrame,
  spring,
  interpolate,
  Img,
} from "remotion";
import { MCQSingleProps } from "../types";
import { loadFont } from "@remotion/google-fonts/Bangers";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";

const { fontFamily: comicFont } = loadFont();
const { fontFamily: sansFont } = loadPoppins();

/* ═══════════════════════════════════════════════════════════════
   Design tokens (matching ListeningQuiz)
   ═══════════════════════════════════════════════════════════════ */

const BG = "#7EC8E3";
const NAVY = "#1B2A4A";
const GREEN = "#4ADE80";
const WHITE = "#FFFFFF";
const TEXT_DARK = "#1A1A1A";

const OPTION_LABELS = ["A", "B", "C", "D", "E"];

/* ═══════════════════════════════════════════════════════════════
   Mascot – inline SVG with sound-wave animation
   ═══════════════════════════════════════════════════════════════ */

const MascotSVG: React.FC<{ width?: number }> = ({ width = 340 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bodyBob = Math.sin((frame / fps) * Math.PI * 2 * 1.2 + 0.5) * 2;

  const waveCycle = (frame / fps) * 2.5;
  const waveOpacity = (i: number) => {
    const phase = (waveCycle - i * 0.35) % 1.5;
    if (phase < 0 || phase > 1) return 0;
    return interpolate(phase, [0, 0.3, 0.7, 1], [0, 0.7, 0.5, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };
  const waveScale = (i: number) => {
    const phase = (waveCycle - i * 0.35) % 1.5;
    if (phase < 0 || phase > 1) return 0.5;
    return interpolate(phase, [0, 1], [0.6, 1.2], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 280 250"
      width={width}
      height={width * (250 / 280)}
      style={{ display: "block" }}
    >
      {[0, 1, 2].map((i) => (
        <path
          key={`wl${i}`}
          d={`M ${38 - i * 12} ${65} Q ${30 - i * 14} ${87}, ${38 - i * 12} ${110}`}
          fill="none" stroke="#3A5A78" strokeWidth={3} strokeLinecap="round"
          opacity={waveOpacity(i)}
          transform={`scale(${waveScale(i)})`}
          style={{ transformOrigin: "52px 87px" }}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <path
          key={`wr${i}`}
          d={`M ${222 + i * 12} ${65} Q ${230 + i * 14} ${87}, ${222 + i * 12} ${110}`}
          fill="none" stroke="#3A5A78" strokeWidth={3} strokeLinecap="round"
          opacity={waveOpacity(i)}
          transform={`scale(${waveScale(i)})`}
          style={{ transformOrigin: "208px 87px" }}
        />
      ))}
      <path d="M 80 175 C 55 185, 35 205, 50 235" fill="none" stroke="#000" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="50" cy="238" rx="10" ry="8" fill="#FFED73" stroke="#000" strokeWidth="4" />
      <path d="M 200 170 C 225 180, 245 200, 230 235" fill="none" stroke="#000" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="230" cy="238" rx="10" ry="8" fill="#FFED73" stroke="#000" strokeWidth="4" />
      <g transform={`translate(0, ${bodyBob})`}>
        <path d="M 80 245 C 80 185, 95 165, 140 165 C 185 165, 200 185, 200 245" fill="#FFED73" stroke="#000" strokeWidth="6" strokeLinecap="round" />
      </g>
      <circle cx="140" cy="95" r="55" fill="#FFED73" stroke="#000" strokeWidth="6" />
      <path d="M 80 95 C 80 30, 200 30, 200 95" fill="none" stroke="#3A5A78" strokeWidth="14" strokeLinecap="round" />
      <rect x="66" y="72" width="20" height="48" rx="10" fill="#587A98" stroke="#000" strokeWidth="4" />
      <rect x="194" y="72" width="20" height="48" rx="10" fill="#587A98" stroke="#000" strokeWidth="4" />
      <rect x="100" y="78" width="36" height="24" rx="5" fill="none" stroke="#000" strokeWidth="4" />
      <rect x="146" y="78" width="36" height="24" rx="5" fill="none" stroke="#000" strokeWidth="4" />
      <line x1="136" y1="90" x2="146" y2="90" stroke="#000" strokeWidth="4" />
      <line x1="86" y1="90" x2="100" y2="90" stroke="#000" strokeWidth="4" />
      <line x1="182" y1="90" x2="194" y2="90" stroke="#000" strokeWidth="4" />
      <circle cx="118" cy="90" r="4" fill="#000" />
      <circle cx="164" cy="90" r="4" fill="#000" />
      <path d="M 123 112 Q 140 126 157 112" fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════
   HOOK SCREEN
   ═══════════════════════════════════════════════════════════════ */

const HookScreen: React.FC<{
  hookText: string;
  examType: string;
}> = ({ hookText, examType }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const titleEntrance = spring({ fps, frame, config: { damping: 14, stiffness: 80, mass: 1 } });
  const mascotEntrance = spring({ fps, frame: Math.max(0, frame - 5), config: { damping: 16, stiffness: 60, mass: 1 } });
  const badgeEntrance = spring({ fps, frame: Math.max(0, frame - 12), config: { damping: 12, stiffness: 100, mass: 1 } });

  const pulse = interpolate(frame, [fps * 1.5, fps * 2, fps * 2.5, fps * 3], [1, 1.03, 1, 1.02], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const titleText = examType === "PTE" ? "PTE" : "IELTS";

  return (
    <>
      <AbsoluteFill style={{ background: BG }}>
        <div style={{
          position: "absolute", left: 50, top: 80,
          transform: `rotate(-6deg) scale(${interpolate(titleEntrance, [0, 1], [0.3, 1]) * pulse})`,
          transformOrigin: "left top",
          opacity: interpolate(titleEntrance, [0, 1], [0, 1]),
        }}>
          <div style={{
            fontFamily: comicFont, fontSize: 140, color: WHITE,
            textShadow: "5px 5px 0px #2D2D2D, -3px -3px 0px #2D2D2D, 3px -3px 0px #2D2D2D, -3px 3px 0px #2D2D2D, 0px 4px 0px #2D2D2D",
            lineHeight: 1.0, letterSpacing: 3,
          }}>
            {titleText}
            <br />
            Quiz!
          </div>
        </div>

        <div style={{
          position: "absolute", left: 480, top: 310,
          transform: `scale(${interpolate(badgeEntrance, [0, 1], [0, 1])})`,
          opacity: interpolate(badgeEntrance, [0, 1], [0, 1]),
        }}>
          <div style={{
            width: 120, height: 120, borderRadius: "50%", background: NAVY,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: comicFont, fontSize: 48, color: WHITE, letterSpacing: 1 }}>
              {examType || "IELTS"}
            </span>
          </div>
        </div>

        <div style={{
          position: "absolute", right: -30, top: 10,
          transform: `translateX(${interpolate(mascotEntrance, [0, 1], [500, 0])}px)`,
          opacity: interpolate(mascotEntrance, [0, 1], [0, 1]),
        }}>
          <MascotSVG width={540} />
        </div>

        <div style={{
          position: "absolute", left: 60, right: 60, top: 820,
          opacity: interpolate(titleEntrance, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleEntrance, [0, 1], [40, 0])}px)`,
        }}>
          <p style={{
            fontFamily: sansFont, fontSize: 64, fontWeight: 700,
            color: NAVY, textAlign: "center", lineHeight: 1.4, margin: 0,
          }}>
            {hookText}
          </p>
        </div>
      </AbsoluteFill>
      <Audio src={staticFile("hook_intro_sound.mp3")} volume={0.85} />
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN QUIZ CONTENT
   ═══════════════════════════════════════════════════════════════ */

const QuizContent: React.FC<{
  question: string;
  options: string[];
  correctIndex: number;
  audioDurationSeconds: number;
  audioFileName: string;
  examType: string;
}> = ({ question, options, correctIndex, audioDurationSeconds, audioFileName, examType }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const questionBarStart = Math.ceil(0.5 * fps);
  const optionsStart = Math.ceil((audioDurationSeconds + 1.5) * fps);
  const OPTION_STAGGER = Math.ceil(0.35 * fps);
  const thinkingDuration = Math.ceil(3 * fps);
  const lastOptionFrame = optionsStart + (options.length - 1) * OPTION_STAGGER;
  const revealFrame = lastOptionFrame + thinkingDuration;
  const isRevealed = frame >= revealFrame;
  const revealElapsed = isRevealed ? frame - revealFrame : 0;

  const titleOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  const barProgress = spring({
    fps, frame: Math.max(0, frame - questionBarStart),
    config: { damping: 20, stiffness: 55, mass: 1.2 },
  });
  const barTranslateX = interpolate(barProgress, [0, 1], [-1100, 0]);

  const audioPulse = frame < optionsStart
    ? interpolate(Math.sin((frame / fps) * Math.PI * 2), [-1, 1], [0.97, 1.03])
    : 1;

  const titleText = examType === "PTE" ? "PTE" : "IELTS";

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* Title */}
      <div style={{
        position: "absolute", left: 50, top: 60,
        transform: "rotate(-6deg)", transformOrigin: "left top", opacity: titleOpacity,
      }}>
        <div style={{
          fontFamily: comicFont, fontSize: 130, color: WHITE,
          textShadow: "5px 5px 0px #2D2D2D, -3px -3px 0px #2D2D2D, 3px -3px 0px #2D2D2D, -3px 3px 0px #2D2D2D, 0px 4px 0px #2D2D2D",
          lineHeight: 1.0, letterSpacing: 3,
        }}>
          {titleText}
          <br />
          Quiz!
        </div>
      </div>

      {/* Badge */}
      <div style={{ position: "absolute", left: 460, top: 290, opacity: titleOpacity }}>
        <div style={{
          width: 110, height: 110, borderRadius: "50%", background: NAVY,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontFamily: comicFont, fontSize: 44, color: WHITE, letterSpacing: 1 }}>
            {examType || "IELTS"}
          </span>
        </div>
      </div>

      {/* Mascot */}
      <div style={{
        position: "absolute", right: -30, top: 0,
        transform: `scale(${audioPulse})`, transformOrigin: "center top", opacity: titleOpacity,
      }}>
        <MascotSVG width={520} />
      </div>

      {/* Question bar */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 540, height: 160, overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
          background: NAVY, borderRadius: "0 20px 20px 0",
          transform: `translateX(${barTranslateX}px)`,
          display: "flex", alignItems: "center", padding: "0 60px",
        }}>
          <p style={{
            fontFamily: sansFont, fontSize: 46, fontWeight: 700,
            color: WHITE, margin: 0, lineHeight: 1.35,
          }}>
            {question}
          </p>
        </div>
      </div>

      {/* Options */}
      <div style={{
        position: "absolute", left: 50, right: 50, top: 760,
        display: "flex", flexDirection: "column", gap: 28,
      }}>
        {options.map((opt, i) => {
          const optEntrance = spring({
            fps, frame: Math.max(0, frame - (optionsStart + i * OPTION_STAGGER)),
            config: { damping: 16, stiffness: 70, mass: 1 },
          });
          const translateY = interpolate(optEntrance, [0, 1], [200, 0]);
          const opacity = interpolate(optEntrance, [0, 1], [0, 1]);

          let bgColor = WHITE;
          let borderColor = "#B0B8C4";
          let textColor = TEXT_DARK;
          let boxShadow = "0 3px 10px rgba(0,0,0,0.08)";

          if (isRevealed) {
            const t = interpolate(revealElapsed, [0, 20], [0, 1], { extrapolateRight: "clamp" });
            if (i === correctIndex) {
              const r = Math.round(255 - t * (255 - 74));
              const g = Math.round(255 - t * (255 - 222));
              const b = Math.round(255 - t * (255 - 128));
              bgColor = `rgb(${r}, ${g}, ${b})`;
              borderColor = `rgb(${Math.round(176 - t * (176 - 34))}, ${Math.round(184 - t * (184 - 197))}, ${Math.round(196 - t * (196 - 94))})`;
              boxShadow = `0 6px 20px rgba(74, 222, 128, ${t * 0.5})`;
            } else {
              bgColor = `rgb(${Math.round(255 - t * 30)}, ${Math.round(255 - t * 28)}, ${Math.round(255 - t * 25)})`;
              textColor = `rgba(26, 26, 26, ${1 - t * 0.5})`;
              borderColor = `rgba(176, 184, 196, ${1 - t * 0.4})`;
              boxShadow = "none";
            }
          }

          // Add label if option doesn't already have one
          const hasLabel = /^[A-E][.)]\s/.test(opt);
          const displayText = hasLabel ? opt : `${OPTION_LABELS[i]}) ${opt}`;

          return (
            <div key={i} style={{ transform: `translateY(${translateY}px)`, opacity }}>
              <div style={{
                background: bgColor, border: `3px solid ${borderColor}`,
                borderRadius: 22, padding: "38px 48px", boxShadow,
              }}>
                <p style={{
                  fontFamily: sansFont, fontSize: 46, fontWeight: 700,
                  color: textColor, margin: 0, lineHeight: 1.25,
                }}>
                  {displayText}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Watermark */}
      <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, textAlign: "center" }}>
        <span style={{
          fontFamily: sansFont, fontSize: 34, fontWeight: 600,
          color: "rgba(27, 42, 74, 0.35)", letterSpacing: 2,
        }}>
          BandLadder
        </span>
      </div>

      <Audio src={staticFile(audioFileName)} />
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPOSITION
   ═══════════════════════════════════════════════════════════════ */

export const MCQSingle: React.FC<MCQSingleProps> = ({
  question,
  options,
  correctIndex,
  durationSeconds,
  audioDurationSeconds,
  audioFileName,
  examType = "IELTS",
  hookIntroDuration = 0,
}) => {
  const { fps } = useVideoConfig();

  const hookFrames = Math.ceil((hookIntroDuration || 0) * fps);
  const mainFrames = Math.ceil(durationSeconds * fps) - hookFrames;

  const hookText = examType === "PTE"
    ? "Can you crack this?"
    : "Can you get this right?";

  return (
    <AbsoluteFill>
      {hookIntroDuration > 0 && (
        <Sequence from={0} durationInFrames={hookFrames}>
          <HookScreen hookText={hookText} examType={examType} />
        </Sequence>
      )}

      <Sequence from={hookFrames} durationInFrames={mainFrames}>
        <QuizContent
          question={question}
          options={options}
          correctIndex={correctIndex}
          audioDurationSeconds={audioDurationSeconds}
          audioFileName={audioFileName}
          examType={examType}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
