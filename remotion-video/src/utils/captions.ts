/**
 * Word-level caption helpers.
 *
 * Word timings come from WhisperX forced alignment (see `transcribe.py`), which
 * runs over the same TTS audio that gets embedded in the video. The generator
 * passes them through as the `words` prop; everything here is a pure transform
 * on that array so components stay deterministic across renders.
 */

import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";

/** A single aligned word, times in seconds relative to the audio file. */
export interface CaptionWord {
  word: string;
  start: number;
  end: number;
  /** Speaker label ("A", "B", ...) when the script was a dialogue. */
  speaker?: string;
}

export interface CaptionToken {
  text: string;
  fromFrame: number;
  toFrame: number;
}

export interface CaptionPage {
  startFrame: number;
  endFrame: number;
  tokens: CaptionToken[];
}

/** Discard anything that isn't a usable, monotonically timed word. */
export function sanitizeWords(input: unknown): CaptionWord[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const words: CaptionWord[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const { word, start, end, speaker } = raw as Record<string, unknown>;
    if (typeof word !== "string" || word.trim() === "") continue;
    if (typeof start !== "number" || typeof end !== "number") continue;
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (end < start) continue;

    words.push({
      word: word.trim(),
      start,
      // Guarantee a visible duration for zero-length alignments.
      end: Math.max(end, start + 0.04),
      ...(typeof speaker === "string" ? { speaker } : {}),
    });
  }

  return words.sort((a, b) => a.start - b.start);
}

/**
 * Group words into short on-screen pages, TikTok style.
 *
 * `combineWithinMs` controls how aggressively adjacent words are merged into
 * one page — smaller values mean faster, punchier caption changes.
 */
export function buildCaptionPages({
  words,
  fps,
  offsetFrames = 0,
  combineWithinMs = 1200,
  maxCharsPerPage = 42,
}: {
  words: CaptionWord[];
  fps: number;
  offsetFrames?: number;
  combineWithinMs?: number;
  maxCharsPerPage?: number;
}): CaptionPage[] {
  if (words.length === 0) {
    return [];
  }

  const captions: Caption[] = words.map((w) => ({
    text: w.word,
    startMs: w.start * 1000,
    endMs: w.end * 1000,
    timestampMs: ((w.start + w.end) / 2) * 1000,
    confidence: null,
  }));

  const { pages } = createTikTokStyleCaptions({
    captions,
    combineTokensWithinMilliseconds: combineWithinMs,
  });

  const toFrame = (ms: number) => Math.round((ms / 1000) * fps) + offsetFrames;

  const result: CaptionPage[] = [];
  for (const page of pages) {
    // createTikTokStyleCaptions groups purely by time, so a slow passage can
    // still produce a page too wide for a 1080px frame. Split on characters.
    for (const chunk of chunkTokens(page.tokens, maxCharsPerPage)) {
      if (chunk.length === 0) continue;
      result.push({
        startFrame: toFrame(chunk[0].fromMs),
        endFrame: toFrame(chunk[chunk.length - 1].toMs),
        tokens: chunk.map((token) => ({
          text: token.text,
          fromFrame: toFrame(token.fromMs),
          toFrame: toFrame(token.toMs),
        })),
      });
    }
  }

  return result;
}

function chunkTokens<T extends { text: string }>(
  tokens: T[],
  maxChars: number
): T[][] {
  const chunks: T[][] = [];
  let current: T[] = [];
  let length = 0;

  for (const token of tokens) {
    const tokenLength = token.text.length;
    if (current.length > 0 && length + tokenLength > maxChars) {
      chunks.push(current);
      current = [];
      length = 0;
    }
    current.push(token);
    length += tokenLength;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

/** The page visible at `frame`, or null between pages. */
export function pageAtFrame(
  pages: CaptionPage[],
  frame: number
): CaptionPage | null {
  for (const page of pages) {
    if (frame >= page.startFrame && frame <= page.endFrame) {
      return page;
    }
  }
  return null;
}
