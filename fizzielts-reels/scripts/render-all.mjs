/**
 * Batch-render every reel in data/ to out/.
 *
 *   npm run render:all              all of them
 *   npm run render:all -- writing   only files matching "writing"
 *
 * The project bundles once and every reel is rendered from that bundle, so
 * adding a reel costs a render, not a rebuild.
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readdir, readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const OUT = path.join(ROOT, "out");

// Solo licence.
const LICENSE_KEY = "free-license";

const filter = process.argv[2] ?? "";

const files = (await readdir(DATA))
  .filter((f) => f.endsWith(".json"))
  .filter((f) => f.includes(filter));

if (files.length === 0) {
  console.error(`No reels in data/${filter ? ` matching "${filter}"` : ""}.`);
  process.exit(1);
}

await mkdir(OUT, { recursive: true });

console.log(`Bundling once for ${files.length} reel(s)...`);
const serveUrl = await bundle({
  entryPoint: path.join(ROOT, "src", "index.ts"),
  onProgress: (p) => process.stdout.write(`\rBundling ${p}%`),
});
process.stdout.write("\n");

let failures = 0;

for (const file of files) {
  const inputProps = JSON.parse(await readFile(path.join(DATA, file), "utf-8"));
  const id = inputProps.composition;

  if (!id) {
    console.error(`  ${file}: no "composition" field — skipping.`);
    failures++;
    continue;
  }

  const outputLocation = path.join(OUT, file.replace(/\.json$/, ".mp4"));

  try {
    const composition = await selectComposition({
      serveUrl,
      id,
      inputProps,
      licenseKey: LICENSE_KEY,
    });

    const seconds = (composition.durationInFrames / composition.fps).toFixed(1);
    console.log(`\n${file} -> ${id} (${seconds}s)`);

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation,
      inputProps,
      licenseKey: LICENSE_KEY,
      // three.js is not used here, but a software GL keeps CI/headless boxes happy.
      chromiumOptions: {
        gl: process.platform === "linux" ? "swangle" : "angle",
      },
      onProgress: ({ progress }) =>
        process.stdout.write(`\r  rendering ${Math.round(progress * 100)}%`),
    });

    process.stdout.write(`\r  done -> out/${path.basename(outputLocation)}\n`);
  } catch (err) {
    failures++;
    console.error(`\n  ${file} FAILED: ${err instanceof Error ? err.message : err}`);
  }
}

console.log(
  failures === 0
    ? `\nRendered ${files.length} reel(s) to out/.`
    : `\nRendered ${files.length - failures} of ${files.length}; ${failures} failed.`
);
process.exit(failures === 0 ? 0 : 1);
