import type { Piece } from '@learn/shared';
import { api } from '../../../lib/api';
import type { PieceSummary, StoredPiece } from './types';

export const piecesApi = {
  list: (subject: string) => api<PieceSummary[]>(`/pieces?subject=${encodeURIComponent(subject)}`),
  get: (id: number) => api<StoredPiece>(`/pieces/${id}`),
  create: (subject: string, piece: Piece) => api<{ id: number }>('/pieces', { method: 'POST', json: { subject, piece } }),
  rename: (id: number, title: string) => api(`/pieces/${id}`, { method: 'PATCH', json: { title } }),
  remove: (id: number) => api(`/pieces/${id}`, { method: 'DELETE' }),
};

export type FileKind = 'midi' | 'musicxml' | 'audio';

export function fileKind(file: File): FileKind | null {
  if (/\.(mid|midi)$/i.test(file.name)) return 'midi';
  if (/\.(musicxml|xml|mxl)$/i.test(file.name)) return 'musicxml';
  if (file.type.startsWith('audio/') || file.type.startsWith('video/') || /\.(mp3|wav|ogg|oga|flac|m4a|aac|mp4|webm|mov)$/i.test(file.name)) return 'audio';
  return null;
}

export const ACCEPT = '.mid,.midi,.musicxml,.xml,.mxl,audio/*,video/*';
