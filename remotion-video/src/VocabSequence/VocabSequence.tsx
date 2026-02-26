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
import { loadFont } from "@remotion/google-fonts/NotoSerif";

const { fontFamily: serifFont } = loadFont();

/* ── Props ───────────────────────────────────────────────────── */

export interface VocabPair {
  basic: string;
  advanced: string;
  basicMeaning?: string;
  advancedMeaning?: string;
  exampleSentence?: string;
}

export interface VocabSequenceProps {
  headerText: string;
  wordPairs: VocabPair[];
  durationSeconds: number;
  audioFileName: string;
  hookDuration?: number;
  hookText?: string;
  ctaDuration?: number;
  ctaLine1?: string;
  ctaLine2?: string;
  characterImage?: string; // optional image filename in public/
}

/* ── Shared card shell: black bg + centered cream card ─────── */

const CARD_BG = "#faf9f6";
const PINK = "#e8176d";
const PINK_DARK = "#9e1048";

const CardShell: React.FC<{
  children: React.ReactNode;
  opacity?: number;
}> = ({ children, opacity = 1 }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", inset: 0, background: "#000" }} />
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 380,
        bottom: 540,
        background: CARD_BG,
        borderRadius: 32,
        opacity,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);

/* ── Animated Character ──────────────────────────────────────
   A cute mascot that sits below the card.
   - Gently bobs up and down
   - When advanced word appears: does a happy jump + sparkle eyes
   - Uses emoji by default, or a custom image from public/
   ──────────────────────────────────────────────────────────── */

const AnimatedCharacter: React.FC<{
  reactionFrame?: number; // frame when advanced word appears (triggers reaction)
  characterImage?: string;
}> = ({ reactionFrame = 999999, characterImage }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Gentle idle bob
  const bobY = Math.sin(frame * 0.08) * 6;

  // Reaction: jump up when advanced word lands
  const reactionElapsed = frame - reactionFrame;
  let jumpY = 0;
  let reactionScale = 1;

  if (reactionElapsed >= 0 && reactionElapsed < fps * 1.2) {
    // Quick jump: up 30px then settle
    jumpY = interpolate(
      reactionElapsed,
      [0, 6, 14, 24],
      [0, -35, 5, 0],
      { extrapolateRight: "clamp" }
    );
    // Scale punch
    reactionScale = interpolate(
      reactionElapsed,
      [0, 6, 14, 24],
      [1, 1.2, 0.95, 1],
      { extrapolateRight: "clamp" }
    );
  }

  // Sparkles around character on reaction
  const showSparkles = reactionElapsed >= 0 && reactionElapsed < 30;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 100,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          transform: `translateY(${bobY + jumpY}px) scale(${reactionScale})`,
        }}
      >
        {/* Character */}
        {characterImage ? (
          <Img
            src={staticFile(characterImage)}
            style={{ width: 180, height: 180, objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FFD93D 0%, #FF9A3C 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(255, 154, 60, 0.4)",
              border: "4px solid rgba(255,255,255,0.3)",
              position: "relative",
            }}
          >
            {/* Face */}
            <div style={{ position: "relative", width: 120, height: 100 }}>
              {/* Eyes */}
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: 18,
                  width: 20,
                  height: reactionElapsed >= 0 && reactionElapsed < 30 ? 6 : 22,
                  borderRadius: reactionElapsed >= 0 && reactionElapsed < 30 ? "50%" : "50%",
                  background: "#2a2a2a",
                  transition: "height 0.1s",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  right: 18,
                  width: 20,
                  height: reactionElapsed >= 0 && reactionElapsed < 30 ? 6 : 22,
                  borderRadius: "50%",
                  background: "#2a2a2a",
                }}
              />
              {/* Eye shine */}
              <div
                style={{
                  position: "absolute",
                  top: 22,
                  left: 24,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#fff",
                  opacity: reactionElapsed >= 0 && reactionElapsed < 30 ? 0 : 0.7,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 22,
                  right: 24,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#fff",
                  opacity: reactionElapsed >= 0 && reactionElapsed < 30 ? 0 : 0.7,
                }}
              />
              {/* Mouth — smile or open on reaction */}
              {reactionElapsed >= 0 && reactionElapsed < 30 ? (
                <div
                  style={{
                    position: "absolute",
                    bottom: 16,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 30,
                    height: 20,
                    borderRadius: "0 0 20px 20px",
                    background: "#c0392b",
                    border: "2px solid #2a2a2a",
                  }}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    bottom: 20,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 36,
                    height: 18,
                    borderRadius: "0 0 20px 20px",
                    borderBottom: "3px solid #2a2a2a",
                    borderLeft: "3px solid #2a2a2a",
                    borderRight: "3px solid #2a2a2a",
                  }}
                />
              )}
              {/* Blush cheeks */}
              <div
                style={{
                  position: "absolute",
                  bottom: 26,
                  left: 4,
                  width: 22,
                  height: 12,
                  borderRadius: "50%",
                  background: "rgba(255, 100, 100, 0.3)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 26,
                  right: 4,
                  width: 22,
                  height: 12,
                  borderRadius: "50%",
                  background: "rgba(255, 100, 100, 0.3)",
                }}
              />
            </div>
          </div>
        )}

        {/* Sparkles on reaction */}
        {showSparkles &&
          [0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i * 60 + 15) * (Math.PI / 180);
            const dist =
              interpolate(reactionElapsed, [0, 20], [0, 60 + i * 10], {
                extrapolateRight: "clamp",
              });
            const sparkleOpacity = interpolate(
              reactionElapsed,
              [0, 10, 25],
              [0, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 80 + Math.cos(angle) * dist - 6,
                  top: 80 + Math.sin(angle) * dist - 6,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: i % 2 === 0 ? "#FFD93D" : PINK,
                  opacity: sparkleOpacity,
                }}
              />
            );
          })}

        {/* Name tag */}
        <div
          style={{
            position: "absolute",
            bottom: -30,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "4px 16px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 12,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              fontFamily: serifFont,
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
              letterSpacing: 1,
            }}
          >
            @bandladder
          </span>
        </div>
      </div>
    </div>
  );
};

