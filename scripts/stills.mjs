import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'fs';
const [,, listArg, scaleArg='0.4', outDir='out/st'] = process.argv;
const frames = listArg.split(',').map(Number);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: 'src/index.ts', webpackOverride: c => c});
const browserExecutable = '/usr/bin/google-chrome';
const comp = await selectComposition({serveUrl, id: 'E01', browserExecutable});
for (const f of frames) {
  await renderStill({composition: comp, serveUrl, frame: f, output: `${outDir}/f_${f}.png`, scale: Number(scaleArg), browserExecutable, chromiumOptions: {gl: 'swangle'}});
}
console.log('ok', frames.length);
