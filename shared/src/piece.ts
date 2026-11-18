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
  // Index in the piece's `tracks`, for files with several instruments.
  track: z.number().int().min(0).max(63).optional(),
});

// One instrument of a multi-track file (MIDI): every track is kept, the
// owner turns them on and off.
export const pieceTrackSchema = z.object({
  name: z.string().max(120),
  instrument: z.string().max(120).nullable(),
  enabled: z.boolean(),
});
export type PieceTrack = z.infer<typeof pieceTrackSchema>;

export const pieceSources = ['midi', 'musicxml', 'audio'] as const;

// How hard a piece feels to its owner, easiest first.
export const pieceDifficulties = ['easy', 'medium', 'hard', 'impossible'] as const;
export type PieceDifficulty = (typeof pieceDifficulties)[number];

// How much of a piece is shown and played: everything, the melody over the
// bass, or the melody alone (worked out in the player, the notes unchanged).
export const pieceLevels = ['original', 'simplified', 'melody'] as const;
export type PieceLevel = (typeof pieceLevels)[number];

export const pieceSchema = z.object({
  title: z.string().trim().min(1).max(120),
  // Performer or composer, when known.
  artist: z.string().trim().max(120).nullish(),
  source: z.enum(pieceSources),
  // Beats per minute of the original, when known (MIDI, MusicXML).
  bpm: z.number().positive().nullable(),
  notes: z.array(pieceNoteSchema).min(1).max(50_000),
  // Only for files with several instruments.
  tracks: z.array(pieceTrackSchema).max(64).optional(),
}).refine((p) => p.notes.every((n) => n.track === undefined || (p.tracks && n.track < p.tracks.length)), { message: 'Piste inconnue' });

export type PieceNote = z.infer<typeof pieceNoteSchema>;
export type Piece = z.infer<typeof pieceSchema>;

export function pieceDuration(notes: PieceNote[]): number {
  return notes.reduce((end, n) => Math.max(end, n.time + n.duration), 0);
}
