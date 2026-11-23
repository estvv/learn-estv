import { isDue, reviewCard, srsKey, type ReviewEvent, type SrsEntry } from '@learn/shared';
import { api } from '../lib/api';
import { readJson, writeJson } from '../lib/storage';

export interface StepRecord {
  step: string;
  completed_at: number;
  best_score: number | null;
}

export interface SubjectProgress {
  srs: Map<string, SrsEntry>; // key: srsKey(element, facet)
  steps: Map<string, StepRecord>;
}

export interface SubjectSummaryProgress {
  subject: string;
  due: number;
  started: number;
}

// Accounts store progress on the server; guests in this browser only. Both
// run the same FSRS code from @learn/shared.
export interface ProgressStore {
  readonly persistent: boolean;
  load(subject: string): Promise<SubjectProgress>;
  record(reviews: ReviewEvent[]): Promise<SrsEntry[]>;
  completeStep(step: string, score?: number): Promise<void>;
  // Code typed in an exercise: file name -> code.
  loadCode(step: string): Promise<Record<string, string> | null>;
  saveCode(step: string, files: Record<string, string>): Promise<void>;
  summary(): Promise<SubjectSummaryProgress[]>;
}

function toProgress(srs: SrsEntry[], steps: StepRecord[]): SubjectProgress {
  return {
    srs: new Map(srs.map((e) => [srsKey(e.element, e.facet), e])),
    steps: new Map(steps.map((s) => [s.step, s])),
  };
}

export const serverStore: ProgressStore = {
  persistent: true,
  async load(subject) {
    const data = await api<{ srs: SrsEntry[]; steps: StepRecord[] }>(`/progress/${encodeURIComponent(subject)}`);
    return toProgress(data.srs, data.steps);
  },
  record: (reviews) => api<SrsEntry[]>('/progress/reviews', { method: 'POST', json: { reviews } }),
  async completeStep(step, score) {
    await api('/progress/steps', { method: 'POST', json: { step, score } });
  },
  loadCode: (step) => api<Record<string, string> | null>(`/progress/code?step=${encodeURIComponent(step)}`),
  async saveCode(step, files) {
    await api('/progress/code', { method: 'PUT', json: { step, files }, keepalive: true });
  },
  summary: () => api<SubjectSummaryProgress[]>('/progress'),
};

const GUEST_KEY = 'learn.guest.v1';
const CODE_KEY = 'learn.guest.code.v1';
interface GuestData {
  srs: Record<string, SrsEntry>;
  steps: Record<string, StepRecord>;
}

function guestData(): GuestData {
  return readJson<GuestData>(GUEST_KEY, { srs: {}, steps: {} });
}

const subjectOf = (id: string) => id.slice(0, id.indexOf('/'));

export const guestStore: ProgressStore = {
  persistent: false,
  async load(subject) {
    const data = guestData();
    return toProgress(
      Object.values(data.srs).filter((e) => subjectOf(e.element) === subject),
      Object.values(data.steps).filter((s) => subjectOf(s.step) === subject),
    );
  },
  async record(reviews) {
    const data = guestData();
    const now = new Date();
    const updated = reviews.map((r) => {
      const key = srsKey(r.element, r.facet);
      const entry = { element: r.element, facet: r.facet, card: reviewCard(data.srs[key]?.card, r.grade, now) };
      data.srs[key] = entry;
      return entry;
    });
    writeJson(GUEST_KEY, data);
    return updated;
  },
  async completeStep(step, score) {
    const data = guestData();
    const prev = data.steps[step]?.best_score ?? null;
    const best = score === undefined ? prev : Math.max(prev ?? 0, score);
    data.steps[step] = { step, completed_at: Date.now(), best_score: best };
    writeJson(GUEST_KEY, data);
  },
  async loadCode(step) {
    return readJson<Record<string, Record<string, string>>>(CODE_KEY, {})[step] ?? null;
  },
  async saveCode(step, files) {
    writeJson(CODE_KEY, { ...readJson<Record<string, Record<string, string>>>(CODE_KEY, {}), [step]: files });
  },
  async summary() {
    const bySubject = new Map<string, SubjectSummaryProgress>();
    const now = new Date();
    for (const e of Object.values(guestData().srs)) {
      const s = subjectOf(e.element);
      const row = bySubject.get(s) ?? { subject: s, due: 0, started: 0 };
      row.started++;
      if (isDue(e.card, now)) row.due++;
      bySubject.set(s, row);
    }
    return [...bySubject.values()];
  },
};

export function clearGuestProgress() {
  try {
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem(CODE_KEY);
  } catch {
    // Storage blocked: nothing to clear.
  }
}
