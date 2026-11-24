import type { CodeConfig } from '@learn/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, LockIcon, PlayIcon } from '../../components/icons';
import { Markdown } from '../../components/Markdown';
import { LoadingState, panel } from '../../components/ui';
import { HighlightedCode } from '../../toolkits/code/blocks';
import { CodeEditor } from '../../toolkits/code/CodeEditor';
import { Console } from '../../toolkits/code/Console';
import type { RunResult, TestResult } from '../../toolkits/code/engine/run';
import { useRun } from '../../toolkits/code/useRun';
import type { PlayerProps } from '../types';
import { Button, Kbd } from '../ui';
import { isWebFiles } from '../../toolkits/code/engine/run';
import { langOf } from '../../toolkits/code/languages';
import { useDraft } from './useDraft';

// Tries before the solution can be shown.
const TRIES = 3;

interface Check extends TestResult {
  name: string;
  code?: string;
}

// One list of checks per part, in the order of the config.
function checksByPart(config: CodeConfig, result: RunResult | null): Check[][] {
  let test = 0;
  let type = 0;
  const pending: TestResult = { ok: false };
  return config.parts.map((p) => [
    ...p.tests.map((t) => ({ name: t.name, code: t.code, ...(result?.tests[test++] ?? pending) })),
    ...p.types.map((t) => ({ name: t.name, code: t.code, ...(result?.types[type++] ?? pending) })),
  ]);
}

