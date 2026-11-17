import express, { Router } from 'express';
import { pieceDifficulties, pieceDuration, pieceSchema } from '@learn/shared';
import { z } from 'zod';
import { requireUser } from '../auth/session.js';
import { coverFromLink, isCatalogImage, type CoverFinder } from '../covers.js';
import type { DB } from '../db/index.js';

// Imported pieces are private to their owner: often copyrighted songs, never
// shown to other accounts or guests. The owner sorts them into folders (in
// their order of priority) and tags how hard each one is.

const folderId = z.number().int().positive().nullable();
const difficulty = z.enum(pieceDifficulties).nullable();

const createBody = z.object({
  subject: z.string().min(1).max(64),
  piece: pieceSchema,
  folder_id: folderId.optional(),
  difficulty: difficulty.optional(),
});
const updateBody = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  artist: z.string().trim().max(120).nullable().optional(),
  folder_id: folderId.optional(),
  difficulty: difficulty.optional(),
  // Cover picked by hand (from a link): a catalogue image, or null for none.
  cover: z.string().url().max(500).refine(isCatalogImage).nullable().optional(),
}).refine((b) => Object.values(b).some((v) => v !== undefined));

const folderName = z.string().trim().min(1).max(60);
const folderCreate = z.object({ subject: z.string().min(1).max(64), name: folderName });
const folderOrder = z.object({ ids: z.array(z.number().int().positive()).max(500) });

// Empty artist: none.
const artistOrNull = (a: string | null | undefined) => a?.trim() || null;

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

  router.get('/folders', (req, res) => {
    const subject = typeof req.query.subject === 'string' ? req.query.subject : null;
    const rows = db.prepare(`
      SELECT id, subject_id AS subject, name, position FROM piece_folders
      WHERE user_id = ? AND (? IS NULL OR subject_id = ?) ORDER BY position, id
    `).all(req.user!.id, subject, subject);
    res.json({ success: true, data: rows });
  });

  router.post('/folders', (req, res) => {
    const parsed = folderCreate.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Nom de dossier invalide' });
    const { subject, name } = parsed.data;
    const { last } = db.prepare('SELECT MAX(position) AS last FROM piece_folders WHERE user_id = ? AND subject_id = ?')
      .get(req.user!.id, subject) as { last: number | null };
    const r = db.prepare('INSERT INTO piece_folders (user_id, subject_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(req.user!.id, subject, name, (last ?? -1) + 1, Date.now());
    res.status(201).json({ success: true, data: { id: Number(r.lastInsertRowid) } });
  });

  // New order of priority: the folders' ids, most important first.
  router.put('/folders/order', (req, res) => {
    const parsed = folderOrder.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Ordre invalide' });
    const set = db.prepare('UPDATE piece_folders SET position = ? WHERE id = ? AND user_id = ?');
    db.transaction(() => parsed.data.ids.forEach((id, i) => set.run(i, id, req.user!.id)))();
    res.json({ success: true });
  });

  router.patch('/folders/:id', (req, res) => {
    const parsed = z.object({ name: folderName }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Nom de dossier invalide' });
    const r = db.prepare('UPDATE piece_folders SET name = ? WHERE id = ? AND user_id = ?').run(parsed.data.name, Number(req.params.id), req.user!.id);
    if (!r.changes) return void res.status(404).json({ success: false, error: 'Dossier introuvable' });
    res.json({ success: true });
  });

  // The folder's pieces are kept, out of any folder.
  router.delete('/folders/:id', (req, res) => {
    const id = Number(req.params.id);
    db.transaction(() => {
      db.prepare('UPDATE pieces SET folder_id = NULL WHERE folder_id = ? AND user_id = ?').run(id, req.user!.id);
      db.prepare('DELETE FROM piece_folders WHERE id = ? AND user_id = ?').run(id, req.user!.id);
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
      SELECT id, subject_id AS subject, title, artist, NULLIF(cover, '') AS cover, folder_id, difficulty, source, bpm, note_count, duration, created_at
      FROM pieces WHERE user_id = ? AND (? IS NULL OR subject_id = ?) ORDER BY created_at DESC
    `).all(req.user!.id, subject, subject);
    res.json({ success: true, data: rows });
    backfill(req.user!.id);
  });

  router.get('/:id', (req, res) => {
    const row = db.prepare(`SELECT id, subject_id AS subject, title, artist, NULLIF(cover, '') AS cover, folder_id, difficulty, source, bpm, data FROM pieces WHERE id = ? AND user_id = ?`)
      .get(Number(req.params.id), req.user!.id) as { data: string } & Record<string, unknown> | undefined;
    if (!row) return void res.status(404).json({ success: false, error: 'Morceau introuvable' });
    const { data, ...meta } = row;
    res.json({ success: true, data: { ...meta, notes: JSON.parse(data) } });
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
      INSERT INTO pieces (user_id, subject_id, title, artist, cover, folder_id, difficulty, source, bpm, data, note_count, duration, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user!.id, subject, piece.title, artist, cover, parsed.data.folder_id ?? null, parsed.data.difficulty ?? null,
      piece.source, piece.bpm, JSON.stringify(notes), notes.length, pieceDuration(notes), now,
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
    const old = db.prepare('SELECT title, artist, cover FROM pieces WHERE id = ? AND user_id = ?')
      .get(Number(req.params.id), req.user!.id) as { title: string; artist: string | null; cover: string | null } | undefined;
    if (!old) return void res.status(404).json({ success: false, error: 'Morceau introuvable' });
    const sets: string[] = [];
    const values: unknown[] = [];
    if (b.title !== undefined) { sets.push('title = ?'); values.push(b.title); }
    if (b.artist !== undefined) { sets.push('artist = ?'); values.push(artistOrNull(b.artist)); }
    if (b.folder_id !== undefined) { sets.push('folder_id = ?'); values.push(b.folder_id); }
    if (b.difficulty !== undefined) { sets.push('difficulty = ?'); values.push(b.difficulty); }
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

  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM pieces WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user!.id);
    res.json({ success: true });
  });

  return router;
}
