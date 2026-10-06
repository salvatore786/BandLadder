# fizzIELTS reels

Remotion project that renders IELTS teaching reels for Instagram: 1080×1920,
30 fps, H.264, 35–45 seconds.

Every reel is a JSON file in `data/`. Components hold no content — swap the
JSON, get a new reel.

## Run it

```bash
npm install
./scripts/fetch_voices.sh         # piper voice models (~190MB, gitignored)
python scripts/build_audio.py     # narration + music bed + caption timings
npm run studio                    # preview and scrub both compositions
npm run render:all                # render every reel in data/ to out/
npm run render:all -- writing     # only files whose name matches "writing"
npm run typecheck
```

`build_audio.py` has to run before a render: it writes the voice track the
compositions play and the word timings the captions run off. A reel with no
`data/<slug>.audio.json` still renders — silent and uncaptioned — and the
render says so.

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
| 0–16   | an accent block wipes across behind the eyebrow and clears |
| 2–18   | the eyebrow flies in from the left |
| 6–22   | the ink rule springs past full width and settles back |
| 6–52   | headline words arrive every 3 frames, each rising 58 px and scaling up from 0.82, with a motion-blur trail |
| 34–60  | a rough.js underline is drawn beneath the emphasis phrase |

Underneath, the composition's own visual animates at the same time — chart bars
grow out of the axis, the floor plan draws itself in. The hook never covers it.

If you change a headline, keep it to one line at 68 px (roughly 26 characters
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

Fonts (`src/fonts.ts`, loaded once via `@remotion/google-fonts`): Fredoka for
headlines with the emphasis phrase in accent weight, Poppins for body and chart
labels, IBM Plex Mono for eyebrows and the footer, Caveat for handwritten
annotations. No serif.

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
- `overview` is the payoff card; `highlights` are the substrings tinted pale
  blue, lit one phrase at a time once the card has landed.

## Audio

Each reel has a narration script at `data/<slug>.narration.json` — lines of
text, each with the earliest frame it may start on. `scripts/build_audio.py`
synthesises them, lays them out so a line never starts before its beat,
force-aligns the result to get the position of every word, mixes a music bed
under it and masters the whole thing.

```bash
python scripts/build_audio.py                   # engine from audio.config.json
python scripts/build_audio.py --engine kokoro   # A/B a different voice
python scripts/build_audio.py --slug writing-internet-access
```

Out of it come `public/audio/<slug>.<engine>.mp3` and
`data/<slug>.audio.json`. Both are regenerated from scratch every run, so the
narration script is the only thing to edit.

### Choosing a voice

`audio.config.json` picks the engine. Each writes its own file, so two engines
can sit side by side and only `engine` decides which the render picks up.

| engine | cost | needs |
|--------|------|-------|
| `piper` (default) | free, local | `scripts/fetch_voices.sh` |
| `kokoro` | free, local | `pip install kokoro` plus its checkpoint |
| `elevenlabs` | paid | `ELEVENLABS_API_KEY` and a `voiceId` |

Nothing leaves the machine unless `engine` is set to `elevenlabs`.

### Pacing

A line's `rate` scales the speaking rate and `pauseAfter` buys silence after it
— brisk through the walkthrough steps, then a beat of nothing before each answer
lands, then `"emphasis": true` on the answer itself. The narration runs at about
157 wpm to match the reference reels. Keep the speech under roughly 80% of the
runtime; a wall-to-wall voice track leaves the reveals nowhere to land.

### The mix

A synthesised pad sits `music.bedDb` (−28 dB) under the voice, measured against
the voice's own speaking level rather than its peaks. `duckFrames` drops it
further under each answer reveal and `musicMuteFrames` takes it out entirely —
used for the stretch where the viewer is working the practice question out. The
final mix is normalised to −16 LUFS, verified on the encoded file and corrected
if the encode moved it.

The pad is generated rather than sourced, so the reels carry no third-party
audio licence. Point the music config at a real track when there is one.

### Captions

Caption timings are not authored. `build_audio.py` force-aligns the synthesised
narration with WhisperX and writes one `{ word, startFrame }` per word, so the
karaoke highlight is the measured position of that word in the audio the viewer
hears. With no alignment model installed it falls back to spreading words across
each line by length, which stays in sync line by line.

## Motion

Measuring the reference reels against the first cut showed the gap was never
*which* properties were animated. Ours snapped into place in three frames,
travelled almost no distance, and left long stretches where nothing changed at
all — the listening reel was identical frame-to-frame 98% of the time.

`src/motion.ts` holds the rules that came out of that, and `MOTION` in
`src/brand.ts` holds their values:

- no entrance under 8 frames; key reveals get 20
- an entrance travels 52 px or scales from 0.82, never a bare opacity fade
- springs with real overshoot (`MOTION.bounce`), never a linear ramp
- grouped elements stagger 3 frames apart
- a finished state is held 20 frames before anything replaces it
- exits overlap the next entrance, so one gesture starts before the last ends
- between gestures the frame holds still

That last one was learned the hard way. An earlier cut put a slow drift on
nearly every idle element to push the static-frame share down, and measuring it
showed the median motion event was **two frames long**: every tile was crossing
the threshold on and off perpetually, chopping the real gestures into fragments.
The reference reel holds 89% of its frames still and spends its motion on a few
long ones. Ambient drift survives only where something genuinely never stops —
trees in the grounds, the walker's gait, the blobs, and a 3% push-in over the
full duration.

Be careful with anything that transforms the whole page. A 4px sway on a
6-second cycle looked like nothing and measured like everything: at 0.15px a
frame it sat right on the threshold where a change becomes visible, crossing it
and falling back every few frames, which halved the length of every gesture in
the reel and tripled the apparent motion in tiles holding nothing but still
text. Removing it took average event length from 190ms to 302ms and the static
share from 38% to 61%, with no other change. The push-in survives because at
0.02px a frame it is six times slower and stays under that threshold.

`scripts/measure_motion.py` scores a render on the same five numbers the
reference reels were scored on. Run it against both to compare:

```bash
python scripts/measure_motion.py out/*.mp4 reference.mp4
```

Its thresholds are fixed constants, so read a render against a reference
measured in the same run rather than against a remembered number.

### Motion blur

`src/components/MotionTrail.tsx` draws ghosts of a moving element from its own
transform evaluated a frame or two in the past. `@remotion/motion-blur` offers
two alternatives and neither fits: `<CameraMotionBlur>` re-renders the whole
tree per sample, which costs more than the reel itself, and `<Trail>` lays its
layers out with `AbsoluteFill`, which destroys inline text layout. Use
`<CameraMotionBlur>` anyway if render time stops mattering — it is the better
blur.

## Notes

- `licenseKey: "free-license"` is passed by `scripts/render-all.mjs` (solo
  licence).
- ffmpeg ships with Remotion; do not install it separately.
- On Linux the renderer uses `swangle`, elsewhere `angle`.
- `.voices/` is gitignored and refetched by `scripts/fetch_voices.sh`.
- `public/audio/` and `data/*.audio.json` are generated by
  `scripts/build_audio.py` but committed, so a fresh clone can render without
  Python. Rebuild them whenever a narration script changes.
