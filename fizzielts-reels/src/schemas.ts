/**
 * Typed props for every composition.
 *
 * Each reel is one JSON file in `data/`. Nothing about a reel's content lives
 * in a component — swap the JSON, get a new reel.
 */

import { z } from "zod";
import { zColor } from "@remotion/zod-types";

const moduleName = z.enum(["listening", "writing", "speaking", "vocabulary"]);

/** Headline is split so the emphasis phrase can be italic and accent-coloured. */
const headline = z.object({
  lead: z.string(),
  emphasis: z.string(),
  trail: z.string().optional(),
});

const pageChrome = z.object({
  /** Which composition renders this reel. */
  composition: z.enum(["MapWalkthrough", "ChartWalkthrough"]),
  module: moduleName,
  eyebrow: z.string(),
  headline,
  durationInFrames: z.number().int().positive(),
});

// ── Composition 1: MapWalkthrough ────────────────────────────────────────────

/** The eight lettered boxes the map geometry provides. */
export const slotId = z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]);

const mapAnswer = z.object({
  n: z.number().int().positive(),
  /** What is being located, e.g. "Reception". */
  name: z.string(),
  /** Which lettered box it turns out to be. */
  slot: slotId,
  /** Frame the row fills in. Practice rows never reveal. */
  revealFrame: z.number().int().nonnegative(),
  color: zColor(),
  /** Practice rows stay blank and are answered in the comments. */
  practice: z.boolean().default(false),
});

const bubble = z.object({
  text: z.string(),
  fromFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  /** Position over the map, 0-1 of the map box. */
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const mapWalkthroughSchema = pageChrome.extend({
  sectionLabels: z.object({ walkthrough: z.string(), practice: z.string() }),
  /** Frame the header label flips from WALKTHROUGH to PRACTICE. */
  practiceStartFrame: z.number().int().nonnegative(),
  map: z.object({
    /** Fixed features drawn on the plan — swap these to reuse the geometry. */
    fixtures: z.object({
      entrance: z.string(),
      northLabel: z.string(),
      corridor: z.string(),
      blockA: z.string(),
      blockB: z.string(),
    }),
  }),
  answers: z.array(mapAnswer),
  bubbles: z.array(bubble),
});

export type MapWalkthroughProps = z.infer<typeof mapWalkthroughSchema>;
export type MapAnswer = z.infer<typeof mapAnswer>;
export type Bubble = z.infer<typeof bubble>;

// ── Composition 2: ChartWalkthrough ──────────────────────────────────────────

const series = z.object({ name: z.string() });
/**
 * Each category carries its own full-strength colour; the earlier series is
 * drawn as a lighter mix of it. Distinct hues per category, not tints of one.
 */
const category = z.object({
  name: z.string(),
  values: z.array(z.number()),
  color: zColor(),
});

const annotation = z.object({
  text: z.string(),
  fromFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  /** Which bar to point at. */
  target: z.object({
    category: z.string(),
    seriesIndex: z.number().int().nonnegative(),
  }),
  shape: z.enum(["circle", "arrow", "underline"]),
  /** Where the handwriting sits relative to the target bar, in px. */
  offset: z.object({ dx: z.number(), dy: z.number() }),
});

const foundTag = z.object({
  tag: z.enum(["UP", "DOWN", "LARGEST", "SMALLEST"]),
  /** Empty string renders the tag as still-unknown. */
  value: z.string(),
  atFrame: z.number().int().nonnegative(),
});

/**
 * Captions are pre-scripted: one entry per word with the frame it lands on.
 * The word stays highlighted until the next word's startFrame.
 */
const captionWord = z.object({
  word: z.string(),
  startFrame: z.number().int().nonnegative(),
});

export const chartWalkthroughSchema = pageChrome.extend({
  handSubtitle: z.string(),
  chart: z.object({
    title: z.string(),
    yAxisLabel: z.string(),
    yMax: z.number().positive(),
    yTick: z.number().positive(),
    series: z.array(series),
    categories: z.array(category),
    /** Frame the bars finish growing — they start at 0. */
    growEndFrame: z.number().int().positive(),
  }),
  annotations: z.array(annotation),
  steps: z.array(z.object({ label: z.string(), atFrame: z.number().int().nonnegative() })),
  foundSoFar: z.array(foundTag),
  captions: z.array(captionWord),
  overview: z.object({
    text: z.string(),
    /** Substrings tinted pale blue — the phrases that earn the band score. */
    highlights: z.array(z.string()),
    atFrame: z.number().int().nonnegative(),
  }),
});

export type ChartWalkthroughProps = z.infer<typeof chartWalkthroughSchema>;
export type Annotation = z.infer<typeof annotation>;
export type FoundTag = z.infer<typeof foundTag>;
export type CaptionWord = z.infer<typeof captionWord>;
