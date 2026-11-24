import { useEffect, useRef, useState } from 'react';
import { PlayIcon } from '../../components/icons';
import { Segmented } from '../../components/Segmented';
import { primaryButton, secondaryButton } from '../../components/ui';
import { readJson, writeJson } from '../../lib/storage';
import { CodeEditor } from './CodeEditor';
import { Console } from './Console';
import type { File } from './engine/compile';
import { isWebFiles } from './engine/run';
import { useRun } from './useRun';

const KEY = 'learn.code.playground.v2';
const START = {
  mode: 'ts' as Mode,
  js: [{ name: 'main.js', code: "const prenom = 'toi';\nconsole.log(`Salut ${prenom} !`);\n" }],
  ts: [{ name: 'main.ts', code: "const prenom: string = 'toi';\nconsole.log(`Salut ${prenom} !`);\n" }],
  web: [
    { name: 'main.ts', code: "const bouton = document.querySelector('button')!;\nlet n = 0;\nbouton.addEventListener('click', () => {\n  n++;\n  bouton.textContent = `${n} clics`;\n});\n" },
    { name: 'index.html', code: '<h1>Ma page</h1>\n<button>0 clic</button>\n' },
    { name: 'style.css', code: 'button {\n  padding: 8px 16px;\n}\n' },
  ],
  react: [
    { name: 'main.tsx', code: "import { useState } from 'react';\n\nexport default function App() {\n  const [n, setN] = useState(0);\n  return <button onClick={() => setN(n + 1)}>{n} clics</button>;\n}\n" },
    { name: 'style.css', code: 'button {\n  padding: 8px 16px;\n}\n' },
  ],
};
type Mode = 'js' | 'ts' | 'web' | 'react';

// Free code, kept in this browser.
export default function Playground() {
  const [state, setState] = useState(() => readJson<Record<Mode, File[]> & { mode: Mode }>(KEY, START));
  const [tab, setTab] = useState(0);
  useEffect(() => writeJson(KEY, state), [state]);
  const { logs, running, run, stop } = useRun();
  const preview = useRef<HTMLDivElement>(null);
  const { mode } = state;
  const files = state[mode];
  const file = files[Math.min(tab, files.length - 1)];
  const web = isWebFiles(files);
  const start = () => void run({ files, container: web ? preview.current : undefined });
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[4.25rem] shrink-0 items-center gap-2 overflow-x-auto border-b border-neutral-200 bg-white pl-16 pr-4 sm:gap-3">
        <span className="hidden font-semibold md:block">Bac à sable</span>
        <Segmented
          value={mode}
          onChange={(m) => { stop(); setTab(0); setState((s) => ({ ...s, mode: m })); }}
          options={[{ value: 'js', label: 'JS' }, { value: 'ts', label: 'TS' }, { value: 'web', label: 'Web' }, { value: 'react', label: 'React' }]}
        />
        <span className="flex-1" />
        {running && <button type="button" className={`${secondaryButton} shrink-0`} onClick={stop}>Arrêter</button>}
        <button type="button" className={`${primaryButton} shrink-0 ${running ? 'max-sm:hidden' : ''}`} onClick={start} title="Ctrl + Entrée" aria-label="Exécuter"><PlayIcon className="h-4 w-4" /><span className="max-sm:hidden">Exécuter</span></button>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1">
        <div className="flex min-h-0 min-w-0 flex-col">
          {files.length > 1 && (
            <div className="flex gap-1 border-b border-neutral-100 bg-white px-3 py-1.5">
              {files.map((f, i) => (
                <button key={f.name} type="button" onClick={() => setTab(i)} className={`rounded-md px-2.5 py-1 font-mono text-xs ${f === file ? 'bg-neutral-100 font-semibold' : 'text-neutral-500 hover:text-neutral-900'}`}>{f.name}</button>
              ))}
            </div>
          )}
          <div className="min-h-0 flex-1">
            <CodeEditor
              key={`${mode}/${file.name}`}
              file={file.name}
              value={file.code}
              files={files}
              onChange={(code) => setState((s) => ({ ...s, [mode]: s[mode].map((f) => (f.name === file.name ? { ...f, code } : f)) }))}
              onRun={start}
            />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-col lg:border-l lg:border-neutral-200">
          {web && <div key={mode} ref={preview} className="min-h-0 flex-[3] bg-white" />}
          <Console logs={logs} empty={running ? 'Exécution…' : 'Ctrl + Entrée pour exécuter'} className="min-h-0 flex-[2]" />
        </div>
      </div>
    </div>
  );
}