/* ── 1. HOOK SCREEN ──────────────────────────────────────────── */

const HookScreen: React.FC<{
  hookText: string;
  characterImage?: string;
}> = ({ hookText, characterImage }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const entrance = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 60, mass: 1 },
  });

  const pulse = interpolate(
    frame,
    [fps * 1.5, fps * 2, fps * 2.5, fps * 3],
    [1, 1.04, 1, 1.02],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <>
      <CardShell opacity={interpolate(entrance, [0, 1], [0, 1])}>
        <div
          style={{
            padding: "40px 60px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            transform: `scale(${interpolate(entrance, [0, 1], [0.9, 1]) * pulse})`,
          }}
        >
          <span style={{ fontSize: 72, marginBottom: 30 }}>{"📚"}</span>
          <p
            style={{
              fontFamily: serifFont,
              fontSize: 52,
              fontWeight: 700,
              fontStyle: "italic",
              color: PINK,
              WebkitTextStroke: `1.5px ${PINK_DARK}`,
              textAlign: "center",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {hookText}
          </p>
        </div>
      </CardShell>
      <AnimatedCharacter characterImage={characterImage} />
      <Audio src={staticFile("hook_intro_sound.mp3")} volume={0.85} />
    </>
  );
};

/* ── 2. SINGLE WORD PAIR CARD ────────────────────────────────── */

const WordPairScreen: React.FC<{
  pair: VocabPair;
  index: number;
  total: number;
  headerText: string;
  characterImage?: string;
}> = ({ pair, index, total, headerText, characterImage }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // ─── Fade envelope: in 0.5s, hold, out 0.5s ───
  const fadeInEnd = Math.floor(fps * 0.5);
  const fadeOutStart = durationInFrames - Math.floor(fps * 0.5);

  const cardOpacity = interpolate(
    frame,
    [0, fadeInEnd, fadeOutStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scaleEntrance = spring({
    fps,
    frame,
    config: { damping: 16, stiffness: 70, mass: 0.8 },
  });
  const cardScale = interpolate(scaleEntrance, [0, 1], [0.92, 1]);

  // Basic word appears immediately
  const basicIn = spring({
    fps,
    frame: frame - 8,
    config: { damping: 14, stiffness: 80, mass: 0.7 },
  });

  // Arrow appears after 1s
  const arrowFrame = Math.floor(fps * 1.0);
  const arrowIn = spring({
    fps,
    frame: frame - arrowFrame,
    config: { damping: 10, stiffness: 120, mass: 0.5 },
  });

  // Advanced word appears after 1.6s — this is also the character reaction frame
  const advFrame = Math.floor(fps * 1.6);
  const advIn = spring({
    fps,
    frame: frame - advFrame,
    config: { damping: 14, stiffness: 80, mass: 0.7 },
  });

  // Example sentence appears after 2.8s
  const exFrame = Math.floor(fps * 2.8);
  const exIn = spring({
    fps,
    frame: frame - exFrame,
    config: { damping: 18, stiffness: 60, mass: 0.8 },
  });

  // Arrow pulse glow
  const arrowElapsed = frame - arrowFrame;
  const glowPulse =
    arrowElapsed >= 0 && arrowElapsed < 25
      ? interpolate(arrowElapsed, [0, 12, 25], [0, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  return (
    <>
      <CardShell opacity={cardOpacity}>
        <div
          style={{
            padding: "36px 50px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            transform: `scale(${cardScale})`,
          }}
        >
          {/* Header */}
          <p
            style={{
              fontFamily: serifFont,
              fontSize: 42,
              fontWeight: 700,
              fontStyle: "italic",
              color: PINK,
              WebkitTextStroke: `1px ${PINK_DARK}`,
              textAlign: "center",
              margin: "0 0 10px 0",
              letterSpacing: 0.5,
            }}
          >
            {headerText}
          </p>

          {/* Counter badge */}
          <div
            style={{
              padding: "6px 28px",
              background: "rgba(0,0,0,0.06)",
              borderRadius: 50,
              marginBottom: 24,
            }}
          >
            <span
              style={{
                fontFamily: serifFont,
                fontSize: 22,
                fontWeight: 600,
                color: "#888",
                letterSpacing: 2,
              }}
            >
              {index + 1} / {total}
            </span>
          </div>

          {/* ── Basic word ── */}
          <div
            style={{
              opacity: interpolate(basicIn, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(basicIn, [0, 1], [30, 0])}px)`,
              marginBottom: 6,
            }}
          >
            <p
              style={{
                fontFamily: serifFont,
                fontSize: 60,
                fontWeight: 400,
                fontStyle: "italic",
                color: "#888",
                textAlign: "center",
                margin: 0,
                textDecoration: "line-through",
                textDecorationColor: "rgba(0,0,0,0.2)",
              }}
            >
              {pair.basic}
            </p>
            {pair.basicMeaning && (
              <p
                style={{
                  fontFamily: serifFont,
                  fontSize: 20,
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: "#aaa",
                  textAlign: "center",
                  margin: "2px 0 0 0",
                }}
              >
                {pair.basicMeaning}
              </p>
            )}
          </div>

          {/* ── Arrow ── */}
          <div
            style={{
              opacity: interpolate(arrowIn, [0, 1], [0, 1]),
              transform: `scale(${interpolate(arrowIn, [0, 1], [0.3, 1])})`,
              margin: "12px 0",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: PINK,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 24px rgba(232, 23, 109, ${0.3 + glowPulse * 0.5})`,
              }}
            >
              <span
                style={{
                  fontSize: 30,
                  color: "#fff",
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {"\u2193"}
              </span>
            </div>
          </div>

          {/* ── Advanced word ── */}
          <div
            style={{
              opacity: interpolate(advIn, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(advIn, [0, 1], [-30, 0])}px) scale(${interpolate(advIn, [0, 1], [0.85, 1])})`,
              marginBottom: 6,
            }}
          >
            <p
              style={{
                fontFamily: serifFont,
                fontSize: 68,
                fontWeight: 700,
                fontStyle: "italic",
                color: "#1a1a1a",
                textAlign: "center",
                margin: 0,
              }}
            >
              {pair.advanced}
            </p>
            {pair.advancedMeaning && (
              <p
                style={{
                  fontFamily: serifFont,
                  fontSize: 20,
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: "#666",
                  textAlign: "center",
                  margin: "4px 0 0 0",
                }}
              >
                {pair.advancedMeaning}
              </p>
            )}
          </div>

          {/* ── Example sentence ── */}
          {pair.exampleSentence && (
            <div
              style={{
                opacity: interpolate(exIn, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(exIn, [0, 1], [20, 0])}px)`,
                marginTop: 16,
                padding: "14px 24px",
                background: "rgba(232, 23, 109, 0.06)",
                borderRadius: 16,
                borderLeft: `4px solid ${PINK}`,
                maxWidth: "92%",
              }}
            >
              <p
                style={{
                  fontFamily: serifFont,
                  fontSize: 22,
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: "#555",
                  lineHeight: 1.5,
                  margin: 0,
                  textAlign: "left",
                }}
              >
                "{pair.exampleSentence}"
              </p>
            </div>
          )}
        </div>
      </CardShell>

      {/* Animated character reacts when advanced word appears */}
      <AnimatedCharacter
        reactionFrame={advFrame}
        characterImage={characterImage}
      />
    </>
  );
};

/* ── 3. CTA SCREEN ───────────────────────────────────────────── */

const CTAScreen: React.FC<{
  line1: string;
  line2: string;
  characterImage?: string;
}> = ({ line1, line2, characterImage }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const entrance = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 60, mass: 1 },
  });

  const arrowBounce = interpolate(
    frame % Math.floor(fps * 0.8),
    [0, Math.floor(fps * 0.4), Math.floor(fps * 0.8)],
    [0, -16, 0]
  );

  return (
    <>
      <CardShell opacity={interpolate(entrance, [0, 1], [0, 1])}>
        <div
          style={{
            padding: "40px 60px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            transform: `scale(${interpolate(entrance, [0, 1], [0.9, 1])})`,
          }}
        >
          <p
            style={{
              fontFamily: serifFont,
              fontSize: 50,
              fontWeight: 700,
              fontStyle: "italic",
              color: PINK,
              WebkitTextStroke: `1.5px ${PINK_DARK}`,
              textAlign: "center",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {line1}
          </p>
          <span
            style={{
              fontSize: 56,
              marginTop: 24,
              marginBottom: 24,
              transform: `translateY(${arrowBounce}px)`,
              opacity: 0.7,
            }}
          >
            {"👇"}
          </span>
          <p
            style={{
              fontFamily: serifFont,
              fontSize: 40,
              fontWeight: 400,
              fontStyle: "italic",
              color: "#2a2a2a",
              textAlign: "center",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {line2}
          </p>
        </div>
      </CardShell>
      <AnimatedCharacter characterImage={characterImage} />
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN COMPOSITION
   Hook (3s) → Pair 1 → Pair 2 → ... → Pair N → CTA (5s)
   Each pair shows one at a time, fades in/out
   50 seconds total, covering 5-6 words
   ───────────────────────────────────────────────────────────── */

export const VocabSequence: React.FC<VocabSequenceProps> = ({
  headerText,
  wordPairs,
  durationSeconds,
  audioFileName,
  hookDuration = 0,
  hookText = "Level up your vocabulary!",
  ctaDuration = 0,
  ctaLine1 = "For more practice,",
  ctaLine2 = "follow BandLadder",
  characterImage,
}) => {
  const { fps } = useVideoConfig();

  const hookFrames = Math.ceil(hookDuration * fps);
  const ctaFrames = Math.ceil(ctaDuration * fps);
  const totalFrames = Math.ceil(durationSeconds * fps);
  const mainFrames = totalFrames - hookFrames - ctaFrames;

  const pairCount = wordPairs.length;
  const framesPerPair = Math.floor(mainFrames / pairCount);

  return (
    <AbsoluteFill>
      {/* 1. Hook */}
      {hookDuration > 0 && (
        <Sequence from={0} durationInFrames={hookFrames}>
          <HookScreen hookText={hookText} characterImage={characterImage} />
        </Sequence>
      )}

      {/* 2. Word pairs — sequential, one at a time */}
      {wordPairs.map((pair, i) => {
        const pairStart = hookFrames + i * framesPerPair;
        return (
          <Sequence key={i} from={pairStart} durationInFrames={framesPerPair}>
            <WordPairScreen
              pair={pair}
              index={i}
              total={pairCount}
              headerText={headerText}
              characterImage={characterImage}
            />
          </Sequence>
        );
      })}

      {/* 3. CTA */}
      {ctaDuration > 0 && (
        <Sequence from={totalFrames - ctaFrames} durationInFrames={ctaFrames}>
          <CTAScreen
            line1={ctaLine1}
            line2={ctaLine2}
            characterImage={characterImage}
          />
        </Sequence>
      )}

      {/* Audio */}
      <Audio src={staticFile(audioFileName)} />
    </AbsoluteFill>
  );
};
