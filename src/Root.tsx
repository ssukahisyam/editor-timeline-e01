import React from 'react';
import {Composition} from 'remotion';
import scenesJson from './data/scenes.json';
import {Video} from './Video';
import {FontGate} from './fonts';

const FPS = 30;
const Main: React.FC = () => (
  <FontGate>
    <Video />
  </FontGate>
);

export const Root: React.FC = () => (
  <Composition id="E01" component={Main} width={1920} height={1080} fps={FPS} durationInFrames={Math.ceil((scenesJson as any).total * FPS)} />
);
