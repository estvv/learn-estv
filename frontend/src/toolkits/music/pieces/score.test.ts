import { renderScore, scoreSchema, type Score } from '@learn/shared';
import { describe, expect, it } from 'vitest';
import { BeatGrid } from './grid';
import { givenByScore, numberPiece, partText } from './numbers';
import { fromSaved } from './parts';
import {
  addPart, addToOrder, assignKey, emptyScore, hasNumber, moveInOrder, numberKey, parseRun, partOf, placeRun, placeTaps, quantizeTaps, removeFromOrder, removeKey, removePart, renamePart,
  runText, scoreGrid, setBeats, setCell, setDivision, shiftHand, unknownNumbers,
} from './score';

// The video's own numbers: 4 is G, 6 is Bb…
const keyed = (): Score => [[4, 67], [6, 70], [2, 63], [5, 69], [3, 65]].reduce((s, [n, m]) => assignKey(s, 'A', 'right', n, m), emptyScore());
const steps = (s: Score, label = 'A') => partOf(s, label).notes.map((n) => n.step);

describe('writing by hand', () => {
  it('reads runs of numbers', () => {
    expect(parseRun('4-4 6-2-5-3')).toEqual([[4], [4], [6], [2], [5], [3]]);
    expect(parseRun(' 1+3, 10 ')).toEqual([[1, 3], [10]]);
    expect(parseRun('4 x')).toBeNull();
    expect(parseRun('1+')).toBeNull();
    expect(parseRun('')).toEqual([]);
  });

  it('asks for the keys it does not know, then places the run', () => {
    const run = parseRun('4-4 6-2-5-3')!;
    expect(unknownNumbers(partOf(emptyScore(), 'A'), 'right', run)).toEqual([4, 6, 2, 5, 3]);
    const s = placeRun(keyed(), 'A', 'right', run, [0, 3, 4, 5, 6, 7]);
    expect(runText(partOf(s, 'A'), 'right')).toBe('4 4 6 2 5 3');
    expect(scoreSchema.safeParse(s).success).toBe(true);
    // The same run again replaces itself, and leaves the other hand alone.
    const both = placeRun(assignKey(s, 'A', 'left', 1, 43), 'A', 'left', [[1]], [0]);
    expect(placeRun(both, 'A', 'right', [[4]], [2]).parts[0].notes).toHaveLength(2);
  });

  it('makes the part longer, by whole bars, for a long run', () => {
    expect(placeRun(keyed(), 'A', 'right', [[4], [6]], [0, 16]).parts[0].beats).toBe(12);
  });

  it('moves a hand earlier or later, within the part', () => {
    const s = placeRun(keyed(), 'A', 'right', [[4], [6]], [0, 15]);
    expect(steps(shiftHand(s, 'A', 'right', -1))).toEqual([0, 15]);
    const later = shiftHand(s, 'A', 'right', 1);
    expect([steps(later), later.parts[0].beats]).toEqual([[1, 16], 12]);
    expect(steps(shiftHand(later, 'A', 'right', -1))).toEqual([0, 15]);
  });

  it('numbers new keys and moves a number to another key with its notes', () => {
    let s = setCell(emptyScore(), 'A', 'left', 0, [50, 43]);
    s = setCell(s, 'A', 'left', 2, [43]);
    expect(runText(partOf(s, 'A'), 'left')).toBe('2+1 2');
    s = assignKey(s, 'A', 'left', 2, 45);
    expect(partOf(s, 'A').notes.map((n) => n.midi).sort()).toEqual([45, 45, 50]);
    expect(runText(partOf(s, 'A'), 'left')).toBe('2+1 2');
    // Onto a key that had a number: one number per key.
    s = assignKey(s, 'A', 'left', 1, 45);
    expect(scoreSchema.safeParse(s).success).toBe(true);
    expect(setCell(s, 'A', 'left', 0, []).parts[0].notes).toHaveLength(1);
  });

  it('numbers keys without writing them', () => {
    let s = numberKey(emptyScore(), 'A', 'left', 50);
    s = numberKey(s, 'A', 'left', 47);
    expect(partOf(s, 'A').keys.map((k) => `${k.midi}=${k.number}`)).toEqual(['50=1', '47=2']);
    expect(partOf(s, 'A').notes).toEqual([]);
    expect(numberKey(s, 'A', 'left', 50)).toBe(s);
    expect([hasNumber(partOf(s, 'A'), 'left', 47), hasNumber(partOf(s, 'A'), 'right', 47)]).toEqual([true, false]);
  });

  it('takes a number away with its notes, in that hand and that part only', () => {
    let s = placeRun(keyed(), 'A', 'right', parseRun('4 6 4')!, [0, 1, 2]);
    s = assignKey(s, 'A', 'left', 4, 67);
    s = setCell(s, 'A', 'left', 0, [67]);
    s = addPart(s, 'A', true).score;
    const out = removeKey(s, 'A', 'right', 4);
    expect(runText(partOf(out, 'A'), 'right')).toBe('6');
    expect(partOf(out, 'A').keys.filter((k) => k.hand === 'right').map((k) => k.number)).toEqual([2, 3, 5, 6]);
    expect(runText(partOf(out, 'A'), 'left')).toBe('4');
    expect(runText(partOf(out, 'B'), 'right')).toBe('4 6 4');
    expect(scoreSchema.safeParse(out).success).toBe(true);
    // The number is free again.
    expect(runText(partOf(setCell(removeKey(out, 'A', 'right', 2), 'A', 'right', 5, [80]), 'A'), 'right')).toBe('6 1');
  });

  it('finds the rhythm of taps', () => {
    // 1 - - 1 1 1 at 0.3 s a column, a little off.
    const taps = [0, 0.91, 1.19, 1.52, 1.8, 2.41];
    const { unit, steps: s } = quantizeTaps(taps, null);
    expect(s).toEqual([0, 3, 4, 5, 6, 8]);
    expect(unit).toBeCloseTo(0.3, 1);
    // Slowing down does not add up.
    expect(quantizeTaps([0, 0.3, 0.61, 0.94, 1.29, 1.65], 0.3).steps).toEqual([0, 1, 2, 3, 4, 5]);
    expect(quantizeTaps([5], null).steps).toEqual([0]);
    // Even taps: one column each.
    expect(quantizeTaps([0, 0.5, 1.01, 1.5], null).steps).toEqual([0, 1, 2, 3]);
  });

  it('takes the tempo from the first hand tapped, and keeps it for the next', () => {
    const run = [[4], [4], [6], [2], [5]];
    const first = placeTaps(keyed(), 'A', 'right', run, [0, 0.9, 1.2, 1.5, 1.8]);
    expect(first.bpm).toBe(100);
    expect(steps(first)).toEqual([0, 3, 4, 5, 6]);
    const second = placeTaps(assignKey(first, 'A', 'left', 1, 43), 'A', 'left', [[1], [1], [1]], [0, 0.66, 1.3]);
    expect(second.bpm).toBe(100);
    expect(steps(second).slice(-3)).toEqual([0, 2, 4]);
    const fast = placeTaps(keyed(), 'A', 'right', run, [0, 0.12, 0.24, 0.36, 0.6]);
    expect([fast.division, fast.bpm]).toEqual([4, 125]);
  });

  it('builds the piece from parts and an order', () => {
    let s = setCell(emptyScore(), 'A', 'right', 0, [60]);
    const added = addPart(s, 'A', false);
    expect(added.label).toBe('B');
    expect(partOf(added.score, 'B').keys).toEqual(partOf(s, 'A').keys);
    s = addToOrder(setCell(added.score, 'B', 'right', 2, [62]), 'A');
    expect(s.order).toEqual(['A', 'B', 'A']);
    const { notes, sections, duration } = renderScore(s);
    expect(notes.map((n) => [n.midi, +n.time.toFixed(2)])).toEqual([[60, 0], [62, 5.4], [60, 9.6]]);
    expect(sections.map((x) => x.label)).toEqual(['A', 'B', 'A']);
    expect(duration).toBeCloseTo(14.4);
    expect(removePart(s, 'A').order).toEqual(['B']);
    expect(renamePart(s, 'A', 'Refrain').order).toEqual(['Refrain', 'B', 'Refrain']);
    expect(renamePart(s, 'A', 'B')).toBe(s);
    expect(moveInOrder(s, 0, 1).order).toEqual(['B', 'A', 'A']);
    expect(moveInOrder(s, 0, -1)).toBe(s);
    expect(removeFromOrder({ ...s, order: ['A'] }, 0).order).toEqual(['A']);
  });

  it('shows in the player with its own numbers, as it was written', () => {
    let s = placeRun(keyed(), 'A', 'right', parseRun('4-4 6-2-5-3')!, [1, 3, 4, 5, 6, 7]);
    s = { ...setBeats(s, 'A', 4), order: ['A', 'A'] };
    const { notes, sections, duration } = renderScore(s);
    const { parts } = numberPiece(notes, fromSaved(sections, duration), BeatGrid.regular(0, 60 / s.bpm), givenByScore(s));
    expect(parts).toHaveLength(2);
    expect(parts.map((p) => partText(p))).toEqual(Array(2).fill('    1  .  2  .  3  .  4  .\nD :    4     4  6  2  5  3'));
    expect(scoreGrid(s, 'A').columns).toBe(8);
  });

  it('changes the grid without moving notes in time', () => {
    const s = placeRun(keyed(), 'A', 'right', [[4], [6]], [1, 4]);
    expect(steps(setDivision(s, 4))).toEqual([2, 8]);
    expect(steps(setDivision(setDivision(s, 4), 2))).toEqual([1, 4]);
    expect(setBeats(s, 'A', 2).parts[0].notes).toHaveLength(1);
  });
});
