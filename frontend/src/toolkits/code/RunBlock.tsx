import { useRef, useState } from 'react';
import { PlayIcon } from '../../components/icons';
import { CodeEditor } from './CodeEditor';
import { Console } from './Console';
import type { File } from './engine/compile';
import { isWebFiles } from './engine/run';
import Highlight from './highlight';
import { langOf } from './languages';
import { useRun } from './useRun';

const labels = { js: 'JavaScript', ts: 'TypeScript', jsx: 'React', tsx: 'React', html: 'HTML', css: 'CSS' };

// A lesson example that can be run and changed.
export default function RunBlock({ original }: { original: File[] }) {
  const [files, setFiles] = useState(original);
  const [editing, setEditing] = useState(false);
  const [ran, setRan] = useState(false);
  const { logs, running, run } = useRun();
  const preview = useRef<HTMLDivElement>(null);
  const web = isWebFiles(files);
  // The page reads better before its script.
  const shown = (web ? [...files].reverse() : files).filter((f) => f.code.trim() || editing);
  const start = () => {
    setRan(true);
    // After the preview is on the page.
    setTimeout(() => void run({ files, container: web ? preview.current : undefined }));
  };
  const small = 'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900';
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center gap-1 border-b border-neutral-100 px-2 py-1">
        <span className="px-1 text-xs font-semibold text-neutral-400">{labels[langOf(files[0].name)]}</span>
        <span className="flex-1" />
        {files.some((f, i) => f.code !== original[i].code) && <button type="button" className={small} onClick={() => setFiles(original)}>Réinitialiser</button>}
        {!editing && <button type="button" className={small} onClick={() => setEditing(true)}>Modifier</button>}
        <button type="button" className={small} onClick={start} disabled={running}><PlayIcon className="h-3.5 w-3.5" />Exécuter</button>
      </div>
      {shown.map((f, i) => (
        <div key={f.name} className={i ? 'border-t border-neutral-100' : ''}>
          {editing
            ? <CodeEditor file={f.name} value={f.code} files={files} onChange={(code) => setFiles((list) => list.map((x) => (x.name === f.name ? { ...x, code } : x)))} onRun={start} />
            : <pre className="overflow-x-auto p-4 text-[13.5px] leading-relaxed"><Highlight code={f.code} lang={langOf(f.name)} /></pre>}
        </div>
      ))}
      {ran && web && <div ref={preview} className="h-44 border-t border-neutral-200 bg-white" />}
      {ran && (!web || logs.length > 0) && <Console logs={logs} empty={running ? 'Exécution…' : 'Rien d’affiché'} className="max-h-60" />}
    </div>
  );
}
