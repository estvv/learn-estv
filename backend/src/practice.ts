import type { DB } from './db/index.js';
import { dayKey, shiftDay } from './stats.js';

// Time spent playing pieces, day by day, and the days in a row with some.

// A day counts from this much playing (seconds).
export const COUNTS = 60;
const DAYS = 13 * 7;
const TOP = 8;

export interface Practice {
  today: number; // seconds
  streak: { current: number; best: number };
  // Oldest first, today last.
  days: { day: string; seconds: number }[];
  pieces: { id: number; title: string; artist: string | null; cover: string | null; seconds: number; last: string; best: number | null }[];
}

// Days in a row, the last one today or yesterday (today is not over yet).
export function streakOf(active: ReadonlySet<string>, today: string): { current: number; best: number } {
  let current = 0;
  for (let day = active.has(today) ? today : shiftDay(today, -1); active.has(day); day = shiftDay(day, -1)) current++;
  let best = 0;
  for (const day of active) {
    if (active.has(shiftDay(day, -1))) continue;
    let run = 0;
    for (let d = day; active.has(d); d = shiftDay(d, 1)) run++;
    best = Math.max(best, run);
  }
  return { current, best };
}

// Days with enough playing, for the account's other stats.
export const playedDays = (db: DB, userId: number): string[] =>
  (db.prepare('SELECT day FROM piece_time WHERE user_id = ? GROUP BY day HAVING SUM(seconds) >= ?').all(userId, COUNTS) as { day: string }[]).map((r) => r.day);

export function practiceOf(db: DB, userId: number, subject: string | null, now = Date.now()): Practice {
  const today = dayKey(now);
  const perDay = new Map((db.prepare(`
    SELECT t.day, SUM(t.seconds) AS seconds FROM piece_time t JOIN pieces p ON p.id = t.piece_id
    WHERE t.user_id = ? AND (? IS NULL OR p.subject_id = ?) GROUP BY t.day
  `).all(userId, subject, subject) as { day: string; seconds: number }[]).map((r) => [r.day, r.seconds]));
  const active = new Set([...perDay].filter(([, s]) => s >= COUNTS).map(([d]) => d));
  const pieces = db.prepare(`
    SELECT p.id, p.title, p.artist, NULLIF(p.cover, '') AS cover, SUM(t.seconds) AS seconds, MAX(t.day) AS last,
      (SELECT MAX(score) FROM piece_takes k WHERE k.piece_id = p.id) AS best
    FROM piece_time t JOIN pieces p ON p.id = t.piece_id
    WHERE t.user_id = ? AND (? IS NULL OR p.subject_id = ?) GROUP BY p.id ORDER BY seconds DESC LIMIT ?
  `).all(userId, subject, subject, TOP) as Practice['pieces'];
  return {
    today: perDay.get(today) ?? 0,
    streak: streakOf(active, today),
    days: Array.from({ length: DAYS }, (_, i) => {
      const day = shiftDay(today, i - DAYS + 1);
      return { day, seconds: perDay.get(day) ?? 0 };
    }),
    pieces,
  };
}

export function addTime(db: DB, userId: number, pieceId: number, seconds: number, now = Date.now()) {
  db.prepare(`
    INSERT INTO piece_time (user_id, piece_id, day, seconds) VALUES (?, ?, ?, ?)
    ON CONFLICT (user_id, piece_id, day) DO UPDATE SET seconds = seconds + excluded.seconds
  `).run(userId, pieceId, dayKey(now), Math.round(seconds));
}
