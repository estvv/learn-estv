import type { Hand, PieceNote } from '@learn/shared';
import { Midi } from '@tonejs/midi';
import type { ImportResult } from './types';

// Standard MIDI file. @tonejs/midi already converts ticks to seconds with
// every tempo change applied.
export async function importMidi(file: File): Promise<ImportResult> {
  const midi = new Midi(await file.arrayBuffer());
  // Drums (channel 10) are not playable on a piano.
  const tracks = midi.tracks.filter((t) => t.notes.length > 0 && t.channel !== 9);
  if (tracks.length === 0) throw new Error('Aucune note jouable dans ce fichier MIDI');

  // Two or more tracks: the highest one is the right hand, the others the
  // left. A single track (both hands mixed) is split at middle C.
  const avg = (t: (typeof tracks)[number]) => t.notes.reduce((s, n) => s + n.midi, 0) / t.notes.length;
  const right = tracks.length > 1 ? tracks.reduce((a, b) => (avg(b) > avg(a) ? b : a)) : null;

  const notes: PieceNote[] = tracks.flatMap((t) => t.notes.map((n) => {
    const hand: Hand = right ? (t === right ? 'right' : 'left') : n.midi >= 60 ? 'right' : 'left';
    return { midi: n.midi, time: n.time, duration: Math.max(0.05, n.duration), velocity: n.velocity, hand };
  }));

  return {
    title: midi.name?.trim() || file.name.replace(/\.(mid|midi)$/i, ''),
    source: 'midi',
    bpm: midi.header.tempos[0]?.bpm ? Math.round(midi.header.tempos[0].bpm) : null,
    notes,
    warnings: tracks.length === 1 ? ['Une seule piste : les mains sont devinées (au-dessus ou en dessous du Do central).'] : [],
  };
}
