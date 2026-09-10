/**
 * Reports the Part 5 motion metrics for any rendered file.
 *
 *   node scripts/measure-motion.mjs out/MapWalkthrough.mp4 [more.mp4 ...]
 *   node scripts/measure-motion.mjs            (measures everything in out/)
 *
 * Method — stated explicitly, because "motion event" is only meaningful
 * against a definition:
 *
 *   1. Decode the first WINDOW_SECONDS at the file's own frame rate, scaled to
 *      a 128px-wide grayscale thumbnail (so the numbers describe visible
 *      movement, not codec noise).
 *   2. d[i] = mean absolute pixel difference against the previous frame,
 *      in 0-255 units.
 *   3. Amplitude a[i] = d[i] / p99.5(d), clamped to [0,1] — each file is
 *      normalised against its own peak, so amplitude measures how much of the
 *      time the frame is moving NEAR its hardest, not absolute brightness.
 *   4. A frame is "in motion" when a[i] >= EVENT_THRESHOLD. A motion event is
 *      a maximal run of in-motion frames; a sustained move is one lasting
 *      >= 333ms.
 *   5. A frame is "static" when d[i] < DUPLICATE_EPS — visually identical to
 *      the frame before it, the near-duplicate test a decimator would apply.
 *      This is deliberately a different (much stricter) signal from step 4:
 *      ambient drift keeps a frame off the static pile without registering as
 *      a motion event.
 */
import {spawn} from 'node:child_process';
import {readdirSync, existsSync} from 'node:fs';
import {dirname, join, basename} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const FFMPEG = join(ROOT, 'node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg');

const WINDOW_SECONDS = 35;
const W = 128;
const H = 228;
const EVENT_THRESHOLD = 0.12;
const DUPLICATE_EPS = 0.35;
const SUSTAINED_MS = 333;

/** The Part 5 acceptance criteria. */
export const TARGETS = {
  motionEvents: {min: 85, label: 'Motion events', fmt: (v) => String(v)},
  avgEventMs: {min: 140, label: 'Avg event length', fmt: (v) => `${v.toFixed(0)} ms`},
  sustainedPct: {min: 8, label: 'Sustained moves (>=333ms)', fmt: (v) => `${v.toFixed(1)}%`},
  amplitudeP95: {min: 0.65, label: 'Motion amplitude (p95)', fmt: (v) => v.toFixed(2)},
  staticPct: {max: 92, label: 'Static frames', fmt: (v) => `${v.toFixed(1)}%`},
};

const readGrayFrames = (file) =>
  new Promise((resolve, reject) => {
    const args = [
      '-hide_banner', '-loglevel', 'error',
      '-t', String(WINDOW_SECONDS),
      '-i', file,
      '-vf', `scale=${W}:${H}`,
      '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'gray',
      '-',
    ];
    const proc = spawn(FFMPEG, args);
    const chunks = [];
    let err = '';
    proc.stdout.on('data', (c) => chunks.push(c));
    proc.stderr.on('data', (c) => (err += c));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || `ffmpeg exited ${code}`));
      const buf = Buffer.concat(chunks);
      const size = W * H;
      const count = Math.floor(buf.length / size);
      const frames = [];
      for (let i = 0; i < count; i++) frames.push(buf.subarray(i * size, (i + 1) * size));
      resolve(frames);
    });
  });

const percentile = (sorted, p) => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
};

export const measure = async (file, fps = 30) => {
  const frames = await readGrayFrames(file);
  if (frames.length < 2) throw new Error(`Could not read frames from ${file}`);

  const diffs = [];
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1];
    const b = frames[i];
    let sum = 0;
    for (let p = 0; p < a.length; p++) sum += Math.abs(a[p] - b[p]);
    diffs.push(sum / a.length);
  }

  const sorted = [...diffs].sort((x, y) => x - y);
  const peak = Math.max(percentile(sorted, 99.5), 1e-6);
  const amps = diffs.map((d) => Math.min(1, d / peak));

  // Motion events: maximal runs above the event threshold.
  const events = [];
  let run = 0;
  for (const a of amps) {
    if (a >= EVENT_THRESHOLD) {
      run += 1;
    } else if (run > 0) {
      events.push(run);
      run = 0;
    }
  }
  if (run > 0) events.push(run);

  const msPerFrame = 1000 / fps;
  const sustainedFrames = Math.ceil(SUSTAINED_MS / msPerFrame);
  const sustained = events.filter((e) => e >= sustainedFrames).length;
  const staticFrames = diffs.filter((d) => d < DUPLICATE_EPS).length;
  const ampSorted = [...amps].sort((x, y) => x - y);

  return {
    file,
    frames: frames.length,
    seconds: frames.length / fps,
    motionEvents: events.length,
    avgEventMs: events.length ? (events.reduce((a, b) => a + b, 0) / events.length) * msPerFrame : 0,
    sustainedPct: events.length ? (sustained / events.length) * 100 : 0,
    amplitudeP95: percentile(ampSorted, 95),
    staticPct: (staticFrames / diffs.length) * 100,
    eventsPerSecond: events.length / (frames.length / fps),
  };
};

const report = (m) => {
  console.log(`\n${basename(m.file)}  —  first ${m.seconds.toFixed(1)}s, ${m.frames} frames`);
  console.log('  metric                        value      target     result');
  let pass = true;
  for (const [key, t] of Object.entries(TARGETS)) {
    const value = m[key];
    const ok = t.min !== undefined ? value >= t.min : value <= t.max;
    if (!ok) pass = false;
    const target = t.min !== undefined ? `>= ${t.min}` : `<= ${t.max}`;
    console.log(
      `  ${t.label.padEnd(28)}${t.fmt(value).padStart(9)}  ${target.padStart(9)}     ${
        ok ? 'PASS' : 'MISS'
      }`
    );
  }
  console.log(`  (motion events per second: ${m.eventsPerSecond.toFixed(2)})`);
  return pass;
};

const main = async () => {
  let files = process.argv.slice(2);
  if (files.length === 0) {
    const outDir = join(ROOT, 'out');
    files = existsSync(outDir)
      ? readdirSync(outDir).filter((f) => f.endsWith('.mp4')).map((f) => join(outDir, f))
      : [];
  }
  if (files.length === 0) {
    console.error('No video files to measure. Render first: npm run render:all');
    process.exit(1);
  }
  let allPass = true;
  for (const f of files) {
    const m = await measure(f);
    allPass = report(m) && allPass;
  }
  console.log(`\n${allPass ? 'All metrics meet the Part 5 targets.' : 'Some metrics miss the Part 5 targets.'}`);
  process.exit(allPass ? 0 : 1);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
