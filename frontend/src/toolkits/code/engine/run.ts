import { bundle, frameBundle, type Bundle } from './bundle';
import { callTs } from './client';
import type { Diagnostic, File, TypeCheck } from './compile';

export interface LogLine {
  level: 'log' | 'warn' | 'error';
  text: string;
  // Index of the test that printed it, null for the student's own run.
  test: number | null;
}

export interface TestResult {
  ok: boolean;
  error?: string;
}

export interface RunResult {
  diagnostics: Diagnostic[];
  tests: TestResult[];
  types: TestResult[];
  // Why the tests did not run or finish (crash, endless loop).
  crash: string | null;
}

const TIME_LIMIT = 6000;

type Message =
  | ({ type: 'log' } & LogLine)
  | { type: 'test'; id: number; ok: boolean; error?: string; stack?: string }
  | { type: 'error'; phase: string; message: string; stack: string; test: number | null }
  | { type: 'done' };

export interface RunOptions {
  files: File[];
  tests?: string[];
  types?: TypeCheck[];
  setup?: string;
  // Where a web page shows; hidden when omitted.
  container?: HTMLElement | null;
  onLog(line: LogLine): void;
  signal?: AbortSignal;
}

export const isWebFiles = (files: { name: string }[]) => files.some((f) => /\.(html|jsx|tsx)$/.test(f.name));

interface Runner {
  onMessage(listener: (m: Message) => void): void;
  onError(listener: (message: string, line: number) => void): void;
  stop(): void;
}

function startWorker(script: string): Runner {
  const url = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }));
  const worker = new Worker(url);
  return {
    onMessage: (f) => { worker.onmessage = (e: MessageEvent<Message>) => f(e.data); },
    // The script itself does not parse or start.
    onError: (f) => { worker.onerror = (e) => { e.preventDefault(); f(e.message, e.lineno); }; },
    stop() {
      worker.terminate();
      URL.revokeObjectURL(url);
    },
  };
}

function startFrame(files: File[], scripts: string[], container: HTMLElement | null | undefined): Runner {
  const text = (ext: string) => files.filter((f) => f.name.endsWith(ext)).map((f) => f.code).join('\n');
  const react = files.some((f) => /\.[jt]sx$/.test(f.name));
  const frame = document.createElement('iframe');
  // Opaque origin: no access to the app, its cookies or its storage.
  frame.setAttribute('sandbox', 'allow-scripts allow-forms');
  frame.title = 'Aperçu';
  // On screen even when hidden: browsers slow down what is out of view.
  frame.style.cssText = container
    ? 'width:100%;height:100%;border:0;background:white'
    : 'position:fixed;right:0;bottom:0;width:800px;height:600px;border:0;opacity:0;pointer-events:none;z-index:-1';
  let listener: (m: Message) => void = () => {};
  const receive = (e: MessageEvent) => {
    if (e.source !== frame.contentWindow) return;
    const data = e.data as Message | { type: 'ready' };
    if (data.type === 'ready') {
      frame.contentWindow!.postMessage({ html: text('.html') || (react ? '<div id="root"></div>' : ''), css: text('.css'), scripts }, '*');
    } else listener(data);
  };
  window.addEventListener('message', receive);
  frame.src = '/sandbox.html';
  if (container) container.replaceChildren(frame);
  else document.body.append(frame);
  return {
    onMessage: (f) => { listener = f; },
    onError: () => {},
    stop() {
      window.removeEventListener('message', receive);
      frame.remove();
    },
  };
}

// Compiles, then runs in a throwaway worker, or a frame for web pages. Nothing
// leaves the browser. A visible page stays alive until the signal aborts.
export async function runCode({ files, tests = [], types = [], setup = '', container, onLog, signal }: RunOptions): Promise<RunResult> {
  const compiled = await callTs('compile', files, tests, types);
  const result: RunResult = {
    diagnostics: compiled.diagnostics,
    tests: tests.map(() => ({ ok: false, error: 'Pas exécuté' })),
    types: compiled.types.map((error) => (error === null ? { ok: true } : { ok: false, error })),
    crash: null,
  };
  const syntax = compiled.diagnostics.find((d) => d.syntax);
  if (syntax) {
    result.crash = `Erreur de syntaxe, ligne ${syntax.line} (${syntax.file}) : ${syntax.message}`;
    onLog({ level: 'error', text: result.crash, test: null });
    return result;
  }
  const web = isWebFiles(files);
  const react = files.some((f) => /\.[jt]sx$/.test(f.name));
  const { script, locate }: Bundle = web ? frameBundle(compiled, setup, tests.length > 0) : bundle(compiled, setup);
  const reactScript = react ? (await import('virtual:react-sandbox')).default : '';
  if (signal?.aborted) return result;

  const runner = web ? startFrame(files, react ? [reactScript, script] : [script], container) : startWorker(script);
  const scripts = files.filter((f) => /\.[jt]sx?$/.test(f.name));
  const isMain = (file: string) => scripts.length === 1 || !file ? '' : ` de ${file}`;
  // " (ligne 4)" from the first stack frame inside the student's code.
  const where = (stack: string) => {
    for (const m of stack.matchAll(/(?:blob:[^\s)]*?|sandbox-run\.js):(\d+):\d+/g)) {
      const at = locate(Number(m[1]));
      if (at) {
        const file = scripts.find((f) => f.name.replace(/\.\w+$/, '') === at.file);
        if (file && at.line <= file.code.split('\n').length) return ` (ligne ${at.line}${isMain(file.name)})`;
      }
    }
    return '';
  };

  return new Promise((resolve) => {
    let over = false;
    const finish = (keep = false) => {
      if (over) return;
      over = true;
      clearTimeout(timer);
      if (!keep) {
        signal?.removeEventListener('abort', stop);
        runner.stop();
      }
      resolve(result);
    };
    const stop = () => {
      result.crash ??= 'Arrêté';
      if (over) runner.stop();
      else finish();
    };
    const timer = setTimeout(() => {
      result.crash = `Arrêté après ${TIME_LIMIT / 1000} s : boucle infinie, minuterie jamais arrêtée ou promesse jamais résolue ?`;
      onLog({ level: 'error', text: result.crash, test: null });
      finish();
    }, TIME_LIMIT);
    signal?.addEventListener('abort', stop);
    runner.onMessage((m) => {
      if (m.type === 'log') onLog(m);
      else if (m.type === 'test') result.tests[m.id] = { ok: m.ok, error: m.error && m.error + where(m.stack ?? '') };
      else if (m.type === 'error') {
        const text = m.message + where(m.stack);
        if (m.phase === 'main') result.crash = text;
        onLog({ level: 'error', text, test: m.test });
      } else finish(web && !!container);
    });
    runner.onError((message, line) => {
      const at = locate(line);
      result.crash = `${message || 'Le code n’a pas pu démarrer'}${at ? ` (ligne ${at.line})` : ''}`;
      onLog({ level: 'error', text: result.crash, test: null });
      finish();
    });
  });
}
