import React from 'react';
import {continueRender, delayRender} from 'remotion';
import '@fontsource/anton/index.css';
import '@fontsource/special-elite/index.css';
import '@fontsource/oswald/700.css';
import '@fontsource/playfair-display/900.css';

export const FontGate: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [handle] = React.useState(() => delayRender('fonts'));
  React.useEffect(() => {
    Promise.all([
      document.fonts.load("96px Anton"),
      document.fonts.load("48px 'Special Elite'"),
      document.fonts.load("700 48px Oswald"),
      document.fonts.load("900 48px 'Playfair Display'"),
    ]).catch(() => {}).finally(() => continueRender(handle));
  }, [handle]);
  return <>{children}</>;
};
