import {z} from 'zod';

/** One narration cue. Drives BOTH the TTS render and the karaoke captions,
 *  so audio and captions can never drift apart. */
export const narrationCue = z.object({
  /** Spoken text. Also the caption text, word by word. */
  text: z.string(),
  /** Frame the cue starts on (30fps). */
  startFrame: z.number().int().nonnegative(),
  /** Frames the cue occupies. Captions distribute words across this. */
  durationInFrames: z.number().int().positive(),
  /** Emphasis lands harder and the music bed ducks a further 6dB. */
  emphasis: z.boolean().default(false),
  /** Silence the music bed entirely (used under listening-practice audio). */
  muteBed: z.boolean().default(false),
});
export type NarrationCue = z.infer<typeof narrationCue>;

/** The opening 2 seconds. Frames 0-60 must be large, colourful, continuous motion. */
export const hookSchema = z.object({
  /** Words snap in one at a time, in motion, never a fade over a still frame. */
  words: z.array(z.string()).min(2),
  kicker: z.string(),
  /** Frames the hook occupies before the body begins. */
  durationInFrames: z.number().int().positive().default(78),
});

/** A handwritten Caveat aside with a rough.js arrow / circle pointing at something. */
export const annotationSchema = z.object({
  text: z.string(),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  /** Where the note sits, in stage coordinates (0-1 of the stage box). */
  at: z.object({x: z.number(), y: z.number()}),
  /** Whether the words sit above or below the anchor point. */
  place: z.enum(['above', 'below']).default('above'),
  /** What it points at, in stage coordinates. Omit for a note with no arrow. */
  pointsAt: z.object({x: z.number(), y: z.number()}).optional(),
  /** Ring the value under discussion instead of arrowing to it. */
  ring: z
    .object({x: z.number(), y: z.number(), w: z.number(), h: z.number()})
    .optional(),
});

export const footerSchema = z.object({
  handle: z.string(),
  url: z.string(),
});

// -------------------------------------------------------------- map reel

export const mapLabelSchema = z.object({
  id: z.string(),
  /** Label drawn on the plan. Geometry is reused; only labels change. */
  label: z.string(),
  /** Which slot of the reusable plan geometry this occupies. */
  slot: z.enum([
    'topLeft',
    'topRight',
    'midLeft',
    'midRight',
    'lowLeft',
    'lowRight',
    'baseLeft',
  ]),
});

export const mapAnswerSchema = z.object({
  number: z.number().int().positive(),
  prompt: z.string(),
  answer: z.string(),
  /** Which plan slot lights up when this answer reveals. */
  slot: mapLabelSchema.shape.slot,
  revealFrame: z.number().int().nonnegative(),
  /** Practice answers stay blank — answers are in the comments. */
  practice: z.boolean().default(false),
});

export const tooltipSchema = z.object({
  text: z.string(),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  /** Anchor on the plan, in stage coordinates. */
  at: z.object({x: z.number(), y: z.number()}),
});

export const mapWalkthroughSchema = z.object({
  kind: z.literal('map'),
  id: z.string(),
  durationInFrames: z.number().int().positive().default(1500),
  title: z.string(),
  subtitle: z.string(),
  hook: hookSchema,
  /** The plan's own caption, e.g. "Plan of a university sports complex". */
  planCaption: z.string(),
  labels: z.array(mapLabelSchema),
  answers: z.array(mapAnswerSchema),
  tooltips: z.array(tooltipSchema).default([]),
  annotations: z.array(annotationSchema).default([]),
  /** Frame the header label switches WALKTHROUGH -> PRACTICE. */
  practiceFrame: z.number().int().nonnegative(),
  narration: z.array(narrationCue),
  footer: footerSchema,
  /** Voice / bed asset produced by scripts/build-audio.mjs. */
  audioSrc: z.string().nullable().default(null),
  musicSrc: z.string().nullable().default(null),
});
export type MapWalkthroughProps = z.infer<typeof mapWalkthroughSchema>;

// ------------------------------------------------------------ chart reel

export const chartSeriesSchema = z.object({
  label: z.string(),
  /** One value per category, same order as categories. */
  values: z.array(z.number()),
});

export const foundTagSchema = z.object({
  kind: z.enum(['UP', 'DOWN', 'LARGEST', 'SMALLEST']),
  value: z.string(),
  foundFrame: z.number().int().nonnegative(),
});

export const chartStepSchema = z.object({
  label: z.string(),
  startFrame: z.number().int().nonnegative(),
});

export const chartWalkthroughSchema = z.object({
  kind: z.literal('chart'),
  id: z.string(),
  durationInFrames: z.number().int().positive().default(1500),
  title: z.string(),
  /** Handwritten Caveat subtitle beneath the title. */
  subtitle: z.string(),
  hook: hookSchema,
  unit: z.string().default('%'),
  categories: z.array(z.string()).min(2),
  series: z.array(chartSeriesSchema).min(1),
  /** Frame each series' bars start growing from the axis. */
  seriesRevealFrames: z.array(z.number().int().nonnegative()),
  steps: z.array(chartStepSchema).length(3),
  /** A soft band slides across the plot to the category under discussion. */
  focus: z
    .array(
      z.object({
        categoryIndex: z.number().int().nonnegative(),
        startFrame: z.number().int().nonnegative(),
      })
    )
    .default([]),
  tags: z.array(foundTagSchema),
  annotations: z.array(annotationSchema).default([]),
  overview: z.object({
    startFrame: z.number().int().nonnegative(),
    text: z.string(),
    /** Scoring phrases highlighted in a pale tint. Must appear in text. */
    highlight: z.array(z.string()),
  }),
  narration: z.array(narrationCue),
  footer: footerSchema,
  audioSrc: z.string().nullable().default(null),
  musicSrc: z.string().nullable().default(null),
});
export type ChartWalkthroughProps = z.infer<typeof chartWalkthroughSchema>;

export const reelSchema = z.discriminatedUnion('kind', [
  mapWalkthroughSchema,
  chartWalkthroughSchema,
]);
export type ReelProps = z.infer<typeof reelSchema>;
