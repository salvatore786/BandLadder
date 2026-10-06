import React from "react";
import { Composition } from "remotion";
import { VIDEO } from "./brand";
import {
  chartWalkthroughSchema,
  mapWalkthroughSchema,
  type ChartWalkthroughProps,
  type MapWalkthroughProps,
} from "./schemas";
import { MapWalkthrough } from "./compositions/MapWalkthrough/MapWalkthrough";
import { ChartWalkthrough } from "./compositions/ChartWalkthrough/ChartWalkthrough";
import mapData from "../data/listening-sports-complex.json";
import mapAudio from "../data/listening-sports-complex.audio.json";
import chartData from "../data/writing-internet-access.json";
import chartAudio from "../data/writing-internet-access.audio.json";

/**
 * Length always comes from the reel's own JSON, so dropping a longer script in
 * `data/` is all it takes to change the runtime.
 */
const durationFromProps = ({ props }: { props: { durationInFrames: number } }) => ({
  durationInFrames: props.durationInFrames,
});

/**
 * A reel's props are its hand-authored JSON plus whatever the audio build
 * produced for it: the narration track and the word timings the captions run
 * off. Keeping them in separate files means a rebuild of the voice never
 * touches the content, and the content is never hand-edited to match the voice.
 */
const withNarration = <T,>(content: T, audio: { audioSrc: string; captions: unknown[] }): T =>
  ({ ...content, audioSrc: audio.audioSrc, captions: audio.captions }) as T;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="MapWalkthrough"
      component={MapWalkthrough}
      schema={mapWalkthroughSchema}
      defaultProps={withNarration(mapData, mapAudio) as MapWalkthroughProps}
      calculateMetadata={durationFromProps}
      durationInFrames={mapData.durationInFrames}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
    />
    <Composition
      id="ChartWalkthrough"
      component={ChartWalkthrough}
      schema={chartWalkthroughSchema}
      defaultProps={withNarration(chartData, chartAudio) as ChartWalkthroughProps}
      calculateMetadata={durationFromProps}
      durationInFrames={chartData.durationInFrames}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
    />
  </>
);
