import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { build, type Plugin, type Rolldown } from 'vite';
import { defineConfig } from 'vitest/config';

// `virtual:react-sandbox`: React and ReactDOM bundled as the text of one
// script, for the frame where React exercises run. Development build: its
// warnings (missing keys…) are part of the lesson.
function reactSandbox(): Plugin {
  const id = '\0virtual:react-sandbox';
  let text: Promise<string> | undefined;
  const bundle = async () => {
    const out = await build({
      configFile: false,
      logLevel: 'silent',
      mode: 'development',
      define: { 'process.env.NODE_ENV': '"development"' },
      build: { write: false, minify: true, lib: { entry: `${import.meta.dirname}/src/toolkits/code/engine/reactSandbox.js`, formats: ['iife'], name: '__react' } },
    });
    const { output } = (Array.isArray(out) ? out[0] : out) as Rolldown.RolldownOutput;
    return output[0].code;
  };
  return {
    name: 'react-sandbox',
    resolveId: (source) => (source === 'virtual:react-sandbox' ? id : undefined),
    async load(source) {
      if (source !== id) return;
      text ??= bundle();
      return `export default ${JSON.stringify(await text)};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), reactSandbox()],
  build: { chunkSizeWarningLimit: 1100 },
  worker: { format: 'es' },
  // Some exercise tests measure time: a busy CI runner may need another try.
  test: {
    // Some read whole keyboards or pieces: slow when the machine is busy.
    testTimeout: 30_000, environment: 'happy-dom', retry: process.env.CI ? 2 : 0 },
  server: {
    proxy: {
      '/api': { target: process.env.API_TARGET ?? 'http://localhost:3014', changeOrigin: true },
    },
  },
});
