import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import {FontGate} from './fonts';
import {EPISODES} from './episodes';
import {Data} from './types';

const FPS = 30;

export interface MainProps {
  data: Data;
  voFile: string;
}

// Remotion mengetik props Composition sebagai Record<string, unknown>;
// di sini props divalidasi sekali menjadi MainProps.
const Main: React.FC<Record<string, unknown>> = (props) => {
  const {data, voFile} = props as unknown as MainProps;
  return (
    <FontGate>
      <Video data={data} voFile={voFile} />
    </FontGate>
  );
};

export const Root: React.FC = () => (
  <>
    {EPISODES.map((ep) => (
      <Composition
        key={ep.id}
        id={ep.code}
        component={Main}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={Math.ceil(ep.data.total * FPS)}
        defaultProps={{data: ep.data, voFile: ep.voFile}}
      />
    ))}
  </>
);
