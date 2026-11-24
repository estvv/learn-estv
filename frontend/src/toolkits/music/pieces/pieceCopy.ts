import type { LyricLine, Piece, PieceDifficulty, PieceEdits, PieceLevel, PieceNumber, PieceSection, Score } from '@learn/shared';
import type { StoredPiece } from './types';

// Whole pieces as a line of text, to copy them from a site to another: local
// and online, or somebody else's account. Everything is in it but the folder.

export interface PieceCopy {
  piece: Piece;
  score?: Score;
  description: string | null;
  difficulty: PieceDifficulty | null;
  cover: string | null;
  level: PieceLevel;
  sections: PieceSection[] | null;
  edits: PieceEdits | null;
  numbers: PieceNumber[] | null;
  // Left out of those copied before there were any.
  lyrics?: LyricLine[] | null;
}

const MARK = 'learn-estv:morceaux:1:';
export const looksLikePieces = (text: string) => text.trim().startsWith('learn-estv:morceaux:');

export const copyOf = (p: StoredPiece): PieceCopy => ({
  piece: { title: p.title, artist: p.artist ?? null, source: p.source, bpm: p.bpm, notes: p.notes, ...(p.tracks?.length ? { tracks: p.tracks } : {}) },
  ...(p.score ? { score: p.score } : {}),
  description: p.description ?? null,
  difficulty: p.difficulty ?? null,
  cover: p.cover ?? null,
  level: p.level ?? 'original',
  sections: p.sections ?? null,
  edits: p.edits ?? null,
  numbers: p.numbers ?? null,
  lyrics: p.lyrics ?? null,
});

export async function encodePieces(pieces: PieceCopy[]): Promise<string> {
  const packed = await through(new TextEncoder().encode(JSON.stringify(pieces)), new CompressionStream('gzip'));
  let binary = '';
  for (let i = 0; i < packed.length; i += 0x8000) binary += String.fromCharCode(...packed.subarray(i, i + 0x8000));
  return MARK + btoa(binary);
}

export async function decodePieces(text: string): Promise<PieceCopy[]> {
  // Messages and mails cut long lines.
  const clean = text.replace(/\s+/g, '');
  if (!looksLikePieces(clean)) throw new Error('Ce n’est pas un morceau copié depuis cette app.');
  if (!clean.startsWith(MARK)) throw new Error('Ce morceau vient d’une version plus récente de l’app.');
  try {
    const packed = Uint8Array.from(atob(clean.slice(MARK.length)), (c) => c.charCodeAt(0));
    const pieces = JSON.parse(new TextDecoder().decode(await through(packed, new DecompressionStream('gzip')))) as PieceCopy[];
    if (!Array.isArray(pieces) || !pieces.length || !pieces.every((p) => p?.piece?.title && Array.isArray(p.piece.notes))) throw new Error();
    return pieces;
  } catch {
    throw new Error('Le texte est incomplet : recopie le morceau en entier.');
  }
}

async function through(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream as ReadableWritablePair<Uint8Array, BufferSource>));
  return new Uint8Array(await out.arrayBuffer());
}
