import { useCallback, useEffect, useRef, useState } from 'react';
import { useProgressStore } from '../../progress/useProgress';

type Files = Record<string, string>;

// The code typed in a step, saved as it is written. `null` while loading.
export function useDraft(stepId: string | undefined, start: Files) {
  const store = useProgressStore();
  const [files, setFiles] = useState<Files | null>(stepId ? null : start);
  const [found, setFound] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const pending = useRef<Files | null>(null);
  const initial = useRef(start);

  useEffect(() => {
    if (!stepId) return;
    let alive = true;
    store.loadCode(stepId).catch(() => null).then((saved) => {
      if (!alive) return;
      // Only files the exercise still has.
      const known = Object.fromEntries(Object.entries(saved ?? {}).filter(([name]) => name in initial.current));
      setFound(Object.keys(known).length > 0);
      setFiles({ ...initial.current, ...known });
    });
    return () => {
      alive = false;
    };
  }, [store, stepId]);

  const flush = useCallback(() => {
    const code = pending.current;
    if (!code || !stepId) return;
    pending.current = null;
    store.saveCode(stepId, code).then(() => setUnsaved(false), () => setUnsaved(true));
  }, [store, stepId]);

  useEffect(() => {
    if (!files || !pending.current) return;
    const t = setTimeout(flush, 800);
    return () => clearTimeout(t);
  }, [files, flush]);

  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  const change = useCallback((update: (prev: Files) => Files) => setFiles((prev) => {
    if (!prev) return prev;
    const next = update(prev);
    pending.current = next;
    return next;
  }), []);

  return { files, change, found, unsaved };
}
