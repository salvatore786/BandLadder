import {fitText, measureText} from '@remotion/layout-utils';
import {FONTS} from '../brand';

/**
 * Every dynamic text field goes through this so nothing ever overflows or
 * collides, whatever the JSON puts in it.
 */
export const fitToWidth = ({
  text,
  maxWidth,
  fontFamily = FONTS.body,
  fontWeight = 500,
  max,
  min = 18,
  letterSpacing,
}: {
  text: string;
  maxWidth: number;
  fontFamily?: string;
  fontWeight?: number | string;
  max: number;
  min?: number;
  letterSpacing?: string;
}) => {
  const {fontSize} = fitText({
    text,
    withinWidth: maxWidth,
    fontFamily,
    fontWeight,
    letterSpacing,
    validateFontIsLoaded: false,
  });
  return Math.max(min, Math.min(max, fontSize));
};

export const widthOf = ({
  text,
  fontSize,
  fontFamily = FONTS.body,
  fontWeight = 500,
  letterSpacing,
}: {
  text: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: number | string;
  letterSpacing?: string;
}) =>
  measureText({
    text,
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing,
    validateFontIsLoaded: false,
  }).width;

/** Split a cue into words with per-word frame windows for karaoke captions. */
export const wordTimings = (
  text: string,
  startFrame: number,
  durationInFrames: number
) => {
  const words = text.split(/\s+/).filter(Boolean);
  // Longer words hold longer — weight by character count, not word count.
  const weights = words.map((w) => Math.max(2, w.replace(/[^\w]/g, '').length));
  const total = weights.reduce((a, b) => a + b, 0);
  let cursor = startFrame;
  return words.map((word, i) => {
    const span = (weights[i] / total) * durationInFrames;
    const from = cursor;
    cursor += span;
    return {word, from, to: cursor, index: i};
  });
};

/**
 * Beat frames for the narration: one on every spoken word, plus a second
 * accent inside any word long enough to carry one. Word onsets alone leave
 * roughly half a second between movements on longer words, which is where the
 * frame starts to feel like it has stopped.
 */
export const wordBeats = (
  cues: {text: string; startFrame: number; durationInFrames: number}[],
  /** Shortest word, in frames, that earns a second accent. */
  subWordMinSpan = 11
) =>
  cues
    .flatMap((c) =>
      wordTimings(c.text, c.startFrame, c.durationInFrames).flatMap((w) => {
        const onset = Math.round(w.from);
        const span = w.to - w.from;
        return span >= subWordMinSpan
          ? [onset, Math.round(w.from + span * 0.55)]
          : [onset];
      })
    )
    .sort((a, b) => a - b);
