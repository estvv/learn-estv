import { isDue } from '@learn/shared';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ProgressStore, SubjectProgress } from '../progress/store';
import { useProgressStore } from '../progress/useProgress';
import { SubjectModel } from './subject';
import { loadSubject, type SubjectSummary } from './useSubject';

export interface SubjectOverview {
  summary: SubjectSummary;
  model: SubjectModel;
  progress: SubjectProgress;
  due: number;
  stepsDone: number;
  stepsTotal: number;
  next?: ReturnType<SubjectModel['steps']>[number];
  started: boolean;
}

export interface RecentStep {
  subject: SubjectOverview;
  step: ReturnType<SubjectModel['steps']>[number];
  completedAt: number;
  score: number | null;
}

async function loadOverview(store: ProgressStore): Promise<SubjectOverview[]> {
  const summaries = await api<SubjectSummary[]>('/subjects');
  const now = new Date();
  return Promise.all(summaries.map(async (summary) => {
    const [pack, progress] = await Promise.all([loadSubject(summary.id), store.load(summary.id)]);
    const model = new SubjectModel(pack);
    const steps = model.steps();
    return {
      summary,
      model,
      progress,
      due: [...progress.srs.values()].filter((e) => isDue(e.card, now)).length,
      stepsDone: steps.filter((s) => progress.steps.has(s.fullId)).length,
      stepsTotal: steps.length,
      next: steps.find((s) => !progress.steps.has(s.fullId)),
      started: progress.steps.size > 0 || progress.srs.size > 0,
    };
  }));
}

// Every subject with this user's (or guest's) progress, for the home page.
export function useOverview() {
  const store = useProgressStore();
  const [subjects, setSubjects] = useState<SubjectOverview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadOverview(store).then((s) => alive && setSubjects(s), (e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [store]);
  return { subjects, error };
}

export function recentSteps(subjects: SubjectOverview[], limit = 6): RecentStep[] {
  return subjects.flatMap((subject) => subject.model.steps().flatMap((step) => {
    const record = subject.progress.steps.get(step.fullId);
    return record ? [{ subject, step, completedAt: record.completed_at, score: record.best_score }] : [];
  })).sort((a, b) => b.completedAt - a.completedAt).slice(0, limit);
}

export function relativeDay(ms: number): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(new Date()) - day(new Date(ms))) / 86_400_000);
  if (diff <= 0) return 'aujourd’hui';
  if (diff === 1) return 'hier';
  if (diff < 7) return `il y a ${diff} jours`;
  return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
