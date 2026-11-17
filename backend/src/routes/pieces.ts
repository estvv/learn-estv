import express, { Router } from 'express';
import { pieceDifficulties, pieceDuration, pieceNoteSchema, pieceSchema } from '@learn/shared';
import { z } from 'zod';
import { requireUser } from '../auth/session.js';
import { coverFromLink, isCatalogImage, type CoverFinder } from '../covers.js';
import type { DB } from '../db/index.js';

// Imported pieces are private to their owner: often copyrighted songs, never
// shown to other accounts or guests. The owner sorts them into folders (in
// their order of priority) and tags how hard each one is.

const folderId = z.number().int().positive().nullable();
const difficulty = z.enum(pieceDifficulties).nullable();
const description = z.string().trim().max(200).nullable();

const createBody = z.object({
  subject: z.string().min(1).max(64),
  piece: pieceSchema,
  folder_id: folderId.optional(),
  difficulty: difficulty.optional(),
  description: description.optional(),
});
const updateBody = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  artist: z.string().trim().max(120).nullable().optional(),
  description: description.optional(),
  folder_id: folderId.optional(),
  difficulty: difficulty.optional(),
  // Which tracks are on, one flag per track of the piece.
  tracks_enabled: z.array(z.boolean()).max(64).optional(),
  // Cover picked by hand (from a link): a catalogue image, or null for none.
  cover: z.string().url().max(500).refine(isCatalogImage).nullable().optional(),
}).refine((b) => Object.values(b).some((v) => v !== undefined));

const folderName = z.string().trim().min(1).max(60);
const folderCreate = z.object({ subject: z.string().min(1).max(64), name: folderName, parent_id: folderId.optional() });
const folderUpdate = z.object({ name: folderName.optional(), parent_id: folderId.optional() })
  .refine((b) => b.name !== undefined || b.parent_id !== undefined);
const folderOrder = z.object({ ids: z.array(z.number().int().positive()).max(500) });

// Empty artist: none.
const artistOrNull = (a: string | null | undefined) => a?.trim() || null;
const textOrNull = artistOrNull;

// Pieces imported before covers existed get one when the list is next opened,
// a few at a time, in the background.
const BACKFILL = 5;

