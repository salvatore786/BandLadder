import React from "react";
import {
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLOR, MODULE_ACCENT, MOTION, SHADOW, TYPE, alpha } from "../../brand";
import { FONT } from "../../fonts";
import { Card, Eyebrow, Page } from "../../components/Page";
import { Hook } from "../../components/Hook";
import { Captions } from "../../components/Captions";
import { MotionTrail } from "../../components/MotionTrail";
import { beat } from "../../motion";
import { SportsComplexMap, type ResolvedSlot } from "./SportsComplexMap";
import type { Bubble, MapAnswer, MapWalkthroughProps } from "../../schemas";

/** What is left for the plan once the header, answer list and captions are placed. */
const MAP_BOX_HEIGHT = 876;

/**
 * The listening reel measured at 24 motion events against the reference's 89,
 * with 98% of frames identical to the one before — long dead stretches between
 * four reveals. Three changes close that gap, and all of them are in here or in
 * the plan beneath:
 *
 *   1. karaoke captions, driven by the narration's own word timings, so the
 *      bottom of the frame changes roughly three times a second throughout
 *   2. a walker that moves up the corridor for the whole walkthrough, which
 *      means the plan is never a still image
 *   3. every reveal travels a real distance on a spring with overshoot, and
 *      holds its finished state before anything else moves
 */
export const MapWalkthrough: React.FC<MapWalkthroughProps> = ({
  module,
  eyebrow,
  headline,
  sectionLabels,
  practiceStartFrame,
  map,
  answers,
  bubbles,
  captions,
  audioSrc,
}) => {
  const frame = useCurrentFrame();
  const accent = MODULE_ACCENT[module];
  const inPractice = frame >= practiceStartFrame;

  // Practice rows never resolve on screen — that is the point of them.
  const resolved: Record<string, ResolvedSlot> = {};
  for (const a of answers) {
    if (!a.practice) {
      resolved[a.slot] = { name: a.name, color: a.color, revealFrame: a.revealFrame };
    }
  }

  return (
    <Page
      accent={accent}
      header={
        <>
          <Hook eyebrow={eyebrow} headline={headline} accent={accent} />
          <SectionLabel
            label={inPractice ? sectionLabels.practice : sectionLabels.walkthrough}
            accent={inPractice ? COLOR.coral : accent}
            switchedAt={practiceStartFrame}
          />
        </>
      }
    >
      {/* A fixed height rather than the plan's own aspect ratio: the captions
          and the answer list have first call on the page, and the SVG letterboxes
          itself into whatever is left instead of being clipped by the card. */}
      <Card accent={accent} style={{ padding: 18, flexShrink: 0 }}>
        <div style={{ position: "relative", width: "100%", height: MAP_BOX_HEIGHT }}>
          <SportsComplexMap
            fixtures={map.fixtures}
            resolved={resolved}
            walkUntilFrame={practiceStartFrame}
          />
          {bubbles.map((b) => (
            <TooltipBubble key={b.text} bubble={b} />
          ))}
        </div>
      </Card>

      <AnswerList answers={answers} accent={accent} style={{ marginTop: 18, flexShrink: 0 }} />

      <Captions words={captions} accent={accent} style={{ marginTop: "auto", paddingTop: 14 }} />

      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}
    </Page>
  );
};

