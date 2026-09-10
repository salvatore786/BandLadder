import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";
import {
  buildCaptionPages,
  pageAtFrame,
  sanitizeWords,
  type CaptionPage,
} from "../utils/captions";

/**
 * Karaoke-style burned-in captions driven by WhisperX word timings.
 *
 * Reads `words` straight off the composition props via useVideoConfig() so it
 * can be dropped into any composition without threading a new prop through it.
 * When no word timings are present (transcription unavailable, or captions
 * switched off in props) it renders nothing and the reel looks as it did before.
 *
 * Word timings are relative to the start of the audio file, so render this as a
 * SIBLING of the <Audio> tag: whatever Sequence the audio lives in, frame 0 of
 * that context is the audio start and no offset is needed.
 *
 * Sits at bottom: 300 — clear of the progress bar (160), wave viz (215) and
 * watermark (70), and above the Instagram Reels caption/UI overlay.
 */
export const CaptionTrack: React.FC<{
  /** Extra frames to shift timings by. Not needed in the sibling-of-Audio case. */
  offsetFrames?: number;
  bottom?: number;
}> = ({ offsetFrames: offset = 0, bottom = 300 }) => {
  const frame = useCurrentFrame();
  const { fps, props } = useVideoConfig();

  const captionsEnabled = props.captionsEnabled !== false;

  const pages = useMemo<CaptionPage[]>(() => {
    if (!captionsEnabled) {
      return [];
    }
    const words = sanitizeWords(props.words);
    return buildCaptionPages({ words, fps, offsetFrames: offset });
  }, [captionsEnabled, props.words, fps, offset]);

  const page = pageAtFrame(pages, frame);
  if (!page) {
    return null;
  }

  // Pop the whole page in as it appears.
  const entry = spring({
    frame: frame - page.startFrame,
    fps,
    config: { damping: 200, stiffness: 220, mass: 0.5 },
    durationInFrames: 8,
  });

  let activeIndex = -1;
  for (let i = 0; i < page.tokens.length; i++) {
    if (frame >= page.tokens[i].fromFrame) {
      activeIndex = i;
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        padding: "0 80px",
        pointerEvents: "none",
        // Decorative layers use zIndex 1 and content uses 2 in this codebase;
        // captions sit above both (the hook intro is 100 and still wins).
        zIndex: 3,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "8px 4px",
          maxWidth: 880,
          padding: "22px 34px",
          borderRadius: 28,
          background: "#ffffff",
          border: `2px solid ${COLORS.subtleBorder}`,
          boxShadow: "0 18px 45px rgba(20, 25, 45, 0.16)",
          fontFamily,
          transform: `translateY(${interpolate(entry, [0, 1], [26, 0])}px) scale(${interpolate(
            entry,
            [0, 1],
            [0.94, 1]
          )})`,
          opacity: entry,
        }}
      >
        {page.tokens.map((token, i) => {
          const isActive = i === activeIndex;
          const isSpoken = i < activeIndex;

          // Each word gets its own little pop the moment it is spoken.
          const pop = isActive
            ? spring({
                frame: frame - token.fromFrame,
                fps,
                config: { damping: 14, stiffness: 320, mass: 0.35 },
                durationInFrames: 10,
              })
            : 0;

          return (
            <span
              key={`${i}-${token.fromFrame}`}
              style={{
                display: "inline-block",
                padding: "0 9px",
                fontSize: 46,
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: -0.5,
                color: isActive
                  ? COLORS.primary
                  : isSpoken
                    ? COLORS.textPrimary
                    : COLORS.textTertiary,
                transform: `scale(${1 + pop * 0.09})`,
                textShadow: isActive
                  ? `0 4px 18px rgba(233, 69, 96, 0.28)`
                  : "none",
                transition: "none",
              }}
            >
              {token.text.trim()}
            </span>
          );
        })}
      </div>
    </div>
  );
};
