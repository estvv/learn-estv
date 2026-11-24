import { describe, expect, it } from 'vitest';
import { addNote, commit, cutAfter, cutBefore, redo, removeNotes, startHistory, switchHand, transpose, undo, withIds, withoutIds, type EditNote } from './edit';

const notes = (): EditNote[] => withIds([
  { midi: 60, time: 0, duration: 1, velocity: 0.8, hand: 'right' },
  { midi: 64, time: 1, duration: 2, velocity: 0.8, hand: 'right' },
  { midi: 40, time: 2, duration: 1, velocity: 0.8, hand: 'left' },
  { midi: 22, time: 3, duration: 1, velocity: 0.8, hand: null, track: 1 },
]);
const ids = (...list: number[]) => new Set(list);

describe('note corrections', () => {
  it('removes the selected notes only', () => {
    expect(removeNotes(notes(), ids(1, 3)).map((n) => n.id)).toEqual([0, 2]);
  });

  it('transposes the selection as a whole, or not at all if a note would leave the piano', () => {
    expect(transpose(notes(), ids(0, 1), 12).map((n) => n.midi)).toEqual([72, 76, 40, 22]);
    const n = notes();
    expect(transpose(n, ids(0, 3), -2)).toBe(n); // 22 - 2 < A0
    expect(transpose(n, ids(), 1)).toBe(n);
  });

  it('switches hands: all right -> left, anything else -> right', () => {
    expect(switchHand(notes(), ids(0, 1)).map((n) => n.hand)).toEqual(['left', 'left', 'left', null]);
    expect(switchHand(notes(), ids(1, 2, 3)).map((n) => n.hand)).toEqual(['right', 'right', 'right', 'right']);
  });

  it('cuts before a time: earlier notes go, the rest moves back to 0', () => {
    expect(cutBefore(notes(), 1).map((n) => [n.id, n.time])).toEqual([[1, 0], [2, 1], [3, 2]]);
    const n = notes();
    expect(cutBefore(n, 0)).toBe(n);
  });

  it('cuts after a time: later notes go, a note still sounding stops there', () => {
    const cut = cutAfter(notes(), 2);
    expect(cut.map((n) => n.id)).toEqual([0, 1]);
    expect(cut[1].duration).toBe(1);
  });

  it('never changes its input, keeps the track and drops the ids on save', () => {
    const n = notes();
    const before = JSON.stringify(n);
    transpose(n, ids(0), 1);
    switchHand(n, ids(0));
    cutBefore(n, 1);
    expect(JSON.stringify(n)).toBe(before);
    expect(withoutIds(n)[3]).toEqual({ midi: 22, time: 3, duration: 1, velocity: 0.8, hand: null, track: 1 });
  });
});

describe('undo / redo', () => {
  it('walks back and forth, and a new change clears what could be redone', () => {
    let h = startHistory(notes());
    h = commit(h, removeNotes(h.present, ids(0)));
    h = commit(h, removeNotes(h.present, ids(1)));
    expect(h.present).toHaveLength(2);
    h = undo(h);
    expect(h.present).toHaveLength(3);
    h = undo(h);
    expect(h.present).toHaveLength(4);
    expect(undo(h)).toBe(h);
    h = redo(h);
    expect(h.present).toHaveLength(3);
    h = commit(h, removeNotes(h.present, ids(2)));
    expect(h.future).toHaveLength(0);
    expect(redo(h)).toBe(h);
  });

  it('ignores a change that changed nothing', () => {
    const h = startHistory(notes());
    expect(commit(h, h.present)).toBe(h);
  });

  it('adds a note in the hand playing around it, once', () => {
    const notes = withIds([
      { midi: 50, time: 1, duration: 0.5, velocity: 0.7, hand: 'left' },
      { midi: 72, time: 1, duration: 0.5, velocity: 0.7, hand: 'right' },
    ]);
    const more = addNote(notes, 59, 1.5, 0.2);
    expect(more.map((n) => [n.midi, n.hand])).toEqual([[50, 'left'], [72, 'right'], [59, 'left']]);
    expect(addNote(more, 59, 1.51, 0.2)).toBe(more);
    expect(new Set(addNote(more, 64, 0, 0.2, 1).map((n) => n.id)).size).toBe(4);
    // Nobody plays there: by pitch.
    expect(addNote(notes, 48, 30, 0.2)[2].hand).toBe('left');
    expect(addNote(notes, 110, 1, 0.2)).toBe(notes);
  });
});
