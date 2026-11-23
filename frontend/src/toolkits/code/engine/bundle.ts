import type { Compiled } from './compile';
import domTools from './domTools.js?raw';
import frame from './frame.js?raw';
import harness from './harness.js?raw';
import sandbox from './sandbox.js?raw';

// The whole program as one script: a worker's: no eval and no dynamic import, so
// it runs under the site's CSP (worker-src blob:).

export interface Bundle {
  script: string;
  // Student file and line of a line of the script, when there is one.
  locate(line: number): { file: string; line: number } | null;
}

const countLines = (s: string) => s.split('\n').length - 1;

export function program(compiled: Compiled, prefix: string, options = ''): { text: string; locate: Bundle['locate'] } {
  let text = prefix;
  const ranges: { start: number; name: string; lines: number[] }[] = [];
  text += '({ modules: {\n';
  for (const m of compiled.modules) {
    text += `${JSON.stringify(m.name)}: { deps: ${JSON.stringify(m.deps)}, fn: async function (exports, require, module, $test) {\n`;
    ranges.push({ start: countLines(text) + 1, name: m.name, lines: m.lines });
    text += `${m.js}\n} },\n`;
  }
  text += `}, main: ${JSON.stringify(compiled.main)}, source: ${JSON.stringify(compiled.source)}, ${options} });\n`;
  return {
    text,
    locate(line) {
      const r = ranges.find((x) => line >= x.start && line < x.start + x.lines.length);
      const at = r && r.lines[line - r.start];
      return r && at ? { file: r.name, line: at } : null;
    },
  };
}

export function bundle(compiled: Compiled, setup: string): Bundle {
  const prefix = `${harness}\n${sandbox}\n{\n${setup}\n}\n__harness.run`;
  const { text, locate } = program(compiled, prefix);
  return { script: text, locate };
}

// Same for the frame of web exercises. Outside of tests, the component a React
// exercise exports by default is shown in #root.
export function frameBundle(compiled: Compiled, setup: string, testing: boolean): Bundle {
  const show = `(exports) => {
  const root = document.getElementById('root');
  const x = window.__externals;
  if (x && root && typeof exports.default === 'function') x['react-dom/client'].createRoot(root).render(x.react.createElement(exports.default));
}`;
  const prefix = `const __testing = ${testing};\n${harness}\n${domTools}\n${frame}\n{\n${setup}\n}\n__harness.run`;
  const { text, locate } = program(compiled, prefix, `externals: window.__externals || {}, stay: true${testing ? '' : `, afterMain: ${show}`}`);
  // A scope of its own: the next script of the page must not clash.
  return { script: `{${text}}\n//# sourceURL=sandbox-run.js`, locate };
}
