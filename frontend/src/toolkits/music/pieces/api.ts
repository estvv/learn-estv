import { renderScore, type Piece, type PieceEdits, type PieceLevel, type PieceNote, type PieceSection, type Score } from '@learn/shared';
import { api } from '../../../lib/api';
import type { PieceChange } from './derive';
import type { PieceFolder, PieceMeta, PieceSummary, StoredPiece } from './types';

export const piecesApi = {
  list: (subject: string) => api<PieceSummary[]>(`/pieces?subject=${encodeURIComponent(subject)}`),
  get: (id: number) => api<StoredPiece>(`/pieces/${id}`),
  create: (subject: string, piece: Piece, extra: Partial<Pick<PieceMeta, 'folder_id' | 'difficulty' | 'description'>> = {}) =>
    api<{ id: number }>('/pieces', { method: 'POST', json: { subject, piece, ...extra } }),
  createScore: (subject: string, piece: Pick<Piece, 'title' | 'artist'>, score: Score, extra: Partial<Pick<PieceMeta, 'folder_id' | 'difficulty'>>) =>
    api<{ id: number }>('/pieces', { method: 'POST', json: { subject, piece: { ...piece, source: 'manual', bpm: score.bpm, notes: renderScore(score).notes }, score, ...extra } }),
  saveScore: (id: number, score: Score) => api(`/pieces/${id}/score`, { method: 'PUT', json: { score } }),
  // Answers the cover, searched again when the title or artist changed.
  // cover: picked by hand (from a link); left out, it follows the title and artist.
  update: (id: number, meta: Partial<PieceMeta> & { cover?: string | null; tracks_enabled?: boolean[]; level?: PieceLevel; sections?: PieceSection[] | null; edits?: PieceEdits | null }) => api<{ cover: string | null }>(`/pieces/${id}`, { method: 'PATCH', json: meta }),
  remove: (id: number) => api(`/pieces/${id}`, { method: 'DELETE' }),
  // Corrected notes replace the piece's.
  saveNotes: (id: number, change: { notes: PieceNote[]; sections?: PieceSection[] | null; edits?: PieceEdits | null }) => api(`/pieces/${id}/notes`, { method: 'PUT', json: change }),
  // What changeOf (derive.ts) says to save.
  saveChange: (id: number, { notes, ...rest }: PieceChange): Promise<unknown> => (notes ? piecesApi.saveNotes(id, { notes, ...rest }) : piecesApi.update(id, rest)),
  coverFromLink: (link: string, signal?: AbortSignal) =>
    api<{ cover: string | null }>(`/pieces/cover?${new URLSearchParams({ link })}`, { signal }),
  findCover: (title: string, artist: string | null, signal?: AbortSignal) =>
    api<{ cover: string | null }>(`/pieces/cover?${new URLSearchParams({ title, ...(artist ? { artist } : {}) })}`, { signal }),
};

export const foldersApi = {
  list: (subject: string) => api<PieceFolder[]>(`/pieces/folders?subject=${encodeURIComponent(subject)}`),
  create: (subject: string, name: string, parent_id: number | null = null) =>
    api<{ id: number }>('/pieces/folders', { method: 'POST', json: { subject, name, parent_id } }),
  // Rename, or move into another folder (parent_id null: top level).
  update: (id: number, change: { name?: string; parent_id?: number | null }) => api(`/pieces/folders/${id}`, { method: 'PATCH', json: change }),
  reorder: (ids: number[]) => api('/pieces/folders/order', { method: 'PUT', json: { ids } }),
  remove: (id: number) => api(`/pieces/folders/${id}`, { method: 'DELETE' }),
};

export type FileKind = 'midi' | 'musicxml' | 'audio';

export function fileKind(file: File): FileKind | null {
  if (/\.(mid|midi)$/i.test(file.name)) return 'midi';
  if (/\.(musicxml|xml|mxl)$/i.test(file.name)) return 'musicxml';
  if (file.type.startsWith('audio/') || file.type.startsWith('video/') || /\.(mp3|wav|ogg|oga|flac|m4a|aac|mp4|webm|mov)$/i.test(file.name)) return 'audio';
  return null;
}

export const ACCEPT = '.mid,.midi,.musicxml,.xml,.mxl,audio/*,video/*';
