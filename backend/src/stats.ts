import { mastery, type StoredCard } from '@learn/shared';
import { getPack } from './content/store.js';
import type { DB } from './db/index.js';
import { playedDays } from './practice.js';

// Days are counted in the owner's time zone, not the server's (UTC in Docker).
const TIME_ZONE = process.env.TZ_STATS ?? 'Europe/Paris';
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
export const dayKey = (ms: number) => dayFormat.format(new Date(ms)); // YYYY-MM-DD

const HEATMAP_DAYS = 53 * 7;
// A card whose next review is three weeks away or more counts as mastered.
const MASTERED_STABILITY_DAYS = 21;

export function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export interface ProfileStats {
  active_days: number;
  totals: { answers: number; correct_rate: number | null; elements_seen: number; elements_mastered: number; steps_done: number };
  heatmap: { day: string; count: number }[]; // oldest first, today last
  subjects: {
    id: string; name: string; accent: string;
    steps_done: number; steps_total: number;
    elements_seen: number; elements_total: number;
    mastery: number;
  }[];
  recent: { step: string; title: string; subject: string; subject_name: string; accent: string; score: number | null; completed_at: number }[];
}

export function profileStats(db: DB, userId: number, now = Date.now()): ProfileStats {
  const reviews = db.prepare('SELECT at, correct FROM reviews WHERE user_id = ?').all(userId) as { at: number; correct: number }[];
  const steps = db.prepare(`
    SELECT sp.step_id, sp.completed_at, sp.best_score, st.title, s.id AS subject, s.name AS subject_name, s.accent
    FROM step_progress sp
    LEFT JOIN steps st ON st.id = sp.step_id
    LEFT JOIN subjects s ON s.id = substr(sp.step_id, 1, instr(sp.step_id, '/') - 1)
    WHERE sp.user_id = ? ORDER BY sp.completed_at DESC
  `).all(userId) as { step_id: string; completed_at: number; best_score: number | null; title: string | null; subject: string | null; subject_name: string | null; accent: string | null }[];
  const srs = db.prepare('SELECT element_id, facet, card FROM srs_state WHERE user_id = ?').all(userId) as { element_id: string; facet: string; card: string }[];

  // Activity per day: answers + completed steps.
  const perDay = new Map<string, number>();
  for (const r of reviews) perDay.set(dayKey(r.at), (perDay.get(dayKey(r.at)) ?? 0) + 1);
  for (const s of steps) perDay.set(dayKey(s.completed_at), (perDay.get(dayKey(s.completed_at)) ?? 0) + 1);
  // A day at the piano counts too.
  for (const day of playedDays(db, userId)) perDay.set(day, (perDay.get(day) ?? 0) + 1);

  const today = dayKey(now);
  const heatmap = Array.from({ length: HEATMAP_DAYS }, (_, i) => {
    const day = shiftDay(today, i - HEATMAP_DAYS + 1);
    return { day, count: perDay.get(day) ?? 0 };
  });

  const cards = new Map(srs.map((r) => [`${r.element_id}#${r.facet}`, JSON.parse(r.card) as StoredCard]));
  const seenElements = new Set(srs.map((r) => r.element_id));
  const mastered = [...cards.values()].filter((c) => c.stability >= MASTERED_STABILITY_DAYS).length;

  const subjectIds = new Set<string>([
    ...srs.map((r) => r.element_id.slice(0, r.element_id.indexOf('/'))),
    ...steps.map((s) => s.step_id.slice(0, s.step_id.indexOf('/'))),
  ]);
  const subjects = [...subjectIds].flatMap((id) => {
    const pack = getPack(db, id);
    if (!pack) return [];
    const prefix = `${id}/`;
    const stepIds = pack.paths.flatMap((p) => p.units.flatMap((u) => u.steps.map((st) => `${id}/${p.id}/${u.id}/${st.id}`)));
    const done = new Set(steps.filter((s) => s.step_id.startsWith(prefix)).map((s) => s.step_id));
    return [{
      id,
      name: pack.subject.name,
      accent: pack.subject.accent,
      steps_done: stepIds.filter((s) => done.has(s)).length,
      steps_total: stepIds.length,
      elements_seen: [...seenElements].filter((e) => e.startsWith(prefix)).length,
      elements_total: pack.elements.length,
      mastery: mastery(pack, pack.elements, (key) => cards.get(key), new Date(now)).value,
    }];
  }).sort((a, b) => b.steps_done - a.steps_done || a.name.localeCompare(b.name));

  const correct = reviews.filter((r) => r.correct).length;
  return {
    active_days: perDay.size,
    totals: {
      answers: reviews.length,
      correct_rate: reviews.length ? correct / reviews.length : null,
      elements_seen: seenElements.size,
      elements_mastered: mastered,
      steps_done: steps.length,
    },
    heatmap,
    subjects,
    recent: steps.filter((s) => s.title && s.subject).slice(0, 10).map((s) => ({
      step: s.step_id,
      title: s.title!,
      subject: s.subject!,
      subject_name: s.subject_name!,
      accent: s.accent ?? 'neutral',
      score: s.best_score,
      completed_at: s.completed_at,
    })),
  };
}
