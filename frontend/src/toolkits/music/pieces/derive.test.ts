import type { Hand, PieceNote } from '@learn/shared';
import { describe, expect, it } from 'vitest';
import { changeOf, editable, layoutOf, levelNotes, numbersOf, playedSpan, untouched, visible } from './derive';
import type { StoredPiece } from './types';

const n = (midi: number, beat: number, hand: Hand = 'left', track?: number): PieceNote =>
  ({ midi, time: beat * 0.5, duration: 0.45, velocity: 0.7, hand, ...(track === undefined ? {} : { track }) });
const piece = (notes: PieceNote[], more: Partial<StoredPiece> = {}): StoredPiece =>
  ({ id: 1, subject: 'piano', title: 'x', source: 'midi', bpm: 120, notes, ...more });

// What is seen: "midi=number", in order.
const numbers = (p: StoredPiece, notes = levelNotes(p)) => {
  const { numbers: of } = numbersOf(notes, layoutOf(p));
  return notes.map((x) => `${x.midi}=${of.get(x)}`).join(' ');
};

// Left hand: chords C E G, then F A C.
const chords = [n(48, 0), n(52, 0), n(55, 0), n(53, 1), n(57, 1), n(48, 2), n(60, 2)];

describe('from a piece to its numbers', () => {
  it('follows the level', () => {
    expect(numbers(piece(chords))).toBe('48=1 52=2 55=3 53=4 57=5 48=1 60=6');
    expect(numbers(piece(chords, { level: 'simplified' }))).toBe('48=1 53=2 48=1');
  });

  it('follows the tracks', () => {
    const notes = [n(48, 0, 'left', 0), n(50, 1, 'left', 1), n(52, 2, 'left', 0), n(50, 3, 'left', 1)];
    const tracks = (a: boolean, b: boolean) => [{ name: 'a', instrument: null, enabled: a }, { name: 'b', instrument: null, enabled: b }];
    expect(numbers(piece(notes, { tracks: tracks(true, true) }))).toBe('48=1 50=2 52=3 50=2');
    expect(numbers(piece(notes, { tracks: tracks(true, false) }))).toBe('48=1 52=2');
    expect(numbers(piece(notes, { tracks: tracks(false, true) }))).toBe('50=1 50=1');
  });

  it('follows a note removed or added, at the original level', () => {
    const p = piece([n(48, 0), n(50, 1), n(52, 2)]);
    const without = { ...p, ...changeOf(p, p.notes.slice(1)) };
    expect(numbers(without)).toBe('50=1 52=2');
    const withNew = { ...p, ...changeOf(p, [n(40, 0), ...p.notes.slice(1)]) };
    expect(numbers(withNew)).toBe('40=1 50=2 52=3');
  });

  it('keeps changes to an easier level apart from the piece and the other levels', () => {
    const p = piece(chords, { level: 'simplified' });
    const wanted = levelNotes(p).filter((x) => x.midi !== 53).concat(n(50, 1));
    const changed = { ...p, ...changeOf(p, wanted) };
    expect(numbers(changed)).toBe('48=1 50=2 48=1');
    expect(changed.notes).toBe(p.notes);
    expect(numbers({ ...changed, level: 'original' })).toBe(numbers(piece(chords)));
    expect(levelNotes({ ...changed, level: 'melody' })).toEqual([]);
    // Back to the level as worked out: nothing left to remember.
    expect(changeOf(changed, untouched(changed)).edits).toBeNull();
  });

  it('keeps what was decided about a track while it is off', () => {
    const notes = [n(48, 0, 'left', 0), n(50, 1, 'left', 1)];
    const tracks = (b: boolean) => [{ name: 'a', instrument: null, enabled: true }, { name: 'b', instrument: null, enabled: b }];
    const p = piece(notes, { level: 'simplified', tracks: tracks(true) });
    // With both on: the second track's note goes, another comes.
    const both = { ...p, ...changeOf(p, [levelNotes(p)[0], n(53, 1, 'left', 1)]) };
    expect(numbers(both)).toBe('48=1 53=2');
    // Then the first track is changed alone.
    const off = { ...both, tracks: tracks(false) };
    expect(numbers(off)).toBe('48=1');
    const again = { ...off, ...changeOf(off, [n(47, 0, 'left', 0)]), tracks: tracks(true) };
    expect(numbers(again)).toBe('47=1 53=2');
  });

  it('edits hidden tracks along with the rest, unseen', () => {
    const notes = [n(48, 0, 'left', 0), n(50, 1, 'left', 1)];
    const p = piece(notes, { tracks: [{ name: 'a', instrument: null, enabled: true }, { name: 'b', instrument: null, enabled: false }] });
    expect(editable(p)).toHaveLength(2);
    expect(visible(p, editable(p)).map((x) => x.midi)).toEqual([48]);
  });

  it('moves parts and changes when the start is cut', () => {
    const p = piece(chords, {
      sections: [{ start: 0, label: 'A' }, { start: 0.5, label: 'B' }],
      edits: { simplified: { removed: [{ midi: 53, time: 0.5 }], added: [n(40, 0)] } },
    });
    const change = changeOf(p, chords.slice(3).map((x) => ({ ...x, time: x.time - 0.5 })), 0.5);
    expect(change.sections).toEqual([{ start: 0, label: 'B' }]);
    expect(change.edits).toEqual({ simplified: { removed: [{ midi: 53, time: 0 }], added: [] } });
  });

  it('leaves no silence at the start once its first notes are deleted', () => {
    const p = piece(chords, { sections: [{ start: 0, label: 'A' }, { start: 1, label: 'B' }] });
    const change = changeOf(p, chords.slice(3));
    expect(change.notes?.map((x) => x.time)).toEqual([0, 0, 0.5, 0.5]);
    expect(change.sections).toEqual([{ start: 0, label: 'A' }, { start: 0.5, label: 'B' }]);
    expect(changeOf(p, chords.slice(1))).toEqual({ notes: chords.slice(1) });
  });

  it('plays from the first note heard to the last', () => {
    const notes = [n(30, 0, 'left', 1), n(48, 4, 'left', 0), n(50, 6, 'left', 0), n(30, 20, 'left', 1)];
    const p = piece(notes, { tracks: [{ name: 'a', instrument: null, enabled: true }, { name: 'b', instrument: null, enabled: false }] });
    expect(playedSpan(p, levelNotes(p), 10.45)).toEqual([2, 3.45]);
    expect(playedSpan(piece(notes), notes, 10.45)).toEqual([0, 10.45]);
    expect(playedSpan(piece([]), [], 5)).toEqual([0, 5]);
  });
});
