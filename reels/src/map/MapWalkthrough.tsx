import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {
  ACCENT_CYCLE,
  ACCENTS,
  INK,
  LAYOUT,
  MAP_PALETTE,
  MOTION,
} from '../brand';
import {Backdrop, type BlobSpec} from '../components/Backdrop';
import {Hook} from '../components/Hook';
import {Header} from '../components/Header';
import {Footer} from '../components/Footer';
import {Captions} from '../components/Captions';
import {Tooltip} from '../components/Tooltip';
import {Annotation} from '../components/Hand';
import {BeatSweep} from '../components/BeatSweep';
import {SportsComplexPlan} from './SportsComplexPlan';
import {AnswerList} from './AnswerList';
import {PLAN, type SlotId} from './planGeometry';
import {pushIn, beatStep} from '../lib/motion';
import {wordBeats} from '../lib/text';
import type {MapWalkthroughProps} from '../schema';
import '../lib/fonts';


const B = MAP_PALETTE.blobs;

/** Six clearly visible pastel blobs on the white base — roughly a fifth of the frame. */
const BLOBS: BlobSpec[] = [
  {color: B.cyan, x: 0.12, y: 0.1, r: 240, seed: 'm-cyan'},
  {color: B.peach, x: 0.92, y: 0.2, r: 215, seed: 'm-peach'},
  {color: B.blue, x: 0.86, y: 0.55, r: 190, seed: 'm-blue'},
  {color: B.lime, x: 0.06, y: 0.52, r: 200, seed: 'm-lime'},
  {color: B.green, x: 0.24, y: 0.93, r: 235, seed: 'm-green'},
  {color: B.sage, x: 0.8, y: 0.9, r: 205, seed: 'm-sage'},
];

export const MapWalkthrough: React.FC<MapWalkthroughProps> = (props) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames, fps} = useVideoConfig();

  const stageW = 800;
  const stageLeft = (width - stageW) / 2;
  const stageH = (stageW * PLAN.viewBox.height) / PLAN.viewBox.width;
  const stageTop = 400;

  const labels: Partial<Record<SlotId, string>> = {};
  for (const l of props.labels) labels[l.slot] = l.label;

  const highlights = props.answers
    .filter((a) => !a.practice)
    .map((a, i) => ({
      slot: a.slot as SlotId,
      at: a.revealFrame,
      color: ACCENT_CYCLE[i % ACCENT_CYCLE.length],
    }))
    .filter((h) => frame >= h.at);

  // Every narration line, answer reveal, tooltip and annotation is a beat.
  const cueBeats = props.narration.map((c) => c.startFrame);
  const structuralBeats = [
    ...props.answers.filter((a) => !a.practice).map((a) => a.revealFrame),
    props.practiceFrame,
    ...props.tooltips.map((t) => t.startFrame),
    ...props.narration.filter((c) => c.emphasis).map((c) => c.startFrame),
  ].sort((a, b) => a - b);
  // Two layers of accent. Every spoken word gives the frame a small punch —
  // that is roughly one visible movement every 0.4s, matching the narration's
  // own cadence — and the structural beats give it a much bigger one.
  const step = beatStep({
    frame,
    fps,
    beats: wordBeats(props.narration, 15),
    travel: 21,
    scaleAmount: 0.015,
    durationInFrames: 7,
  });
  // A larger, slower reframe on each narration line and structural beat —
  // one sustained move rather than a there-and-back pulse.
  const reframe = beatStep({
    frame,
    fps,
    beats: [...new Set([
      ...cueBeats,
      ...structuralBeats,
      ...props.annotations.map((a) => a.startFrame),
    ])].sort((a, b) => a - b),
    travel: 28,
    scaleAmount: 0.024,
    durationInFrames: 27,
  });

  const bodyStart = props.hook.durationInFrames;
  // The body begins BEFORE the hook has finished lifting away, so the frame
  // never comes to a full stop between beats.
  const overlap = 10;

  return (
    <AbsoluteFill style={{backgroundColor: MAP_PALETTE.base}}>
      <Backdrop base={MAP_PALETTE.base} blobs={BLOBS} durationInFrames={durationInFrames} />

      {props.audioSrc ? <Audio src={staticFile(props.audioSrc)} /> : null}

      <BeatSweep
        beats={[...new Set([...cueBeats, ...structuralBeats])].sort(
          (a, b) => a - b
        )}
        colors={[B.cyan, B.peach, B.lime, B.blue, B.green]}
        durationInFrames={42}
      />

      <CameraMotionBlur shutterAngle={160} samples={2}>
        <Sequence from={0} durationInFrames={bodyStart + 2}>
          <Hook
            words={props.hook.words}
            kicker={props.hook.kicker}
            durationInFrames={props.hook.durationInFrames}
            accents={[ACCENTS.purple, ACCENTS.green, ACCENTS.orange, ACCENTS.blue]}
            bands={[B.cyan, B.peach, B.lime, B.blue]}
          />
        </Sequence>

        <Sequence from={bodyStart - overlap}>
          <AbsoluteFill
            style={{
              transform: `translate(${step.x + reframe.x}px, ${step.y + reframe.y}px) scale(${
                pushIn(frame, durationInFrames) * step.scale * reframe.scale * 1.03
              })`,
            }}
          >
            <Header
              title={props.title}
              section="Walkthrough"
              sectionAlt="Practice"
              switchFrame={props.practiceFrame - (bodyStart - overlap)}
              band={B.peach}
              accent={ACCENTS.purple}
              subtitle={props.subtitle}
            />

            <div
              style={{
                position: 'absolute',
                left: stageLeft,
                top: stageTop,
                width: stageW,
                height: stageH,
              }}
            >
              <SportsComplexPlan
                labels={labels}
                drawFrame={4}
                highlights={highlights.map((h) => ({
                  ...h,
                  at: h.at - (bodyStart - overlap),
                }))}
                planCaption={props.planCaption}
              />

              {props.tooltips.map((t, i) => (
                <Tooltip
                  key={i}
                  text={t.text}
                  startFrame={t.startFrame - (bodyStart - overlap)}
                  durationInFrames={t.durationInFrames}
                  at={t.at}
                  stage={{width: stageW, height: stageH}}
                />
              ))}

              {props.annotations.map((a, i) => (
                <Annotation
                  key={i}
                  text={a.text}
                  startFrame={a.startFrame - (bodyStart - overlap)}
                  durationInFrames={a.durationInFrames}
                  at={a.at}
                  pointsAt={a.pointsAt}
                  ring={a.ring}
                  place={a.place}
                  stage={{width: stageW, height: stageH}}
                  seed={7 + i * 5}
                  fontSize={46}
                />
              ))}
            </div>

            <div
              style={{
                position: 'absolute',
                left: LAYOUT.gutter,
                top: stageTop + stageH + 30,
                width: width - LAYOUT.gutter * 2,
              }}
            >
              <AnswerList
                answers={props.answers.map((a) => ({
                  ...a,
                  revealFrame: a.revealFrame - (bodyStart - overlap),
                }))}
                panelFrame={26}
                width={width - LAYOUT.gutter * 2}
              />
            </div>
          </AbsoluteFill>
        </Sequence>
      </CameraMotionBlur>

      <Captions
        cues={props.narration}
        accent={ACCENTS.purple}
        maxWidth={width - LAYOUT.gutter * 2}
      />
      <Footer handle={props.footer.handle} url={props.footer.url} />
    </AbsoluteFill>
  );
};
