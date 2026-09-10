/**
 * Builds the narration track for every reel.
 *
 *   node scripts/build-audio.mjs            both reels
 *   node scripts/build-audio.mjs map-...    one reel by id
 *
 * Two passes, because the visuals must follow the real voice and not an
 * estimate:
 *
 *   pass 1  synthesise every line, measure it, and feed the true per-cue
 *           lengths back into data/*.json — captions, answer reveals, step
 *           changes and annotations are all derived from those same numbers,
 *           so voice and picture cannot drift.
 *   pass 2  lay the lines onto the timeline, add the music bed at -28dB
 *           (ducked a further 6dB under an emphasis line, silenced entirely
 *           where a cue asks for it), and normalise the result to -16 LUFS.
 */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdirSync, readFileSync, writeFileSync, existsSync, rmSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {synthesise} from './tts-engines.mjs';
import {SCRIPTS, buildAll, loadTimings, saveTimings} from './build-data.mjs';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const FPS = 30;

const FFMPEG = join(ROOT, 'node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg');
const FFPROBE = join(ROOT, 'node_modules/@remotion/compositor-linux-x64-gnu/ffprobe');

const cfg = JSON.parse(readFileSync(join(ROOT, 'config/tts.json'), 'utf8'));

const dbToGain = (db) => 10 ** (db / 20);

const durationOf = async (file) => {
  const {stdout} = await run(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  return Number(stdout.trim());
};

/** Pass 1 — synthesise each line and measure how long it really is. */
const synthesiseReel = async (id) => {
  const lines = SCRIPTS[id];
  if (!lines) throw new Error(`No narration script registered for reel "${id}"`);

  const dir = join(ROOT, 'out/tts', id);
  mkdirSync(dir, {recursive: true});

  const frames = [];
  const files = [];
  for (const [i, line] of lines.entries()) {
    const file = join(dir, `${String(i).padStart(3, '0')}.wav`);
    process.stdout.write(`  [${i + 1}/${lines.length}] ${line.text.slice(0, 52)}…\r`);
    await synthesise(line.text, file, cfg);
    const seconds = await durationOf(file);
    // A few frames of tail so a line never clips into the next beat.
    frames.push(Math.ceil(seconds * FPS) + 3);
    files.push(file);
  }
  process.stdout.write('\n');
  return {frames, files};
};

/** Build an ffmpeg volume expression that is 1 inside any of the windows. */
const windowExpr = (windows) =>
  windows.length === 0
    ? '0'
    : `gt(${windows.map(([a, b]) => `between(t,${a.toFixed(3)},${b.toFixed(3)})`).join('+')},0)`;

/** Pass 2 — lay the lines onto the timeline and mix in the bed. */
const mixReel = async (reel, files) => {
  const outDir = join(ROOT, 'public/audio');
  mkdirSync(outDir, {recursive: true});
  const outPath = join(outDir, `${reel.id}.mp3`);
  const total = reel.durationInFrames / FPS;

  const bedPath = join(ROOT, 'public', cfg.mix.bed);
  const hasBed = existsSync(bedPath);

  const emphasis = reel.narration
    .filter((c) => c.emphasis)
    .map((c) => [c.startFrame / FPS, (c.startFrame + c.durationInFrames) / FPS]);
  const muted = reel.narration
    .filter((c) => c.muteBed)
    .map((c) => [c.startFrame / FPS, (c.startFrame + c.durationInFrames) / FPS]);

  const inputs = [];
  const filters = [];
  const voiceLabels = [];

  reel.narration.forEach((cue, i) => {
    inputs.push('-i', files[i]);
    const delayMs = Math.round((cue.startFrame / FPS) * 1000);
    filters.push(
      `[${i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=${delayMs}|${delayMs}[v${i}]`
    );
    voiceLabels.push(`[v${i}]`);
  });

  filters.push(
    `${voiceLabels.join('')}amix=inputs=${voiceLabels.length}:normalize=0:dropout_transition=0[voice]`
  );

  let mixLabel = '[voice]';
  if (hasBed) {
    const bedIndex = reel.narration.length;
    inputs.push('-stream_loop', '-1', '-i', bedPath);
    // The bed sits under the voice, ducks a further 6dB on an emphasis line,
    // and drops to silence wherever a cue asks for it.
    const gain = dbToGain(cfg.mix.bedDb);
    const duck = dbToGain(cfg.mix.duckDb);
    // The bed's whole level automation is one expression: base level, the
    // emphasis duck, the mute windows, and the top-and-tail fades. (Remotion's
    // bundled ffmpeg has no afade filter, and this is a single curve anyway.)
    const fadeIn = `min(1,t/0.6)`;
    const fadeOut = `min(1,max(0,(${total.toFixed(3)}-t)/1.2))`;
    const expr =
      `${gain.toFixed(5)}` +
      `*if(${windowExpr(emphasis)},${duck.toFixed(5)},1)` +
      `*if(${windowExpr(muted)},0,1)` +
      `*${fadeIn}*${fadeOut}`;
    filters.push(
      `[${bedIndex}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,` +
        `volume=volume='${expr}':eval=frame,atrim=0:${total.toFixed(3)}[bed]`
    );
    filters.push(`[voice][bed]amix=inputs=2:normalize=0:dropout_transition=0[mixed]`);
    mixLabel = '[mixed]';
  }

  // Normalise the finished track to -16 LUFS.
  filters.push(
    `${mixLabel}loudnorm=I=${cfg.mix.targetLufs}:TP=${cfg.mix.truePeakDb}:LRA=11,` +
      `apad,atrim=0:${total.toFixed(3)}[out]`
  );

  await run(
    FFMPEG,
    [
      '-y', '-hide_banner', '-loglevel', 'error',
      ...inputs,
      '-filter_complex', filters.join(';'),
      '-map', '[out]',
      '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', '48000',
      outPath,
    ],
    {maxBuffer: 64 * 1024 * 1024}
  );

  return {outPath, hasBed};
};

const main = async () => {
  const only = process.argv[2];
  const ids = Object.keys(SCRIPTS).filter((id) => !only || id === only);
  if (ids.length === 0) throw new Error(`No reel matches "${only}"`);

  console.log(`TTS engine: ${cfg.engine} · voice: ${cfg.voice} · speed: ${cfg.speed}`);

  // Pass 1: synthesise and measure.
  const timings = loadTimings();
  const rendered = {};
  for (const id of ids) {
    console.log(`\nSynthesising ${id}`);
    const {frames, files} = await synthesiseReel(id);
    timings[id] = frames;
    rendered[id] = files;
  }
  saveTimings(timings);

  // Rebuild every frame number in data/ from the real voice.
  console.log('\nRe-timing visuals to the synthesised voice:');
  const reels = buildAll(timings);

  // Pass 2: mix.
  for (const reel of reels) {
    if (!rendered[reel.id]) continue;
    console.log(`\nMixing ${reel.id}`);
    const {outPath, hasBed} = await mixReel(reel, rendered[reel.id]);
    const rel = `audio/${reel.id}.mp3`;
    const dataPath = join(ROOT, 'data', `${reel.id}.json`);
    const data = JSON.parse(readFileSync(dataPath, 'utf8'));
    data.audioSrc = rel;
    data.musicSrc = hasBed ? cfg.mix.bed : null;
    writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
    const seconds = await durationOf(outPath);
    console.log(
      `  ${rel}  ${seconds.toFixed(2)}s  bed:${hasBed ? cfg.mix.bedDb + 'dB' : 'none'}  ` +
        `normalised to ${cfg.mix.targetLufs} LUFS`
    );
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
