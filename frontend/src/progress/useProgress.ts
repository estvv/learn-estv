import { srsKey, type ReviewEvent } from '@learn/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../app/auth';
import { guestStore, serverStore, type ProgressStore, type SubjectProgress } from './store';

export function useProgressStore(): ProgressStore {
  const { user } = useAuth();
  return user ? serverStore : guestStore;
}

export function useSubjectProgress(subject: string | undefined) {
  const store = useProgressStore();
  const [progress, setProgress] = useState<SubjectProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!subject) return;
    try {
      setProgress(await store.load(subject));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [store, subject]);

  useEffect(() => {
    setProgress(null);
    void reload();
  }, [reload]);

  const record = useCallback(async (reviews: ReviewEvent[]) => {
    try {
      const updated = await store.record(reviews);
      setProgress((p) => {
        if (!p) return p;
        const srs = new Map(p.srs);
        for (const e of updated) srs.set(srsKey(e.element, e.facet), e);
        return { ...p, srs };
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [store]);

  const completeStep = useCallback(async (step: string, score?: number) => {
    try {
      await store.completeStep(step, score);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [store, reload]);

  return useMemo(() => ({ progress, error, record, completeStep, reload, persistent: store.persistent }),
    [progress, error, record, completeStep, reload, store.persistent]);
}
