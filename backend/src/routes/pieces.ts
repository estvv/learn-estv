import express, { Router } from 'express';
import { pieceDuration, pieceSchema } from '@learn/shared';
import { z } from 'zod';
import { requireUser } from '../auth/session.js';
import type { DB } from '../db/index.js';

// Imported pieces are private to their owner: often copyrighted songs, never
// shown to other accounts or guests.

const createBody = z.object({ subject: z.string().min(1).max(64), piece: pieceSchema });
const renameBody = z.object({ title: z.string().trim().min(1).max(120) });

export function pieceRoutes(db: DB) {
  const router = Router();
  router.use(requireUser);

  router.get('/', (req, res) => {
    const subject = typeof req.query.subject === 'string' ? req.query.subject : null;
    const rows = db.prepare(`
      SELECT id, subject_id AS subject, title, source, bpm, note_count, duration, created_at
      FROM pieces WHERE user_id = ? AND (? IS NULL OR subject_id = ?) ORDER BY created_at DESC
    `).all(req.user!.id, subject, subject);
    res.json({ success: true, data: rows });
  });

  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT id, subject_id AS subject, title, source, bpm, data FROM pieces WHERE id = ? AND user_id = ?')
      .get(Number(req.params.id), req.user!.id) as { id: number; subject: string; title: string; source: string; bpm: number | null; data: string } | undefined;
    if (!row) return void res.status(404).json({ success: false, error: 'Morceau introuvable' });
    const { data, ...meta } = row;
    res.json({ success: true, data: { ...meta, notes: JSON.parse(data) } });
  });

  // Large pieces exceed the global JSON limit.
  router.post('/', express.json({ limit: '8mb' }), (req, res) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Morceau invalide' });
    const { subject, piece } = parsed.data;
    const notes = [...piece.notes].sort((a, b) => a.time - b.time || a.midi - b.midi);
    const now = Date.now();
    const r = db.prepare(`
      INSERT INTO pieces (user_id, subject_id, title, source, bpm, data, note_count, duration, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user!.id, subject, piece.title, piece.source, piece.bpm, JSON.stringify(notes), notes.length, pieceDuration(notes), now);
    res.status(201).json({ success: true, data: { id: Number(r.lastInsertRowid) } });
  });

  router.patch('/:id', (req, res) => {
    const parsed = renameBody.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Titre invalide' });
    const r = db.prepare('UPDATE pieces SET title = ? WHERE id = ? AND user_id = ?').run(parsed.data.title, Number(req.params.id), req.user!.id);
    if (!r.changes) return void res.status(404).json({ success: false, error: 'Morceau introuvable' });
    res.json({ success: true });
  });

  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM pieces WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user!.id);
    res.json({ success: true });
  });

  return router;
}
