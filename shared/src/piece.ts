import { z } from 'zod';

// A playable piece, whatever it was imported from (MIDI, MusicXML, audio
// transcription). Times are in seconds at the original tempo, so tempo
// changes are already applied.

export const hands = ['right', 'left'] as const;
export type Hand = (typeof hands)[number];

export const pieceNoteSchema = z.object({
  midi: z.number().int().min(0).max(127),
  time: z.number().min(0),
  duration: z.number().positive(),
  velocity: z.number().min(0).max(1),
  // Unknown for most audio transcriptions and single-track MIDI files.
  hand: z.enum(hands).nullable(),
});

export const pieceSources = ['midi', 'musicxml', 'audio'] as const;

export const pieceSchema = z.object({
  title: z.string().trim().min(1).max(120),
  source: z.enum(pieceSources),
  // Beats per minute of the original, when known (MIDI, MusicXML).
  bpm: z.number().positive().nullable(),
  notes: z.array(pieceNoteSchema).min(1).max(50_000),
});

export type PieceNote = z.infer<typeof pieceNoteSchema>;
export type Piece = z.infer<typeof pieceSchema>;

export function pieceDuration(notes: PieceNote[]): number {
  return notes.reduce((end, n) => Math.max(end, n.time + n.duration), 0);
}
