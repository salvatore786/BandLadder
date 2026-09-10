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
