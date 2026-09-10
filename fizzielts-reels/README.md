# fizzIELTS reels

Remotion project that renders IELTS teaching reels for Instagram: 1080×1920,
30 fps, H.264, 35–45 seconds.

Every reel is a JSON file in `data/`. Components hold no content — swap the
JSON, get a new reel.

## Run it

```bash
npm install
npm run studio        # preview and scrub both compositions
npm run render:all    # render every reel in data/ to out/
npm run render:all -- writing   # only files whose name matches "writing"
npm run typecheck
```

## Add a new reel

1. Copy the closest file in `data/` to a new name.
2. Set `"composition"` to `MapWalkthrough` or `ChartWalkthrough`.
3. Edit the content. `durationInFrames` sets the reel's length — keep it under
   1500 (50 s); aim for 1050–1350 (35–45 s).
4. `npm run render:all -- your-file` .

The props are validated by zod schemas in `src/schemas.ts`, so Studio shows a
form for every field and a bad file fails loudly instead of rendering wrong.

## The opening two seconds

Reach is decided by the 3-second skip rate, so **frames 0–60 carry real motion
and never a held title card.** `<Hook>` owns that window and every composition
starts with it:

| frames | what moves |
|--------|-----------|
| 0–12   | the ink rule wipes out from under the eyebrow |
| 4–45   | headline words snap in one at a time, each overshooting |
| 34–58  | a rough.js underline is drawn beneath the emphasis phrase |

Underneath, the composition's own visual animates at the same time — chart bars
grow out of the axis, the floor plan draws itself in. The hook never covers it.

If you change a headline, keep it to one line at 78 px (roughly 34 characters
including the emphasis phrase) or it wraps and eats the chart.

## Brand system

`src/brand.ts` is the single source of truth for colour, layout, type scale and
motion. **No hex value belongs anywhere else** — including in components. The
only colours that live outside it are in `data/*.json`, where they are content:
which colour a given answer or chart series is assigned.

Accent comes from the reel's `module`:

| module | accent |
|--------|--------|
| `listening` | blue `#1F6FB2` |
| `writing` | purple `#534AB7` |
| `speaking` | teal `#0D9488` |
| `vocabulary` | coral `#F0654A` |

Fonts (`src/fonts.ts`, loaded once via `@remotion/google-fonts`): Instrument
Serif for headlines with the emphasis phrase in accent italic, Poppins for body
and chart labels, IBM Plex Mono for eyebrows and the footer, Caveat for
handwritten annotations.

## Compositions

### `MapWalkthrough` — Listening, blue

A map-labelling walkthrough. The floor plan in
`src/compositions/MapWalkthrough/SportsComplexMap.tsx` has **fixed geometry and
swappable text**: reuse it across reels by changing `map.fixtures` and the
answer keys, never the component.

- Eight lettered slots, `A`–`H`. Each answer names the slot it turns out to be.
- `answers[].revealFrame` fills a row and colours the matching room.
- `answers[].practice: true` leaves a row blank for the viewer.
- `practiceStartFrame` flips the header label from WALKTHROUGH to PRACTICE.
- `bubbles` are dark tooltips positioned over the map in 0–1 map coordinates.

### `ChartWalkthrough` — Writing, purple

Teaches the Task 1 overview in two moves.

- The bar chart is hand-written SVG, not a chart library, for two reasons: bars
  need per-frame reveal control, and `barLayout()` exports pixel geometry so
  annotations stay glued to their bar when the data changes.
- `annotations` place Caveat handwriting plus a rough.js circle, arrow or
  underline on a named bar. While one is up, every other bar dims.
- `foundSoFar` accumulates UP / DOWN / LARGEST / SMALLEST as each is discovered.
- `captions` are pre-scripted: `{ word, startFrame }`. A word stays highlighted
  until the next word starts, so nothing is ever un-highlighted mid-sentence.
- `overview` is the payoff card; `highlights` are the substrings tinted pale
  blue.

### Caption timing

Captions are written by hand, not from speech-to-text. The reference reels
narrate at about 157 wpm with a ~0.4 s beat at each clause, which is 11.5 frames
per word at 30 fps. Generate a timing list from a script with that spacing and
paste it into `captions`.

## Notes

- `licenseKey: "free-license"` is passed by `scripts/render-all.mjs` (solo
  licence).
- ffmpeg ships with Remotion; do not install it separately.
- On Linux the renderer uses `swangle`, elsewhere `angle`.
