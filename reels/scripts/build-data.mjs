/**
 * Authoring tool. Turns a compact narration script into the fully-timed JSON
 * in data/. Every frame number in a reel — caption timing, answer reveals,
 * annotations, step changes — is derived from this ONE script, so the voice,
 * the captions and the visuals cannot drift apart.
 *
 *   node scripts/build-data.mjs
 */
import {writeFileSync, mkdirSync, existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const FPS = 30;
/** Brisk, upbeat teacher: ~165 wpm. */
const FRAMES_PER_WORD = 10.9;
/** Ordinary breath between cues. */
const GAP = 4;
/** The deliberate half-second of silence before an answer reveal. */
const REVEAL_GAP = 15;
const LEAD_IN = 4;
const TAIL = 22;

const words = (t) => t.split(/\s+/).filter(Boolean).length;

/**
 * Lay a script out on the timeline and return timed cues plus named marks.
 * `measured` is an optional array of real per-cue frame lengths from the TTS
 * render — when present the layout uses those instead of the word-rate
 * estimate, so the captions land exactly on the spoken words.
 */
const layout = (lines, measured) => {
  let cursor = LEAD_IN;
  const cues = [];
  const mark = {};
  for (const line of lines) {
    const gap = line.emphasis ? REVEAL_GAP : GAP;
    if (cues.length) cursor += gap;
    const estimate = Math.round(words(line.text) * FRAMES_PER_WORD);
    const duration = Math.max(24, measured?.[cues.length] ?? estimate);
    const cue = {
      text: line.text,
      startFrame: cursor,
      durationInFrames: duration,
      emphasis: Boolean(line.emphasis),
      muteBed: Boolean(line.muteBed),
    };
    if (line.mark) mark[line.mark] = cursor;
    cues.push(cue);
    cursor += duration;
  }
  return {cues, mark, end: cursor, durationInFrames: cursor + TAIL};
};

const coverage = (cues, total) =>
  cues.reduce((a, c) => a + c.durationInFrames, 0) / total;

// ---------------------------------------------------------------- map reel

const mapScript = [
  {text: 'Map questions look impossible until you learn this one habit.', mark: 'open'},
  {text: 'Find the entrance first. Every single description starts from there.', mark: 'entrance'},
  {text: 'Question one, reception. Listen for the word left.', mark: 'q1'},
  {text: 'Reception. Immediately on your left as you enter.', emphasis: true, mark: 'a1'},
  {text: 'Question two, the swimming pool. Far end, right hand side.', mark: 'q2'},
  {text: 'Far end means the top of the plan.', emphasis: true, mark: 'a2'},
  {text: 'Question three, the gym. Opposite the pool.', mark: 'q3'},
  {text: 'Opposite means straight across the corridor, so top left.', emphasis: true, mark: 'a3'},
  {text: 'Question four, the cafe. Between reception and the changing rooms.', mark: 'q4'},
  {text: 'Between. So it has to be the middle room.', emphasis: true, mark: 'a4'},
  {text: 'Your turn now. Two rooms left on the plan.', mark: 'practice'},
  {text: 'Where do the changing rooms go? And the sports hall?', mark: 'practiceQ', muteBed: true},
  {text: 'Pause the video and mark them on your own plan.', mark: 'pause'},
  {text: 'Answers are in the comments. Follow for one every day.', mark: 'cta'},
];

const buildMap = (measured) => {
  const map = layout(mapScript, measured);
  return {map, reel: mapReelFrom(map)};
};

const mapReelFrom = (map) => (

{
  kind: 'map',
  id: 'map-sports-complex',
  durationInFrames: map.durationInFrames,
  title: 'Listening: plan labelling',
  subtitle: 'the entrance decides everything',
  planCaption: 'SPORTS COMPLEX',
  hook: {
    words: ['MAP', 'QUESTIONS', 'MADE', 'EASY'],
    kicker: 'IELTS Listening · Section 2',
    durationInFrames: 78,
  },
  labels: [
    {id: 'gym', label: 'Gym', slot: 'topLeft'},
    {id: 'pool', label: 'Swimming pool', slot: 'topRight'},
    {id: 'changing', label: 'Changing rooms', slot: 'midLeft'},
    {id: 'hall', label: 'Sports hall', slot: 'midRight'},
    {id: 'cafe', label: 'Café', slot: 'lowLeft'},
    {id: 'courts', label: 'Outdoor courts', slot: 'lowRight'},
    {id: 'reception', label: 'Reception', slot: 'baseLeft'},
  ],
  answers: [
    {number: 1, prompt: 'Reception', answer: 'bottom left', slot: 'baseLeft', revealFrame: map.mark.a1, practice: false},
    {number: 2, prompt: 'Swimming pool', answer: 'top right', slot: 'topRight', revealFrame: map.mark.a2, practice: false},
    {number: 3, prompt: 'Gym', answer: 'top left', slot: 'topLeft', revealFrame: map.mark.a3, practice: false},
    {number: 4, prompt: 'Café', answer: 'middle left', slot: 'lowLeft', revealFrame: map.mark.a4, practice: false},
    {number: 5, prompt: 'Changing rooms', answer: '', slot: 'midLeft', revealFrame: map.durationInFrames, practice: true},
    {number: 6, prompt: 'Sports hall', answer: '', slot: 'midRight', revealFrame: map.durationInFrames, practice: true},
  ],
  tooltips: [
    {text: 'Start at the entrance — always.', startFrame: map.mark.entrance + 4, durationInFrames: 46, at: {x: 0.5, y: 0.55}},
    {text: 'Wait for the correction.', startFrame: map.mark.q2 + 10, durationInFrames: 76, at: {x: 0.5, y: 0.13}},
    {text: 'Answers are in the comments.', startFrame: map.mark.pause + 6, durationInFrames: 96, at: {x: 0.5, y: 0.5}},
  ],
  annotations: [
    {text: 'start here', startFrame: map.mark.entrance + 54, durationInFrames: 58, at: {x: 0.74, y: 0.945}, place: 'below', pointsAt: {x: 0.52, y: 0.955}},
    {text: 'straight across', startFrame: map.mark.a3 + 6, durationInFrames: 74, at: {x: 0.5, y: 0.255}, pointsAt: {x: 0.28, y: 0.34}},
    {text: 'the middle one', startFrame: map.mark.a4 + 6, durationInFrames: 74, at: {x: 0.74, y: 0.62}, ring: {x: 0.04, y: 0.58, w: 0.42, h: 0.17}},
  ],
  practiceFrame: map.mark.practice,
  narration: map.cues,
  footer: {handle: '@fizzielts', url: 'fizzielts.com'},
  audioSrc: null,
  musicSrc: null,
});

// -------------------------------------------------------------- chart reel

const chartScript = [
  {text: 'Task one overview? This is where most bands are lost.', mark: 'open'},
  {text: 'Four countries, two years, internet access. Do not list everything.', mark: 'setup'},
  {text: 'Step one. What changed? Every country went up.', mark: 'step1'},
  {text: 'Up in all four. That is your first sentence.', emphasis: true, mark: 'up'},
  {text: 'Step two. Largest and smallest change.', mark: 'step2'},
  {text: 'Brazil jumped fifty points. The UK only twenty three.', emphasis: true, mark: 'largest'},
  {text: 'So the developing economies grew fastest. That is a pattern.', mark: 'pattern'},
  {text: 'India stayed lowest throughout. The UK stayed highest.', emphasis: true, mark: 'smallest'},
  {text: 'Step three. Put the pattern into one overview sentence.', mark: 'step3'},
  {text: 'No numbers in the overview. Numbers belong in the body.', mark: 'nonumbers'},
  {text: 'Overall, access increased in every country over the decade.', emphasis: true, mark: 'overview'},
  {text: 'With the sharpest growth in the developing economies.', mark: 'overview2'},
  {text: 'Leaders stayed leaders. India stayed the lowest.', mark: 'overview3'},
  {text: 'Save this. Follow fizzIELTS for a task one every day.', mark: 'cta'},
];

const buildChart = (measured) => {
  const chart = layout(chartScript, measured);
  return {chart, reel: chartReelFrom(chart)};
};

const chartReelFrom = (chart) => (

{
  kind: 'chart',
  id: 'chart-internet-access',
  durationInFrames: chart.durationInFrames,
  title: 'Writing Task 1: the overview',
  subtitle: 'three steps, no numbers',
  hook: {
    words: ['WRITE', 'THE', 'OVERVIEW', 'FIRST'],
    kicker: 'IELTS Writing · Task 1',
    durationInFrames: 78,
  },
  unit: '%',
  categories: ['UK', 'Japan', 'Brazil', 'India'],
  series: [
    {label: '2010', values: [73, 68, 31, 8]},
    {label: '2020', values: [96, 93, 81, 43]},
  ],
  seriesRevealFrames: [chart.mark.open + 6, chart.mark.setup + 6],
  steps: [
    {label: 'the changes', startFrame: chart.mark.step1},
    {label: 'largest and smallest', startFrame: chart.mark.step2},
    {label: 'overview', startFrame: chart.mark.step3},
  ],
  focus: [
    {categoryIndex: 0, startFrame: chart.mark.setup},
    {categoryIndex: 1, startFrame: chart.mark.step1},
    {categoryIndex: 3, startFrame: chart.mark.up},
    {categoryIndex: 2, startFrame: chart.mark.step2},
    {categoryIndex: 0, startFrame: chart.mark.pattern},
    {categoryIndex: 3, startFrame: chart.mark.smallest},
    {categoryIndex: 1, startFrame: chart.mark.step3},
  ],
  tags: [
    {kind: 'UP', value: 'all four', foundFrame: chart.mark.up},
    {kind: 'DOWN', value: 'none', foundFrame: chart.mark.up + 14},
    {kind: 'LARGEST', value: 'Brazil +50', foundFrame: chart.mark.largest},
    {kind: 'SMALLEST', value: 'India 43%', foundFrame: chart.mark.smallest},
  ],
  annotations: [
    {text: '5 up, 1 down? no — all up', startFrame: chart.mark.up + 4, durationInFrames: 76, at: {x: 0.32, y: 0.07}, pointsAt: {x: 0.55, y: 0.30}},
    {text: 'biggest jump', startFrame: chart.mark.largest + 4, durationInFrames: 78, at: {x: 0.28, y: 0.08}, ring: {x: 0.645, y: 0.215, w: 0.12, h: 0.71}},
    {text: 'no years? no change over time', startFrame: chart.mark.smallest + 4, durationInFrames: 78, at: {x: 0.44, y: 0.09}, pointsAt: {x: 0.90, y: 0.62}},
  ],
  overview: {
    startFrame: chart.mark.overview,
    text: 'Overall, access increased in every country over the decade, with the sharpest growth in the developing economies. The UK and Japan nevertheless remained the leaders throughout, while India stayed the lowest.',
    highlight: ['increased in every country', 'the sharpest growth', 'remained the leaders throughout', 'stayed the lowest'],
  },
  narration: chart.cues,
  footer: {handle: '@fizzielts', url: 'fizzielts.com'},
  audioSrc: null,
  musicSrc: null,
});

/** The narration script for each reel, keyed by reel id — the TTS render reads these. */
export const SCRIPTS = {
  'map-sports-complex': mapScript,
  'chart-internet-access': chartScript,
};

const TIMINGS_PATH = join(ROOT, 'data', 'narration-timings.json');

export const loadTimings = () => {
  if (!existsSync(TIMINGS_PATH)) return {};
  return JSON.parse(readFileSync(TIMINGS_PATH, 'utf8'));
};

export const saveTimings = (timings) => {
  writeFileSync(TIMINGS_PATH, JSON.stringify(timings, null, 2) + '\n');
};

/**
 * Regenerate every data/*.json from the scripts above. Pass measured per-cue
 * frame lengths to lock the visuals to the real synthesised voice.
 */
export const buildAll = (timings = loadTimings(), {quiet = false} = {}) => {
  const reels = [
    buildMap(timings['map-sports-complex']).reel,
    buildChart(timings['chart-internet-access']).reel,
  ];
  mkdirSync(join(ROOT, 'data'), {recursive: true});
  for (const reel of reels) {
    // Keep any audio already mixed for this reel.
    const path = join(ROOT, 'data', `${reel.id}.json`);
    if (existsSync(path)) {
      const prev = JSON.parse(readFileSync(path, 'utf8'));
      reel.audioSrc = prev.audioSrc ?? null;
      reel.musicSrc = prev.musicSrc ?? null;
    }
    writeFileSync(path, JSON.stringify(reel, null, 2) + '\n');
    if (!quiet) {
      const cov = coverage(reel.narration, reel.durationInFrames);
      console.log(
        `${reel.id.padEnd(24)} ${reel.durationInFrames} frames ` +
          `(${(reel.durationInFrames / FPS).toFixed(1)}s)  narration coverage ${(
            cov * 100
          ).toFixed(1)}%`
      );
    }
  }
  return reels;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  buildAll();
}