/** WALKTHROUGH -> PRACTICE. The flip is a beat, so it gets a long spring. */
const SectionLabel: React.FC<{ label: string; accent: string; switchedAt: number }> = ({
  label,
  accent,
  switchedAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flip = spring({
    frame: frame - switchedAt,
    fps,
    config: MOTION.bounce,
    durationInFrames: MOTION.keyRevealFrames,
  });
  const flipped = frame >= switchedAt;
  const scale = flipped ? interpolate(flip, [0, 1], [0.84, 1]) : 1;

  return (
    <div
      style={{
        marginTop: 16,
        alignSelf: "flex-start",
        transformOrigin: "left center",
        transform: `scale(${scale.toFixed(4)})`,
        padding: "8px 20px",
        borderRadius: 999,
        backgroundColor: alpha(accent, 0.14),
        border: `2px solid ${alpha(accent, 0.4)}`,
      }}
    >
      <Eyebrow color={accent} size={TYPE.small.size}>
        {label}
      </Eyebrow>
    </div>
  );
};

const TooltipBubble: React.FC<{ bubble: Bubble }> = ({ bubble }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { exit, visible } = beat(
    frame,
    bubble.fromFrame,
    bubble.durationInFrames,
    MOTION.keyRevealFrames
  );
  if (!visible) return null;

  const progressAt = (framesAgo: number) =>
    spring({
      frame: frame - bubble.fromFrame - framesAgo,
      fps,
      config: MOTION.bounce,
      durationInFrames: MOTION.keyRevealFrames,
    });
  const enter = progressAt(0);
  // It rises the full travel distance, overshoots, then floats while it is up
  // and lifts away again on the exit.
  const transform = (framesAgo: number) => {
    const p = progressAt(framesAgo);
    const rise = interpolate(p, [0, 1], [MOTION.travel, 0]) - exit * 30;
    return (
      `translate(-50%, -50%) translateY(${rise.toFixed(2)}px) ` +
      `scale(${(interpolate(p, [0, 1], [0.78, 1]) * (1 - exit * 0.12)).toFixed(4)})`
    );
  };
  const moving = frame < bubble.fromFrame + MOTION.keyRevealFrames + 4;

  return (
    <div
      style={{
        position: "absolute",
        left: `${bubble.x * 100}%`,
        top: `${bubble.y * 100}%`,
        opacity:
          interpolate(enter, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }) * (1 - exit),
      }}
    >
      <MotionTrail
        transform={transform}
        active={moving}
        layers={MOTION.trail.layers}
        lagInFrames={MOTION.trail.lagInFrames}
        opacity={MOTION.trail.opacity}
      >
        <div
          style={{
            backgroundColor: COLOR.ink,
            color: COLOR.white,
            padding: "14px 22px",
            borderRadius: 14,
            boxShadow: SHADOW.bubble,
            fontFamily: FONT.sans,
            fontSize: TYPE.label.size,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {bubble.text}
        </div>
      </MotionTrail>
    </div>
  );
};

/**
 * Two columns: what has been answered, and what the viewer is left to do.
 * Practice rows keep a dashed slot so the ask is visible from the first frame.
 */
const AnswerList: React.FC<{
  answers: MapAnswer[];
  accent: string;
  style?: React.CSSProperties;
}> = ({ answers, accent, style }) => {
  const walk = answers.filter((a) => !a.practice);
  const practice = answers.filter((a) => a.practice);

  return (
    <Card accent={accent} style={{ padding: "22px 30px 24px", ...style }}>
      <div style={{ display: "flex", gap: 30 }}>
        <Column title="Walkthrough" rows={walk} color={COLOR.muted} />
        {practice.length > 0 ? (
          <Column title="Practice" rows={practice} color={COLOR.coral} />
        ) : null}
      </div>
    </Card>
  );
};

const Column: React.FC<{ title: string; rows: MapAnswer[]; color: string }> = ({
  title,
  rows,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
      <Eyebrow color={color} size={TYPE.small.size}>
        {title}
      </Eyebrow>
      {rows.map((row, i) => {
        const answered = !row.practice && frame >= row.revealFrame;
        const chipAt = (framesAgo: number) =>
          spring({
            frame: frame - row.revealFrame - framesAgo,
            fps,
            config: MOTION.bounce,
            durationInFrames: MOTION.keyRevealFrames,
          });
        const enter = chipAt(0);
        // The chip arrives from the right and overshoots its slot; the name
        // beside it slides a shorter distance on the same spring.
        const chipTransform = (framesAgo: number) => {
          const p = chipAt(framesAgo);
          return (
            `translateX(${interpolate(p, [0, 1], [MOTION.travel, 0]).toFixed(2)}px) ` +
            `scale(${interpolate(p, [0, 1], [0.6, 1]).toFixed(4)})`
          );
        };
        const moving = answered && frame < row.revealFrame + MOTION.keyRevealFrames + 4;

        return (
          <div key={row.n} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                fontFamily: FONT.sans,
                fontSize: TYPE.label.size,
                fontWeight: 700,
                color: row.color,
                minWidth: 26,
              }}
            >
              {row.n}
            </span>
            <span
              style={{
                flex: 1,
                fontFamily: FONT.sans,
                fontSize: TYPE.label.size,
                fontWeight: 600,
                color: answered ? row.color : COLOR.ink,
                transform: answered
                  ? `translateX(${interpolate(enter, [0, 1], [-22, 0]).toFixed(2)}px)`
                  : "none",
              }}
            >
              {row.name}
            </span>
            {answered ? (
              <MotionTrail
                transform={chipTransform}
                active={moving}
                layers={MOTION.trail.layers}
                lagInFrames={MOTION.trail.lagInFrames}
                opacity={MOTION.trail.opacity}
              >
                <span
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    backgroundColor: row.color,
                    boxShadow: SHADOW.shape,
                    color: COLOR.white,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT.sans,
                    fontSize: 28,
                    fontWeight: 700,
                    opacity: interpolate(enter, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
                  }}
                >
                  {row.slot}
                </span>
              </MotionTrail>
            ) : (
              <span
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  border: `3px dashed ${row.practice ? COLOR.coral : COLOR.lavender}`,
                  backgroundColor: row.practice ? alpha(COLOR.coral, 0.12) : alpha(COLOR.ink, 0.03),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT.sans,
                  fontSize: 28,
                  fontWeight: 700,
                  color: COLOR.coral,
                }}
              >
                ?
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
