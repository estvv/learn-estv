import type { Accent, Pack } from '@learn/shared';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export type SubjectPack = Pack & { source: 'seed' | 'user' | 'ai' };

export interface SubjectSummary {
  id: string;
  name: string;
  description: string;
  accent: Accent;
  source: string;
  elements: number;
  lessons: number;
  steps: number;
}

const cache = new Map<string, Promise<SubjectPack>>();

export function loadSubject(id: string): Promise<SubjectPack> {
  let p = cache.get(id);
  if (!p) {
    p = api<SubjectPack>(`/subjects/${encodeURIComponent(id)}`);
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

export function useSubject(id: string | undefined) {
  const [pack, setPack] = useState<SubjectPack | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setPack(null);
    setError(null);
    loadSubject(id).then((p) => alive && setPack(p), (e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);
  return { pack, error };
}
