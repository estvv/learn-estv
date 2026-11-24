import type { Hand, PieceNote } from '@learn/shared';
import { describe, expect, it } from 'vitest';
import { BeatGrid } from './grid';
import { numberPiece, partAt, partText } from './numbers';

const n = (midi: number, beat: number, hand: Hand | null = 'left'): PieceNote => ({ midi, time: beat * 0.5, duration: 0.4, velocity: 0.7, hand });
const grid = BeatGrid.regular(0, 0.5);
const text = (notes: PieceNote[]) => partText(numberPiece(notes, [], grid).parts[0]);

describe('numbers', () => {
  it('numbers keys in the order they are first pressed', () => {
    // G Bb D, F A C, Eb G Bb: the G and the Bb come back with their number.
    const keys = [55, 58, 62, 53, 57, 60, 51, 55, 58];
    const notes = keys.map((k, i) => n(k, i));
    const { numbers, parts } = numberPiece(notes, [], grid);
    expect(notes.map((x) => numbers.get(x))).toEqual([1, 2, 3, 4, 5, 6, 7, 1, 2]);
    expect(parts[0].keys.map((k) => `${k.midi}=${k.number}`).join(' ')).toBe('55=1 58=2 62=3 53=4 57=5 60=6 51=7');
  });

  it('starts each hand at 1, left first, and writes the rhythm', () => {
    expect(text([n(43, 0), n(50, 2), n(74, 0, 'right'), n(72, 1.5, 'right'), n(74, 3.5, 'right')])).toBe([
      '    1  .  2  .  3  .  4  .',
      'G : 1           2',
      'D : 1        2           1',
    ].join('\n'));
  });

  it('joins a chord with +, lowest key first', () => {
    expect(text([n(55, 0), n(50, 0.02), n(58, 0.04), n(50, 1)])).toBe('    1      2  3  4\nG : 1+2+3  1');
  });

  it('goes by pitch when the hand is unknown', () => {
    expect(numberPiece([n(40, 0, null), n(70, 0, null)], [], grid).parts[0].rows.map((r) => r.hand)).toEqual(['left', 'right']);
  });

  it('starts again at 1 in each part; the same letter shares its numbers', () => {
    const notes = [n(50, 0), n(52, 1), n(60, 4), n(50, 5), n(52, 8), n(50, 9), n(53, 10)];
    const sections = [{ start: 0, end: 2, label: 'A' }, { start: 2, end: 4, label: 'B' }, { start: 4, end: 6, label: 'A' }];
    const { numbers, parts } = numberPiece(notes, sections, grid);
    expect(notes.map((x) => numbers.get(x))).toEqual([1, 2, 1, 2, 2, 1, 3]);
    expect(parts.map((p) => p.columns)).toEqual([4, 4, 4]);
    expect(partAt(parts, 1.99)).toBe(1);
    expect(partAt(parts, 1)).toBe(0);
  });

  it('gives a note a hair early to the part it opens', () => {
    const early = { ...n(60, 4), time: 1.97 };
    const { parts } = numberPiece([n(50, 0), early], [{ start: 0, end: 2, label: 'A' }, { start: 2, end: 4, label: 'B' }], grid);
    expect(parts[1].rows[0].steps[0].step).toBe(0);
  });

  it('writes triplets on thirds, and loose eighths on halves', () => {
    const triplets = Array.from({ length: 24 }, (_, i) => n(60, i / 3));
    expect(numberPiece(triplets, [], grid).parts[0].division).toBe(3);
    const loose = Array.from({ length: 16 }, (_, i) => n(60, i / 2 + 0.04 * Math.sin(i * 9)));
    expect(numberPiece(loose, [], grid).parts[0].division).toBe(2);
  });

  it('handles parts cut in the middle of a bar, and empty ones', () => {
    const sections = [{ start: 0, end: 1, label: 'A' }, { start: 1, end: 3, label: 'B' }, { start: 3, end: 5, label: 'C' }];
    const { parts } = numberPiece([n(50, 0), n(52, 7)], sections, grid);
    expect(parts.map((p) => p.columns / p.division)).toEqual([2, 4, 4]);
    expect(parts[1].rows).toEqual([]);
    expect(partText(parts[0])).toBe('    1  2\nG : 1');
  });
});
