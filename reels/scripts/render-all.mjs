/**
 * Renders every reel in data/ — one JSON file in, one MP4 out.
 *
 *   node scripts/render-all.mjs                 all reels
 *   node scripts/render-all.mjs map-sports-...  one reel by id
 *
 * The composition is chosen by the JSON's `kind`, so adding a reel means
 * adding a JSON file and nothing else.
 */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readdirSync, readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const COMPOSITION = {
  map: 'MapWalkthrough',
  chart: 'ChartWalkthrough',
};

const main = async () => {
  const only = process.argv[2];
  const dataDir = join(ROOT, 'data');
  const outDir = join(ROOT, 'out');
  const propsDir = join(ROOT, 'out/props');
  mkdirSync(outDir, {recursive: true});
  mkdirSync(propsDir, {recursive: true});

  const files = readdirSync(dataDir).filter(
    (f) => f.endsWith('.json') && f !== 'narration-timings.json'
  );

  for (const file of files) {
    const data = JSON.parse(readFileSync(join(dataDir, file), 'utf8'));
    if (only && data.id !== only) continue;
    const composition = COMPOSITION[data.kind];
    if (!composition) {
      console.error(`Skipping ${file}: unknown kind "${data.kind}"`);
      continue;
    }
    // Remotion reads props from a file so long JSON never hits the shell.
    const propsPath = join(propsDir, `${data.id}.json`);
    writeFileSync(propsPath, JSON.stringify(data));
    const out = join(outDir, `${data.id}.mp4`);
    const started = Date.now();
    console.log(`Rendering ${data.id} (${composition}, ${data.durationInFrames} frames)…`);
    await run(
      'npx',
      [
        'remotion', 'render', 'src/index.ts', composition, out,
        '--props', propsPath,
        '--log', 'error',
      ],
      {cwd: ROOT, maxBuffer: 64 * 1024 * 1024}
    );
    console.log(`  -> ${out}  (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }
};

main().catch((err) => {
  console.error(err.stderr ?? err);
  process.exit(1);
});
