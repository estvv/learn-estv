import type { Score, ScoreNote, ScorePart } from '@learn/shared';
import { addNotes, partOf, removeNote } from './score';

// The parts one after the other, as a single sheet. Places are in columns, from
// the start of a part or of the piece.

// A note, in the part played `index`-th.
export interface Placed {
  index: number;
  note: ScoreNote;
}

// Parts as they are played, then those that are not.
export const sheetOf = (score: Score): ScorePart[] => [
  ...score.order.map((l) => partOf(score, l)),
  ...score.parts.filter((p) => !score.order.includes(p.label)),
];

// Where each part starts, then the end.
export function offsetsOf(parts: ScorePart[], division: number): number[] {
  const out = [0];
  for (const p of parts) out.push(out[out.length - 1] + p.beats * division);
  return out;
}

// After the end: in the last part.
export function locate(offsets: number[], at: number): { index: number; step: number } {
  let index = 0;
  while (index + 2 < offsets.length && at >= offsets[index + 1]) index++;
  return { index, step: at - offsets[index] };
}

// From one place to another, in another part or not.
export function moveNote(score: Score, from: Placed, to: Placed): Score {
  const parts = sheetOf(score);
  return addNotes(removeNote(score, parts[from.index].label, from.note), parts[to.index].label, [to.note]);
}

// What was written past the end of a part goes on in the next ones, instead of
// making it longer.
export function spill(before: Score, after: Score, index: number): Score {
  const parts = sheetOf(before);
  const part = parts[index];
  const now = partOf(after, part.label);
  if (index + 1 >= parts.length || now.beats <= part.beats || before.division !== after.division) return after;
  const offsets = offsetsOf(parts, before.division);
  const end = part.beats * before.division;
  let out: Score = {
    ...after,
    parts: after.parts.map((p) => (p.label === part.label ? { ...p, beats: part.beats, notes: p.notes.filter((n) => n.step < end) } : p)),
  };
  for (const n of now.notes) {
    if (n.step < end) continue;
    const there = locate(offsets, offsets[index] + n.step);
    out = addNotes(out, parts[there.index].label, [{ ...n, step: there.step }]);
  }
  return out;
}
