import type { PieceNote } from '@learn/shared';

// The corrections the player's editor can make: small fixes to imported notes
// (wrong pitch, stray note, wrong hand, silence to cut), not composing.
// Every function returns new notes and leaves its input untouched.

// Notes get an id while being edited, to keep track of the selection.
export type EditNote = PieceNote & { id: number };

const LOWEST = 21; // A0
const HIGHEST = 108; // C8
const MIN_DURATION = 0.05;

export const withIds = (notes: PieceNote[]): EditNote[] => notes.map((n, id) => ({ ...n, id }));
export const withoutIds = (notes: EditNote[]): PieceNote[] => notes.map(({ id: _id, ...n }) => n);

export function removeNotes(notes: EditNote[], ids: Set<number>): EditNote[] {
  return notes.filter((n) => !ids.has(n.id));
}

// Semitones up (+) or down (-). The selection moves as a whole: if one note
// would leave the piano, nothing moves.
export function transpose(notes: EditNote[], ids: Set<number>, by: number): EditNote[] {
  const moved = notes.filter((n) => ids.has(n.id));
  if (!moved.length || moved.some((n) => n.midi + by < LOWEST || n.midi + by > HIGHEST)) return notes;
  return notes.map((n) => (ids.has(n.id) ? { ...n, midi: n.midi + by } : n));
}

// All selected notes in the right hand become left-hand notes; any other
// selection (left, unknown or mixed) goes to the right hand.
export function switchHand(notes: EditNote[], ids: Set<number>): EditNote[] {
  const selected = notes.filter((n) => ids.has(n.id));
  if (!selected.length) return notes;
  const hand = selected.every((n) => n.hand === 'right') ? 'left' : 'right';
  return notes.map((n) => (ids.has(n.id) ? { ...n, hand } : n));
}

// Drop what starts before `at` and bring the rest back to the start.
export function cutBefore(notes: EditNote[], at: number): EditNote[] {
  if (at <= 0) return notes;
  return notes.filter((n) => n.time >= at - 1e-6).map((n) => ({ ...n, time: Math.max(0, n.time - at) }));
}

// Drop what starts at or after `at`; notes still sounding there stop there.
export function cutAfter(notes: EditNote[], at: number): EditNote[] {
  return notes
    .filter((n) => n.time < at - 1e-6)
    .map((n) => (n.time + n.duration > at ? { ...n, duration: Math.max(MIN_DURATION, at - n.time) } : n));
}

// Undo / redo over whole snapshots (notes are immutable, a snapshot only
// copies references).
export interface History {
  past: EditNote[][];
  present: EditNote[];
  future: EditNote[][];
}

const MAX_UNDO = 200;

export const startHistory = (notes: EditNote[]): History => ({ past: [], present: notes, future: [] });

export function commit(h: History, next: EditNote[]): History {
  if (next === h.present) return h;
  return { past: [...h.past, h.present].slice(-MAX_UNDO), present: next, future: [] };
}

export function undo(h: History): History {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}

export function redo(h: History): History {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}
