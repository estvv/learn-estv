import type { Piece } from '@learn/shared';

export interface ImportResult extends Piece {
  // Things the user should know about the conversion.
  warnings: string[];
}

export interface PieceSummary {
  id: number;
  subject: string;
  title: string;
  source: Piece['source'];
  bpm: number | null;
  note_count: number;
  duration: number;
  created_at: number;
}

export interface StoredPiece extends Piece {
  id: number;
  subject: string;
}

export const sourceLabels: Record<Piece['source'], string> = {
  midi: 'MIDI',
  musicxml: 'Partition',
  audio: 'Audio',
};
