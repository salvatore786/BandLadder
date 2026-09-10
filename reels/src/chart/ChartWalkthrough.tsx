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
import {ACCENTS, CHART_PALETTE, INK, LAYOUT} from '../brand';
import {Backdrop, type BlobSpec} from '../components/Backdrop';
import {Hook} from '../components/Hook';
import {Header} from '../components/Header';
import {Footer} from '../components/Footer';
import {Captions} from '../components/Captions';
import {Annotation} from '../components/Hand';
import {BarChart, CHART_BOX} from './BarChart';
import {FoundSoFar} from './FoundSoFar';
import {StepProgress} from './StepProgress';
import {OverviewCard} from './OverviewCard';
import {pushIn} from '../lib/motion';
import type {ChartWalkthroughProps} from '../schema';
import '../lib/fonts';


const B = CHART_PALETTE.blobs;

/** Apricot and teal blobs on the warm cream base — clearly visible, not subliminal. */
const BLOBS: BlobSpec[] = [
  {color: B.apricot, x: 0.1, y: 0.09, r: 245, seed: 'c-apricot'},
  {color: B.teal, x: 0.93, y: 0.17, r: 210, seed: 'c-teal'},
  {color: B.gold, x: 0.9, y: 0.52, r: 185, seed: 'c-gold'},
  {color: B.greyBlue, x: 0.05, y: 0.5, r: 200, seed: 'c-greyblue'},
  {color: B.apricotDeep, x: 0.22, y: 0.94, r: 230, seed: 'c-apricot2'},
  {color: B.tealSoft, x: 0.84, y: 0.92, r: 195, seed: 'c-teal2'},
];

export const ChartWalkthrough: React.FC<ChartWalkthroughProps> = (props) => {
  const frame = useCurrentFrame();
  const {width, durationInFrames} = useVideoConfig();

  const inner = width - LAYOUT.gutter * 2;
  const chartScale = inner / CHART_BOX.width;
  const stageTop = 404;
  const stageH = CHART_BOX.height * chartScale;

  const bodyStart = props.hook.durationInFrames;
  const overlap = 10;
  const shift = bodyStart - overlap;

  const overviewAt = props.overview.startFrame - shift;
  // The chart recedes as the overview arrives — overlapping, never a hard cut.
  const handoff = interpolate(
    frame,
    [props.overview.startFrame - 8, props.overview.startFrame + 10],
    [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  return (
    <AbsoluteFill style={{backgroundColor: CHART_PALETTE.base}}>
      <Backdrop
        base={CHART_PALETTE.base}
        blobs={BLOBS}
        durationInFrames={durationInFrames}
      />

      {props.audioSrc ? <Audio src={staticFile(props.audioSrc)} /> : null}

      <CameraMotionBlur shutterAngle={160} samples={2}>
        <Sequence from={0} durationInFrames={bodyStart + 2}>
          <Hook
            words={props.hook.words}
            kicker={props.hook.kicker}
            durationInFrames={props.hook.durationInFrames}
            accents={[CHART_PALETTE.bars, ACCENTS.teal, ACCENTS.orange, ACCENTS.green]}
            bands={[B.apricot, B.teal, B.gold, B.greyBlue]}
          />
        </Sequence>

        <Sequence from={shift}>
          <AbsoluteFill style={{transform: `scale(${pushIn(frame, durationInFrames)})`}}>
            <Header
              title={props.title}
              section="Task 1 · Overview"
              band={CHART_PALETTE.baseLight}
              accent={CHART_PALETTE.bars}
              subtitle={props.subtitle}
            />

            <div
              style={{
                position: 'absolute',
                left: LAYOUT.gutter,
                top: stageTop,
                width: inner,
                height: stageH,
                opacity: 1 - handoff,
                transform: `scale(${1 - handoff * 0.06}) translateY(${-handoff * 40}px)`,
              }}
            >
              <div
                style={{
                  width: CHART_BOX.width,
                  height: CHART_BOX.height,
                  transform: `scale(${chartScale})`,
                  transformOrigin: 'top left',
                }}
              >
                <BarChart
                  categories={props.categories}
                  series={props.series}
                  seriesRevealFrames={props.seriesRevealFrames.map((f) => f - shift)}
                  unit={props.unit}
                />
              </div>

              {props.annotations.map((a, i) => (
                <Annotation
                  key={i}
                  text={a.text}
                  startFrame={a.startFrame - shift}
                  durationInFrames={a.durationInFrames}
                  at={a.at}
                  pointsAt={a.pointsAt}
                  ring={a.ring}
                  place={a.place}
                  stage={{width: inner, height: stageH}}
                  seed={17 + i * 6}
                  fontSize={48}
                />
              ))}
            </div>

            {/* Final beat: the completed model overview */}
            <div
              style={{
                position: 'absolute',
                left: LAYOUT.gutter,
                top: stageTop + 40,
                width: inner,
                opacity: handoff,
                pointerEvents: 'none',
              }}
            >
              {frame >= props.overview.startFrame - 20 ? (
                <OverviewCard
                  text={props.overview.text}
                  highlight={props.overview.highlight}
                  startFrame={overviewAt}
                  width={inner}
                  eyebrow="Model overview"
                />
              ) : null}
            </div>

            <div
              style={{
                position: 'absolute',
                left: LAYOUT.gutter,
                top: stageTop + stageH + 40,
                width: inner,
              }}
            >
              <FoundSoFar tags={props.tags.map((t) => ({...t, foundFrame: t.foundFrame - shift}))} startFrame={30} width={inner} />
            </div>

            <div
              style={{
                position: 'absolute',
                left: LAYOUT.gutter,
                top: stageTop + stageH + 288,
                width: inner,
              }}
            >
              <StepProgress
                steps={props.steps.map((s) => ({...s, startFrame: s.startFrame - shift}))}
                width={inner}
              />
            </div>
          </AbsoluteFill>
        </Sequence>
      </CameraMotionBlur>

      <Captions
        cues={props.narration}
        accent={CHART_PALETTE.bars}
        maxWidth={width - LAYOUT.gutter * 2}
      />
      <Footer handle={props.footer.handle} url={props.footer.url} />
    </AbsoluteFill>
  );
};
