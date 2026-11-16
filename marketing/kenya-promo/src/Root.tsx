import React from 'react';
import { Composition } from 'remotion';
import { Promo } from './Promo';
import { DURATION, FPS } from './script';

export const RemotionRoot: React.FC = () => (
  <Composition id="KenyaPromo" component={Promo} durationInFrames={DURATION * FPS} fps={FPS} width={1080} height={1920} />
);
