// Which folders to open so that one piece shows, and nothing more: its folder
// and the folders above it (needed to reach it), never their other subfolders.

export type FolderKey = number | 'none';

export function foldersToReveal(
  pieceId: number | null,
  pieces: { id: number; folder_id: number | null }[],
  folders: { id: number; parent_id: number | null }[],
): FolderKey[] {
  if (pieceId === null) return [];
  const piece = pieces.find((p) => p.id === pieceId);
  if (!piece) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  // Out of any folder, or in one that no longer exists: the "none" group.
  if (piece.folder_id === null || !byId.has(piece.folder_id)) return folders.length ? ['none'] : [];
  const path: number[] = [];
  // `seen` guards against a broken tree (a folder listed as its own ancestor).
  const seen = new Set<number>();
  for (let at: number | null = piece.folder_id; at !== null && byId.has(at) && !seen.has(at); at = byId.get(at)!.parent_id) {
    seen.add(at);
    path.push(at);
  }
  return path.reverse();
}
