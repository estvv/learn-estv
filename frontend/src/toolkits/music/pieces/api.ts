import type { Piece } from '@learn/shared';
import { api } from '../../../lib/api';
import type { PieceFolder, PieceMeta, PieceSummary, StoredPiece } from './types';

export const piecesApi = {
  list: (subject: string) => api<PieceSummary[]>(`/pieces?subject=${encodeURIComponent(subject)}`),
  get: (id: number) => api<StoredPiece>(`/pieces/${id}`),
  create: (subject: string, piece: Piece, extra: Partial<Pick<PieceMeta, 'folder_id' | 'difficulty'>> = {}) =>
    api<{ id: number }>('/pieces', { method: 'POST', json: { subject, piece, ...extra } }),
  // Answers the cover, searched again when the title or artist changed.
  // cover: picked by hand (from a link); left out, it follows the title and artist.
  update: (id: number, meta: Partial<PieceMeta> & { cover?: string | null }) => api<{ cover: string | null }>(`/pieces/${id}`, { method: 'PATCH', json: meta }),
  remove: (id: number) => api(`/pieces/${id}`, { method: 'DELETE' }),
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