export function pieceRoutes(db: DB, findCover: CoverFinder) {
  const router = Router();
  router.use(requireUser);

  const searching = new Set<number>();
  const backfill = (userId: number) => {
    const rows = db.prepare('SELECT id, title, artist FROM pieces WHERE user_id = ? AND cover IS NULL LIMIT ?')
      .all(userId, BACKFILL) as { id: number; title: string; artist: string | null }[];
    for (const r of rows) {
      if (searching.has(r.id)) continue;
      searching.add(r.id);
      void findCover(r.title, r.artist)
        .then((url) => db.prepare('UPDATE pieces SET cover = ? WHERE id = ? AND cover IS NULL').run(url ?? '', r.id))
        .finally(() => searching.delete(r.id));
    }
  };

  const ownsFolder = (id: number | null | undefined, userId: number) =>
    id == null || !!db.prepare('SELECT 1 FROM piece_folders WHERE id = ? AND user_id = ?').get(id, userId);

  // --- Folders (before /:id, which would catch "folders") ---------------------
  // A tree: each folder has a parent (or none) and a position among the
  // folders of that parent, its order of priority.

  type FolderRow = { id: number; subject: string; parent_id: number | null };
  const folder = (id: number, userId: number) =>
    db.prepare('SELECT id, subject_id AS subject, parent_id FROM piece_folders WHERE id = ? AND user_id = ?').get(id, userId) as FolderRow | undefined;
  const nextPosition = (userId: number, subject: string, parent: number | null) =>
    ((db.prepare('SELECT MAX(position) AS last FROM piece_folders WHERE user_id = ? AND subject_id = ? AND parent_id IS ?')
      .get(userId, subject, parent) as { last: number | null }).last ?? -1) + 1;
  // Moving `id` under `parent` must not put a folder inside itself.
  const createsCycle = (id: number, parent: number | null, userId: number) => {
    for (let at = parent; at !== null; at = folder(at, userId)?.parent_id ?? null) if (at === id) return true;
    return false;
  };

  router.get('/folders', (req, res) => {
    const subject = typeof req.query.subject === 'string' ? req.query.subject : null;
    const rows = db.prepare(`
      SELECT id, subject_id AS subject, name, parent_id, position FROM piece_folders
      WHERE user_id = ? AND (? IS NULL OR subject_id = ?) ORDER BY position, id
    `).all(req.user!.id, subject, subject);
    res.json({ success: true, data: rows });
  });

  router.post('/folders', (req, res) => {
    const parsed = folderCreate.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Nom de dossier invalide' });
    const { subject, name } = parsed.data;
    const parent = parsed.data.parent_id ?? null;
    if (parent !== null && folder(parent, req.user!.id)?.subject !== subject) return void res.status(400).json({ success: false, error: 'Dossier parent introuvable' });
    const r = db.prepare('INSERT INTO piece_folders (user_id, subject_id, name, parent_id, position, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user!.id, subject, name, parent, nextPosition(req.user!.id, subject, parent), Date.now());
    res.status(201).json({ success: true, data: { id: Number(r.lastInsertRowid) } });
  });

  // New order of priority among sibling folders: their ids, most important first.
  router.put('/folders/order', (req, res) => {
    const parsed = folderOrder.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Ordre invalide' });
    const set = db.prepare('UPDATE piece_folders SET position = ? WHERE id = ? AND user_id = ?');
    db.transaction(() => parsed.data.ids.forEach((id, i) => set.run(i, id, req.user!.id)))();
    res.json({ success: true });
  });

  // Rename, or move into another folder (parent_id null: top level).
  router.patch('/folders/:id', (req, res) => {
    const parsed = folderUpdate.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Dossier invalide' });
    const id = Number(req.params.id);
    const current = folder(id, req.user!.id);
    if (!current) return void res.status(404).json({ success: false, error: 'Dossier introuvable' });
    const { name, parent_id } = parsed.data;
    if (parent_id !== undefined && parent_id !== current.parent_id) {
      if (parent_id !== null && folder(parent_id, req.user!.id)?.subject !== current.subject) return void res.status(400).json({ success: false, error: 'Dossier parent introuvable' });
      if (createsCycle(id, parent_id, req.user!.id)) return void res.status(400).json({ success: false, error: 'Un dossier ne peut pas aller dans un de ses sous-dossiers' });
      db.prepare('UPDATE piece_folders SET parent_id = ?, position = ? WHERE id = ?').run(parent_id, nextPosition(req.user!.id, current.subject, parent_id), id);
    }
    if (name !== undefined) db.prepare('UPDATE piece_folders SET name = ? WHERE id = ?').run(name, id);
    res.json({ success: true });
  });

  // Nothing is lost: the folder's pieces and subfolders move up to its parent.
  router.delete('/folders/:id', (req, res) => {
    const id = Number(req.params.id);
    const current = folder(id, req.user!.id);
    if (!current) return void res.json({ success: true });
    db.transaction(() => {
      db.prepare('UPDATE pieces SET folder_id = ? WHERE folder_id = ? AND user_id = ?').run(current.parent_id, id, req.user!.id);
      const children = db.prepare('SELECT id FROM piece_folders WHERE parent_id = ? ORDER BY position, id').all(id) as { id: number }[];
      let at = nextPosition(req.user!.id, current.subject, current.parent_id);
      for (const c of children) db.prepare('UPDATE piece_folders SET parent_id = ?, position = ? WHERE id = ?').run(current.parent_id, at++, c.id);
      db.prepare('DELETE FROM piece_folders WHERE id = ?').run(id);
    })();
    res.json({ success: true });
  });

  // --- Pieces ------------------------------------------------------------------

  // Cover preview while editing, nothing saved: searched from a title and
  // artist, or read from a Deezer / Apple Music link.
  router.get('/cover', async (req, res) => {
    const parsed = z.union([
      z.object({ link: z.string().trim().min(1).max(500) }),
      z.object({ title: z.string().trim().min(1).max(120), artist: z.string().trim().max(120).optional() }),
    ]).safeParse(req.query);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Titre ou lien invalide' });
    const q = parsed.data;
    const url = 'link' in q ? await coverFromLink(q.link) : await findCover(q.title, artistOrNull(q.artist));
    res.json({ success: true, data: { cover: url } });
  });

  router.get('/', (req, res) => {
    const subject = typeof req.query.subject === 'string' ? req.query.subject : null;
    const rows = db.prepare(`
      SELECT id, subject_id AS subject, title, artist, description, NULLIF(cover, '') AS cover, folder_id, difficulty, source, bpm, note_count, duration, created_at
      FROM pieces WHERE user_id = ? AND (? IS NULL OR subject_id = ?) ORDER BY created_at DESC
    `).all(req.user!.id, subject, subject);
    res.json({ success: true, data: rows });
    backfill(req.user!.id);
  });

  router.get('/:id', (req, res) => {
    const row = db.prepare(`SELECT id, subject_id AS subject, title, artist, description, NULLIF(cover, '') AS cover, folder_id, difficulty, source, bpm, tracks, data FROM pieces WHERE id = ? AND user_id = ?`)
      .get(Number(req.params.id), req.user!.id) as { data: string } & Record<string, unknown> | undefined;
    if (!row) return void res.status(404).json({ success: false, error: 'Morceau introuvable' });
    const { data, tracks, ...meta } = row;
    res.json({ success: true, data: { ...meta, tracks: tracks ? JSON.parse(tracks as string) : undefined, notes: JSON.parse(data) } });
  });

  // Large pieces exceed the global JSON limit.
  router.post('/', express.json({ limit: '8mb' }), async (req, res) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Morceau invalide' });
    const { subject, piece } = parsed.data;
    if (!ownsFolder(parsed.data.folder_id, req.user!.id)) return void res.status(400).json({ success: false, error: 'Dossier introuvable' });
    const notes = [...piece.notes].sort((a, b) => a.time - b.time || a.midi - b.midi);
    const now = Date.now();
    const artist = artistOrNull(piece.artist);
    const cover = (await findCover(piece.title, artist)) ?? '';
    const r = db.prepare(`
      INSERT INTO pieces (user_id, subject_id, title, artist, description, cover, folder_id, difficulty, source, bpm, tracks, data, note_count, duration, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user!.id, subject, piece.title, artist, textOrNull(parsed.data.description), cover, parsed.data.folder_id ?? null, parsed.data.difficulty ?? null,
      piece.source, piece.bpm, piece.tracks?.length ? JSON.stringify(piece.tracks) : null, JSON.stringify(notes), notes.length, pieceDuration(notes), now,
    );
    res.status(201).json({ success: true, data: { id: Number(r.lastInsertRowid) } });
  });

  // Only the fields sent change; null clears artist, folder and difficulty.
  // A new title or artist means a new cover search; the answer carries it.
  router.patch('/:id', async (req, res) => {
    const parsed = updateBody.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Modification invalide' });
    const b = parsed.data;
    if (!ownsFolder(b.folder_id, req.user!.id)) return void res.status(400).json({ success: false, error: 'Dossier introuvable' });
    const old = db.prepare('SELECT title, artist, cover, tracks FROM pieces WHERE id = ? AND user_id = ?')
      .get(Number(req.params.id), req.user!.id) as { title: string; artist: string | null; cover: string | null; tracks: string | null } | undefined;
    if (!old) return void res.status(404).json({ success: false, error: 'Morceau introuvable' });
    const sets: string[] = [];
    const values: unknown[] = [];
    if (b.title !== undefined) { sets.push('title = ?'); values.push(b.title); }
    if (b.artist !== undefined) { sets.push('artist = ?'); values.push(artistOrNull(b.artist)); }
    if (b.folder_id !== undefined) { sets.push('folder_id = ?'); values.push(b.folder_id); }
    if (b.difficulty !== undefined) { sets.push('difficulty = ?'); values.push(b.difficulty); }
    if (b.description !== undefined) { sets.push('description = ?'); values.push(textOrNull(b.description)); }
    if (b.tracks_enabled !== undefined) {
      const tracks = old.tracks ? (JSON.parse(old.tracks) as { enabled: boolean }[]) : [];
      if (b.tracks_enabled.length !== tracks.length) return void res.status(400).json({ success: false, error: 'Pistes invalides' });
      sets.push('tracks = ?');
      values.push(JSON.stringify(tracks.map((t, i) => ({ ...t, enabled: b.tracks_enabled![i] }))));
    }
    const title = b.title ?? old.title;
    const artist = b.artist !== undefined ? artistOrNull(b.artist) : old.artist;
    let cover = old.cover;
    if (b.cover !== undefined) {
      cover = b.cover ?? '';
      sets.push('cover = ?');
      values.push(cover);
    } else if (title !== old.title || artist !== old.artist) {
      cover = (await findCover(title, artist)) ?? '';
      sets.push('cover = ?');
      values.push(cover);
    }
    db.prepare(`UPDATE pieces SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...values, Number(req.params.id), req.user!.id);
    res.json({ success: true, data: { cover: cover || null } });
  });

  // Notes corrected in the player's editor: they replace the piece's.
  router.put('/:id/notes', express.json({ limit: '8mb' }), (req, res) => {
    const parsed = z.object({ notes: z.array(pieceNoteSchema).min(1).max(50_000) }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Notes invalides' });
    const row = db.prepare('SELECT tracks FROM pieces WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user!.id) as { tracks: string | null } | undefined;
    if (!row) return void res.status(404).json({ success: false, error: 'Morceau introuvable' });
    const trackCount = row.tracks ? (JSON.parse(row.tracks) as unknown[]).length : 0;
    if (parsed.data.notes.some((n) => n.track !== undefined && n.track >= trackCount)) return void res.status(400).json({ success: false, error: 'Piste inconnue' });
    const notes = [...parsed.data.notes].sort((a, b) => a.time - b.time || a.midi - b.midi);
    db.prepare('UPDATE pieces SET data = ?, note_count = ?, duration = ? WHERE id = ?')
      .run(JSON.stringify(notes), notes.length, pieceDuration(notes), Number(req.params.id));
    res.json({ success: true });
  });

  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM pieces WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user!.id);
    res.json({ success: true });
  });

  return router;
}
