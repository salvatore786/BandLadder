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
import chartData from "../data/writing-internet-access.json";

/**
 * Length always comes from the reel's own JSON, so dropping a longer script in
 * `data/` is all it takes to change the runtime.
 */
const durationFromProps = ({ props }: { props: { durationInFrames: number } }) => ({
  durationInFrames: props.durationInFrames,
});

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="MapWalkthrough"
      component={MapWalkthrough}
      schema={mapWalkthroughSchema}
      defaultProps={mapData as MapWalkthroughProps}
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
      defaultProps={chartData as ChartWalkthroughProps}
      calculateMetadata={durationFromProps}
      durationInFrames={chartData.durationInFrames}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
    />
  </>
);
