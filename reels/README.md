# BandLadder reels

Vertical IELTS explainer reels, rendered with Remotion. 1080 × 1920, 30fps, H.264,
with synthesised narration, karaoke captions and a hand-drawn annotation layer.

Two compositions ship today:

| Composition | `kind` | What it teaches |
|---|---|---|
| `MapWalkthrough` | `map` | Listening plan-labelling — the plan draws itself on, answers reveal on the narration beat, then a practice section |
| `ChartWalkthrough` | `chart` | Writing Task 1 — bars grow from the axis, findings accumulate as tags, ending on a model overview |

## Setup

```bash
npm install
```

Fonts are self-hosted in `public/fonts` (Fredoka, Poppins, Caveat, IBM Plex Mono).
The render sandbox has no trusted route to `fonts.gstatic.com`, and a font that
silently fails to load changes every measured layout — so they are committed.

## The three commands

```bash
npm run tts          # synthesise narration, re-time the visuals to it, mix the audio
npm run render:all   # render every reel in data/ to out/
npm run measure      # report the motion metrics for everything in out/
```

`npm run studio` opens the Remotion studio for interactive work.

## Adding a new reel

A reel is one JSON file in `data/`. Nothing else.

1. Write the narration script. Open `scripts/build-data.mjs`, add an entry to
   `SCRIPTS` and a builder alongside `buildMap` / `buildChart`. Each script line is
   `{text, mark?, emphasis?, muteBed?}`:
   - `mark` names the frame the line starts on, so visuals can anchor to it
     (`map.mark.a1` is the frame answer 1 reveals).
   - `emphasis` buys a deliberate half-second of silence before the line and
     ducks the music bed a further 6dB under it. Use it on answer reveals.
   - `muteBed` silences the bed entirely — for listening-practice beats.
2. `node scripts/build-data.mjs` writes the JSON with word-rate estimates.
3. `npm run tts` synthesises the voice, measures how long each line **really**
   is, feeds those lengths back into the JSON, and mixes the track. Every frame
   number in the reel is derived from that one timing array, so the voice, the
   captions and the visuals cannot drift apart.
4. `npm run render:all` picks the composition from the JSON's `kind`.

The props are validated by `src/schema.ts` (zod) both in the studio and at render
time, so a malformed reel fails loudly rather than rendering wrong.

### Reusing the plan geometry

`src/map/planGeometry.ts` holds the plan's coordinates. The seven room slots
(`topLeft`, `topRight`, `midLeft`, `midRight`, `lowLeft`, `lowRight`, `baseLeft`)
are fixed; only the **labels** change per reel. A new listening walkthrough
reuses the drawing entirely.

## Configuration

### `src/brand.ts`

Every colour, font, size, layout constant, spring config and motion duration.
It is the single source of truth — no other file in `src/` contains a raw hex
value. Change the palette there and both reels follow.

### `config/tts.json`

```json
{ "engine": "kokoro", "voice": "af_heart", "speed": 1.08 }
```

| Engine | Notes |
|---|---|
| `kokoro` | Free, local, good prosody. The default. Downloads its model on first run. |
| `piper` | Free, local, noticeably flatter. Needs the `piper` binary on PATH. |
| `elevenlabs` | Paid, best prosody. Set `elevenlabs.voiceId` and the API key env var. |

Voice direction for all three: energetic, warm, encouraging teacher — brisk and
upbeat, never flat, never a newsreader. All speech is synthesised from our own
scripts; no real IELTS exam audio is ever used.

The `mix` block controls the music bed (−28dB under the voice, ducked a further
6dB on emphasis lines, silenced under `muteBed` cues) and the −16 LUFS
normalisation target.

## Motion rules

Remotion seeks to each frame and renders it in isolation, so a CSS `transition`,
a Framer Motion `animate` prop, `requestAnimationFrame` or `setTimeout` renders
as a frozen frame or a flicker. **Every animated value derives from
`useCurrentFrame()`** through `src/lib/motion.ts`.

The house rules, all enforced through that module:

- `spring()` with overshoot and settle. Never `interpolate` with linear easing.
- Nothing completes in under 5 frames; entrances take at least 8, key reveals 15–20.
- Entrances **travel** — 40–60px of slide, or scale 0.8 → 1.0. A fade at the
  destination is not an animation.
- Grouped elements stagger 2–4 frames so lists cascade.
- Beats overlap: the next element starts before the previous has settled.
- Ambient motion never stops — blob position and scale are driven by `noise2D()`
  seeded on the frame, plus a slow 1.03× push-in across the whole composition.
- Fast-moving elements are wrapped in `<Trail>` via `src/components/TrailBox.tsx`,
  and each composition sits inside `<CameraMotionBlur>`.

`<Trail>` stacks `AbsoluteFill` layers, so it collapses anything taking part in
normal flow layout. Always wrap it in `TrailBox`, which gives it the sized,
positioned box it needs.

## Measuring motion

```bash
npm run measure                       # everything in out/
node scripts/measure-motion.mjs a.mp4 # one file
```

Reports motion events, average event length, sustained moves, p95 amplitude and
static frames over the first 35 seconds, against the acceptance targets. The
method and its thresholds are documented at the top of the script — the numbers
only mean something against a stated definition.

## Layout safety

Every dynamic text field goes through `fitText` / `measureText`
(`src/lib/text.ts`) so nothing overflows or collides whatever the JSON puts in
it. If you add a text field, size it through `fitToWidth`.
