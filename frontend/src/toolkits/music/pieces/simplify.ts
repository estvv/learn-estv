import type { Hand, PieceLevel, PieceNote } from '@learn/shared';

// Easier versions of a piece, worked out from its notes, the file untouched:
// - simplified: the right hand keeps the melody (highest note of each
//   chord), the left hand the bass (lowest note);
// - melody: the melody alone.
// Held notes stop when the same hand plays its next note, so pads and long
// chords no longer pile up.

// Notes starting this close together form one chord (as in the player).
const CHORD_WINDOW = 0.04;
const MIN_DURATION = 0.05;

// Notes without a hand (audio transcriptions) go by pitch around middle C.
export const handOf = (n: PieceNote): Hand => n.hand ?? (n.midi >= 60 ? 'right' : 'left');
const isRight = (n: PieceNote) => handOf(n) === 'right';

export function simplify(notes: PieceNote[], level: PieceLevel): PieceNote[] {
  if (level === 'original') return notes;
  const right = notes.filter(isRight);
  const melody = line(right, (a, b) => b.midi > a.midi);
  if (level === 'melody') return melody;
  const bass = line(notes.filter((n) => !isRight(n)), (a, b) => b.midi < a.midi);
  return [...melody, ...bass].sort((a, b) => a.time - b.time || a.midi - b.midi);
}

// One note at a time: per chord, the note `better` prefers; each note lasts
// at most until the next one.
function line(notes: PieceNote[], better: (a: PieceNote, b: PieceNote) => boolean): PieceNote[] {
  const sorted = [...notes].sort((a, b) => a.time - b.time);
  const picked: PieceNote[] = [];
  let start = -Infinity;
  for (const n of sorted) {
    const last = picked[picked.length - 1];
    if (last && n.time - start <= CHORD_WINDOW) {
      if (better(last, n)) picked[picked.length - 1] = n;
    } else {
      picked.push(n);
      start = n.time;
    }
  }
  return picked.map((n, i) => {
    const next = picked[i + 1];
    return next && n.time + n.duration > next.time ? { ...n, duration: Math.max(MIN_DURATION, next.time - n.time) } : n;
  });
}
