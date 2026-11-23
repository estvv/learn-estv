import { program } from './bundle';
import { compile, isWeb, prepare, type Compiled, type File, type TypeCheck } from './compile';
import domTools from './domTools.js?raw';
import harness from './harness.js?raw';

// Runs an exercise in the test process instead of a worker or a frame (tests only).
export async function runInTest(files: File[], tests: string[], types: TypeCheck[] = [], setup = '') {
  await prepare(files);
  const compiled: Compiled = compile(files, tests, types);
  const results: ({ ok: boolean; error?: string } | undefined)[] = tests.map(() => undefined);
  const logs: string[] = [];
  let crash: string | null = compiled.diagnostics.find((d) => d.syntax)?.message ?? null;
  if (crash === null) {
    const send = (m: { type: string; id: number; ok: boolean; error?: string; text: string; phase: string; message: string }) => {
      if (m.type === 'test') results[m.id] = { ok: m.ok, error: m.error };
      if (m.type === 'log') logs.push(m.text);
      if (m.type === 'error' && m.phase === 'main') crash = m.message;
    };
    const h = new Function(`${harness}\nreturn __createHarness;`)()(send);
    const globals: Record<string, unknown> = { ...h.globals };
    let options = '';
    if (isWeb(files)) {
      const externals = files.some((f) => /\.[jt]sx$/.test(f.name)) ? await reactModules() : {};
      const tools = new Function(`${domTools}\nreturn __createDomTools;`)()(externals);
      Object.assign(globals, tools, { __externals: externals });
      options = 'externals: __externals, stay: true';
      document.body.innerHTML = files.filter((f) => f.name.endsWith('.html')).map((f) => f.code).join('\n');
      document.head.innerHTML = `<style>${files.filter((f) => f.name.endsWith('.css')).map((f) => f.code).join('\n')}</style>`;
      localStorage.clear();
      sessionStorage.clear();
    }
    const { text } = program(compiled, `${setup}\nreturn __run`, options);
    await new Function('__run', ...Object.keys(globals), text)(h.run, ...Object.values(globals));
  }
  return { tests: results, types: compiled.types, diagnostics: compiled.diagnostics, crash, logs };
}

async function reactModules() {
  const [react, dom, client, jsx] = await Promise.all([import('react'), import('react-dom'), import('react-dom/client'), import('react/jsx-runtime')]);
  return { react: react.default ?? react, 'react-dom': dom.default ?? dom, 'react-dom/client': client.default ?? client, 'react/jsx-runtime': (jsx as { default?: unknown }).default ?? jsx };
}
