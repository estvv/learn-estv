import { cutStart, pieceDuration, renderScore, soundingSpan, trimSilence, type PieceContent, type PieceEdits, type PieceLevel, type PieceNote, type PieceSection } from '@learn/shared';
import { BeatGrid, beatGrid } from './grid';
import { applyEdit, editOf } from './levelEdits';
import { givenByScore, numberPiece, type Given, type NumberedPiece } from './numbers';
import { fromSaved } from './parts';
import { detectSections, type Section } from './sections';
import { simplify } from './simplify';
import type { StoredPiece } from './types';

// From a stored piece to what is shown, in one direction only:
//   notes -> tracks on -> level -> changes by hand -> numbers.
// Nothing in between is stored, so the numbers follow any change above them.

export const levelNames: Record<PieceLevel, string> = { original: 'Original', simplified: 'Simplifié', melody: 'Mélodie' };

export const levelOf = (piece: StoredPiece): PieceLevel => piece.level ?? 'original';

const trackOn = (piece: StoredPiece) => (track: number | undefined) => track === undefined || !piece.tracks || !!piece.tracks[track]?.enabled;

// The notes of the tracks turned on.
export function tracksOn(piece: StoredPiece, notes: PieceNote[] = piece.notes): PieceNote[] {
  const on = trackOn(piece);
  return piece.tracks ? notes.filter((n) => on(n.track)) : notes;
}

const plainLevel = (piece: StoredPiece) => simplify(tracksOn(piece), levelOf(piece));

// The notes of the piece's level, as listened to.
export function levelNotes(piece: StoredPiece): PieceNote[] {
  const level = levelOf(piece);
  return level === 'original' ? tracksOn(piece) : applyEdit(plainLevel(piece), piece.edits?.[level], trackOn(piece));
}

// Beats and parts. They come from the original notes: the same at every level.
export interface Layout {
  grid: BeatGrid;
  sections: Section[];
  duration: number;
  given: Given;
}

export function layoutOf(piece: StoredPiece): Layout {
  const base = tracksOn(piece);
  if (piece.score) {
    const { sections, duration } = renderScore(piece.score);
    return { grid: BeatGrid.regular(0, 60 / piece.score.bpm), sections: fromSaved(sections, duration), duration, given: givenByScore(piece.score) };
  }
  const duration = pieceDuration(piece.notes);
  const found = beatGrid(base, piece.bpm);
  const grid = found ?? BeatGrid.regular(base[0]?.time ?? 0, 0.5);
  if (piece.sections) return { grid, sections: fromSaved(piece.sections, duration), duration, given: {} };
  const auto = detectSections(base, piece.bpm, found);
  return { grid, sections: auto.length ? auto : [{ start: 0, end: duration, label: 'A' }], duration, given: {} };
}

export const numbersOf = (notes: PieceNote[], { grid, sections, given }: Layout, division?: number): NumberedPiece =>
  numberPiece(notes, sections, grid, division ? { ...given, division } : given);

// Where it is worth playing: not the silences around the notes heard. Those of
// a piece written by hand are wanted.
export const playedSpan = (piece: StoredPiece, notes: PieceNote[], duration: number): [number, number] =>
  (piece.score || !notes.length ? [0, duration] : soundingSpan(notes));

// --- Changing notes -----------------------------------------------------------------

// What an editor works on: the piece's own notes, hidden tracks included, at
// the original level; what the level shows at the others.
export const editable = (piece: StoredPiece) => (levelOf(piece) === 'original' ? piece.notes : levelNotes(piece));
export const visible = (piece: StoredPiece, edited: PieceNote[]) => (levelOf(piece) === 'original' ? tracksOn(piece, edited) : edited);
// The level without the changes made to it.
export const untouched = (piece: StoredPiece) => (levelOf(piece) === 'original' ? piece.notes : plainLevel(piece));

export type PieceChange = { notes?: PieceNote[]; sections?: PieceSection[] | null; edits?: PieceEdits | null };

// What saving the edited notes changes in the piece. `cut`: seconds taken off
// its start (original level only).
export function changeOf(piece: StoredPiece, edited: PieceNote[], cut = 0): PieceChange {
  const level = levelOf(piece);
  if (level !== 'original') {
    const edits: PieceEdits = { ...piece.edits };
    const edit = editOf(plainLevel(piece), edited, edits[level], trackOn(piece));
    if (edit) edits[level] = edit;
    else delete edits[level];
    return { edits: Object.keys(edits).length ? edits : null };
  }
  // `cut` is already off the notes: the rest follows. No silence is left at the start.
  const after: PieceContent = { notes: edited };
  if (Math.abs(cut) > 1e-6) {
    const rest = cutStart({ notes: [], sections: piece.sections, edits: piece.edits }, cut);
    if (piece.sections) after.sections = rest.sections;
    if (piece.edits) after.edits = rest.edits;
  }
  const trimmed = trimSilence({ notes: edited, sections: after.sections ?? piece.sections, edits: after.edits ?? piece.edits });
  if (trimmed.notes === edited) return after;
  return {
    notes: trimmed.notes,
    ...(piece.sections ? { sections: trimmed.sections } : {}),
    ...(piece.edits ? { edits: trimmed.edits } : {}),
  };
}
