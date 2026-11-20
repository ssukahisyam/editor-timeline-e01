import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/anton/index.css';
import '@fontsource/special-elite/index.css';
import '@fontsource/oswald/700.css';
import '@fontsource/playfair-display/900.css';
import './editor.css';
import {App} from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
