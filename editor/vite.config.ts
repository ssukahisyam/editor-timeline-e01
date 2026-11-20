import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
// @ts-expect-error berkas .mjs tanpa deklarasi tipe
import {editorServerPlugin} from '../server/editor-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');

export default defineConfig({
  root: here,
  // Berkas media (vo.mp3, scenes/, textures/) dilayani dari public/ proyek,
  // supaya staticFile() Remotion ('/vo.mp3', '/scenes/01.png', ...) bekerja apa adanya.
  publicDir: path.join(projectRoot, 'public'),
  plugins: [react(), editorServerPlugin(projectRoot)],
  server: {port: 5173, host: '127.0.0.1'},
});