export default function CodePlayer({ config, stepId, onComplete, onFinish }: PlayerProps<CodeConfig>) {
  const start = useMemo(() => Object.fromEntries(config.files.filter((f) => !f.readonly).map((f) => [f.name, f.code])), [config]);
  const { files: draft, change, found, unsaved } = useDraft(stepId, start);
  const tester = useRun();
  // The student's own run: for a web exercise, the page in the preview.
  const live = useRun();
  const [last, setLast] = useState<'tester' | 'live'>('live');
  const { logs, running, stop } = last === 'live' ? live : tester;
  const preview = useRef<HTMLDivElement>(null);
  const web = isWebFiles(config.files);
  const [tab, setTab] = useState((config.files.find((f) => !f.readonly) ?? config.files[0]).name);
  const [result, setResult] = useState<RunResult | null>(null);
  const [tries, setTries] = useState(0);
  const [hints, setHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [passed, setPassed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const files = config.files.map((f) => ({ name: f.name, code: draft?.[f.name] ?? f.code }));
  const isTs = /\.tsx?$/.test(config.files[0].name);
  const checks = checksByPart(config, result);
  const typeErrors = result?.diagnostics.filter((d) => !d.syntax) ?? [];
  const firstUndone = checks.findIndex((c) => c.some((x) => !x.ok));
  const currentPart = firstUndone < 0 ? checks.length - 1 : firstUndone;
  const project = config.parts.length > 1;

  const verify = async (counted = true) => {
    setLast('tester');
    if (web) void live.run({ files, setup: config.setup, container: preview.current });
    const r = await tester.run({
      files,
      tests: config.parts.flatMap((p) => p.tests.map((t) => t.code)),
      types: config.parts.flatMap((p) => p.types),
      setup: config.setup,
    });
    if (!r) return;
    setResult(r);
    const ok = [...r.tests, ...r.types].every((t) => t.ok) && r.diagnostics.length === 0;
    setPassed(ok);
    if (ok) onComplete?.({ passed: true });
    else if (counted) setTries((n) => n + 1);
  };
  const execute = () => {
    setLast('live');
    void live.run({ files, setup: config.setup, container: web ? preview.current : undefined });
  };

  // The preview follows the code, once it is calm.
  const code = web && draft ? JSON.stringify(files) : null;
  useEffect(() => {
    if (code === null) return;
    const t = setTimeout(execute, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // A project comes back at the part it was left at.
  const resumed = useRef(false);
  useEffect(() => {
    if (!draft || resumed.current) return;
    resumed.current = true;
    if (project && found) void verify(false);
  });

  if (!draft) return <LoadingState />;

  const tabs = (
    <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
      {config.files.map((f) => (
        <button
          key={f.name}
          type="button"
          onClick={() => setTab(f.name)}
          className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 font-mono text-xs ${tab === f.name ? 'bg-neutral-100 font-semibold text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
        >
          {f.name}{f.readonly && <LockIcon className="h-3 w-3" />}
        </button>
      ))}
    </div>
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="min-w-0 space-y-4">
        {config.instructions && <div className={`${panel} p-5`}><Markdown>{config.instructions}</Markdown></div>}

        {config.parts.map((part, i) => {
          const locked = project && i > currentPart;
          const done = checks[i].every((c) => c.ok) && result !== null;
          return (
            <section key={i} className={`${panel} overflow-hidden ${locked ? 'opacity-60' : ''}`}>
              {project && (
                <div className="flex items-center gap-2.5 px-5 py-3 text-sm font-semibold">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${done ? 'bg-emerald-500 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                    {done ? <CheckIcon className="h-3.5 w-3.5" /> : locked ? <LockIcon className="h-3 w-3" /> : i + 1}
                  </span>
                  {part.title}
                </div>
              )}
              {!locked && (
                <>
                  {part.instructions && i === currentPart && <div className="border-t border-neutral-100 px-5 py-4"><Markdown>{part.instructions}</Markdown></div>}
                  {(!project || i === currentPart || !done) && <Checks checks={checks[i]} ran={result !== null} />}
                </>
              )}
            </section>
          );
        })}
        {isTs && result && !result.diagnostics.some((d) => d.syntax) && (
          <section className={`${panel} overflow-hidden`}>
            <Checks ran checks={[{
              name: 'Aucune erreur TypeScript',
              ok: typeErrors.length === 0,
              error: typeErrors.slice(0, 5).map((d) => `${project || files.length > 1 ? `${d.file}, ` : ''}ligne ${d.line} : ${d.message}`).join('\n'),
            }]} />
          </section>
        )}

        <div className="space-y-3">
          {config.hints.slice(0, hints).map((h, i) => (
            <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm"><Markdown>{h}</Markdown></div>
          ))}
          <div className="flex flex-wrap gap-1">
            {hints < config.hints.length && (
              <Button variant="ghost" onClick={() => setHints(hints + 1)}>Indice {hints + 1} / {config.hints.length}</Button>
            )}
            {tries >= TRIES || passed
              ? <Button variant="ghost" onClick={() => setShowSolution(!showSolution)}>{showSolution ? 'Cacher la solution' : 'Voir la solution'}</Button>
              : <span className="px-3 py-2 text-sm text-neutral-400">Solution après {TRIES - tries} essai{TRIES - tries > 1 ? 's' : ''}</span>}
          </div>
          {showSolution && config.solution.filter((f) => !config.files.find((x) => x.name === f.name)?.readonly).map((f) => (
            <div key={f.name}>
              {config.solution.length > 1 && <div className="mb-1 font-mono text-xs text-neutral-500">{f.name}</div>}
              <HighlightedCode code={f.code.trimEnd()} lang={langOf(f.name)} />
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0 space-y-3 lg:sticky lg:top-20">
        <div className={`${panel} flex h-[70dvh] flex-col overflow-hidden lg:h-[calc(100vh-11rem)]`}>
          <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-1.5">
            {tabs}
            {unsaved && <span className="shrink-0 text-xs text-red-600">Non enregistré</span>}
            <button
              type="button"
              className="shrink-0 rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              onBlur={() => setConfirmReset(false)}
              onClick={() => {
                if (!confirmReset) return setConfirmReset(true);
                setConfirmReset(false);
                change(() => start);
                setResult(null);
              }}
            >
              {confirmReset ? 'Effacer mon code ?' : 'Réinitialiser'}
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <CodeEditor
              key={tab}
              file={tab}
              value={files.find((f) => f.name === tab)!.code}
              files={files}
              readOnly={config.files.find((f) => f.name === tab)!.readonly}
              onChange={(code) => { if (tab in start) change((prev) => ({ ...prev, [tab]: code })); }}
              onRun={() => void verify()}
            />
          </div>
          {web ? (
            <div className="grid h-64 shrink-0 grid-rows-[3fr_2fr] border-t border-neutral-200 md:grid-cols-[3fr_2fr] md:grid-rows-1">
              <div ref={preview} className="min-h-0 min-w-0 bg-white" />
              <Console logs={logs} empty="console.log" className="min-h-0" />
            </div>
          ) : (
            <Console logs={logs} empty={running ? 'Exécution…' : 'La sortie de console.log s’affiche ici'} className="h-40 shrink-0" />
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 px-3 py-2.5">
            {passed && <span className="text-sm font-semibold text-emerald-600">Réussi !</span>}
            <span className="flex-1" />
            {running && <Button variant="ghost" onClick={stop}>Arrêter</Button>}
            <Button variant="secondary" onClick={execute}><PlayIcon className="h-4 w-4" />Exécuter</Button>
            <Button variant={passed ? 'secondary' : 'primary'} onClick={() => void verify()}>Vérifier <Kbd>Ctrl Entrée</Kbd></Button>
            {passed && <Button onClick={() => onFinish({ passed: true })}>Continuer</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Checks({ checks, ran }: { checks: Check[]; ran: boolean }) {
  return (
    <ul className="divide-y divide-neutral-100 border-t border-neutral-100 first:border-t-0">
      {checks.map((c, i) => (
        <li key={i} className="px-5 py-2.5 text-sm">
          <div className="flex items-start gap-2.5">
            <span className={`mt-0.5 w-4 shrink-0 text-center font-bold ${!ran ? 'text-neutral-300' : c.ok ? 'text-emerald-600' : 'text-red-500'}`}>
              {!ran ? '○' : c.ok ? '✓' : '✗'}
            </span>
            <span className="min-w-0 flex-1 text-neutral-700"><Markdown>{c.name}</Markdown></span>
          </div>
          {ran && !c.ok && c.error && <pre className="ml-6.5 mt-1 whitespace-pre-wrap break-words font-mono text-xs text-red-600">{c.error}</pre>}
          {ran && !c.ok && c.code && (
            <details className="ml-6.5 mt-1">
              <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-700">Voir le test</summary>
              <div className="mt-1.5"><HighlightedCode code={c.code} lang="tsx" /></div>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}
