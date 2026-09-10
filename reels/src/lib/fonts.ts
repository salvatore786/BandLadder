import {continueRender, delayRender, staticFile} from 'remotion';
import {FONTS} from '../brand';

/**
 * Fonts are self-hosted from public/fonts rather than fetched from Google at
 * render time — the render sandbox has no trusted route to fonts.gstatic.com,
 * and a missing font silently changes every measured layout.
 */
const FACES: {family: string; weight: number; file: string}[] = [
  {family: FONTS.display, weight: 500, file: 'Fredoka-500.woff2'},
  {family: FONTS.display, weight: 600, file: 'Fredoka-600.woff2'},
  {family: FONTS.body, weight: 400, file: 'Poppins-400.woff2'},
  {family: FONTS.body, weight: 500, file: 'Poppins-500.woff2'},
  {family: FONTS.body, weight: 600, file: 'Poppins-600.woff2'},
  {family: FONTS.hand, weight: 600, file: 'Caveat-600.woff2'},
  {family: FONTS.mono, weight: 400, file: 'IBMPlexMono-400.woff2'},
  {family: FONTS.mono, weight: 500, file: 'IBMPlexMono-500.woff2'},
];

let started = false;

export const loadFonts = () => {
  if (started || typeof document === 'undefined') return;
  started = true;

  const handle = delayRender('Loading self-hosted fonts');
  const style = document.createElement('style');
  style.textContent = FACES.map(
    (f) => `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};font-display:block;src:url(${staticFile(
      'fonts/' + f.file
    )}) format('woff2');}`
  ).join('\n');
  document.head.appendChild(style);

  Promise.all(
    FACES.map((f) => document.fonts.load(`${f.weight} 40px '${f.family}'`))
  )
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
};

loadFonts();
