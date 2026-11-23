import { useCallback, useEffect, useRef, useState } from 'react';
import { runCode, type LogLine, type RunOptions, type RunResult } from './engine/run';

// Runs code and keeps what it printed; a new run stops the previous one.
export function useRun() {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const run = useCallback(async (options: Omit<RunOptions, 'onLog' | 'signal'>): Promise<RunResult | null> => {
    abort.current?.abort();
    const mine = new AbortController();
    abort.current = mine;
    setLogs([]);
    setRunning(true);
    try {
      const result = await runCode({ ...options, signal: mine.signal, onLog: (l) => { if (!mine.signal.aborted) setLogs((prev) => [...prev, l]); } });
      return mine.signal.aborted ? null : result;
    } catch (e) {
      if (!mine.signal.aborted) setLogs((prev) => [...prev, { level: 'error', text: (e as Error).message, test: null }]);
      return null;
    } finally {
      if (abort.current === mine) setRunning(false);
    }
  }, []);

  const stop = useCallback(() => {
    abort.current?.abort();
    setRunning(false);
  }, []);

  return { logs, running, run, stop };
}
