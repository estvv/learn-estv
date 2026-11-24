import { describe, expect, it } from 'vitest';
import { addNotes, addPart, emptyScore, moveInOrder, partOf } from './score';
import { locate, moveNote, offsetsOf, sheetOf, spill } from './roll';

// A and B, of 8 beats, 2 columns each.
const two = () => addPart(addNotes(emptyScore(), 'A', [{ hand: 'right', midi: 60, step: 3, length: 1 }]), 'A', false).score;

describe('the parts as one sheet', () => {
  it('lays them in the order they are played, the others at the end', () => {
    const s = two();
    expect(sheetOf(s).map((p) => p.label)).toEqual(['A', 'B']);
    expect(sheetOf(moveInOrder(s, 0, 1)).map((p) => p.label)).toEqual(['B', 'A']);
    expect(sheetOf({ ...s, order: ['B', 'B'] }).map((p) => p.label)).toEqual(['B', 'B', 'A']);
  });

  it('finds the part of a place', () => {
    const offsets = offsetsOf(sheetOf(two()), 2);
    expect(offsets).toEqual([0, 16, 32]);
    expect([0, 15.9, 16, 31, 40].map((at) => locate(offsets, at))).toEqual([
      { index: 0, step: 0 }, { index: 0, step: 15.9 }, { index: 1, step: 0 }, { index: 1, step: 15 }, { index: 1, step: 24 },
    ]);
  });

  it('moves a note to another part', () => {
    const s = two();
    const note = s.parts[0].notes[0];
    const moved = moveNote(s, { index: 0, note }, { index: 1, note: { ...note, step: 2 } });
    expect([moved.parts[0].notes, moved.parts[1].notes]).toEqual([[], [{ ...note, step: 2 }]]);
  });

  it('goes on in the next part what is written past the end of one', () => {
    const s = two();
    const long = addNotes(s, 'A', [{ hand: 'left', midi: 40, step: 18, length: 1 }]);
    const out = spill(s, long, 0);
    expect(partOf(out, 'A').beats).toBe(8);
    expect(partOf(out, 'A').notes).toHaveLength(1);
    expect(partOf(out, 'B').notes).toEqual([{ hand: 'left', midi: 40, step: 2, length: 1 }]);
    // The last one gets longer.
    const last = addNotes(s, 'B', [{ hand: 'left', midi: 40, step: 18, length: 1 }]);
    expect(partOf(spill(s, last, 1), 'B').beats).toBe(12);
  });
});
