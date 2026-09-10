import React from 'react';
import {Composition} from 'remotion';
import {CANVAS} from './brand';
import {
  mapWalkthroughSchema,
  chartWalkthroughSchema,
  type MapWalkthroughProps,
  type ChartWalkthroughProps,
} from './schema';
import {MapWalkthrough} from './map/MapWalkthrough';
import {ChartWalkthrough} from './chart/ChartWalkthrough';
import mapData from '../data/map-sports-complex.json';
import chartData from '../data/chart-internet-access.json';

/**
 * A new reel is a new JSON file in data/ and nothing else — the props are the
 * whole content model, validated by zod at edit time and render time.
 */
export const RemotionRoot: React.FC = () => {
  const mapProps = mapWalkthroughSchema.parse(mapData);
  const chartProps = chartWalkthroughSchema.parse(chartData);

  return (
    <>
      <Composition
        id="MapWalkthrough"
        component={MapWalkthrough}
        schema={mapWalkthroughSchema}
        defaultProps={mapProps}
        width={CANVAS.width}
        height={CANVAS.height}
        fps={CANVAS.fps}
        durationInFrames={mapProps.durationInFrames}
        calculateMetadata={({props}: {props: MapWalkthroughProps}) => ({
          durationInFrames: props.durationInFrames,
        })}
      />
      <Composition
        id="ChartWalkthrough"
        component={ChartWalkthrough}
        schema={chartWalkthroughSchema}
        defaultProps={chartProps}
        width={CANVAS.width}
        height={CANVAS.height}
        fps={CANVAS.fps}
        durationInFrames={chartProps.durationInFrames}
        calculateMetadata={({props}: {props: ChartWalkthroughProps}) => ({
          durationInFrames: props.durationInFrames,
        })}
      />
    </>
  );
};
