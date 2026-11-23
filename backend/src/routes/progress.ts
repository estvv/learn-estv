import { Router } from 'express';
import { z } from 'zod';
import { reviewCard, reviewEventSchema, type StoredCard } from '@learn/shared';
import { requireUser } from '../auth/session.js';
import type { DB } from '../db/index.js';

const reviewsBody = z.object({ reviews: z.array(reviewEventSchema).min(1).max(200) });
const stepBody = z.object({ step: z.string().min(1).max(300), score: z.number().min(0).max(1).optional() });
const codeBody = z.object({ step: z.string().min(1).max(300), files: z.record(z.string().max(80), z.string().max(40_000)) });
const subjectPrefix = (subject: string) => `${subject}/`;

export function progressRoutes(db: DB) {
  const router = Router();
  router.use(requireUser);

  // Due counts per subject, for the home page.
  router.get('/', (req, res) => {
    const rows = db.prepare(`
      SELECT substr(element_id, 1, instr(element_id, '/') - 1) AS subject,
        SUM(CASE WHEN due_at <= ? THEN 1 ELSE 0 END) AS due, COUNT(*) AS started
      FROM srs_state WHERE user_id = ? GROUP BY subject
    `).all(Date.now(), req.user!.id);
    res.json({ success: true, data: rows });
  });

  // Code typed in an exercise; before `/:subject`, which would match it.
  router.get('/code', (req, res) => {
    const row = db.prepare('SELECT files FROM step_code WHERE user_id = ? AND step_id = ?')
      .get(req.user!.id, String(req.query.step ?? '')) as { files: string } | undefined;
    res.json({ success: true, data: row ? JSON.parse(row.files) : null });
  });

  router.put('/code', (req, res) => {
    const parsed = codeBody.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Code invalide' });
    db.prepare(`
      INSERT INTO step_code (user_id, step_id, files, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id, step_id) DO UPDATE SET files = excluded.files, updated_at = excluded.updated_at
    `).run(req.user!.id, parsed.data.step, JSON.stringify(parsed.data.files), Date.now());
    res.json({ success: true });
  });

  router.get('/:subject', (req, res) => {
    const prefix = subjectPrefix(req.params.subject);
    const srs = (db.prepare(`
      SELECT element_id, facet, card FROM srs_state WHERE user_id = ? AND substr(element_id, 1, ?) = ?
    `).all(req.user!.id, prefix.length, prefix) as { element_id: string; facet: string; card: string }[])
      .map((r) => ({ element: r.element_id, facet: r.facet, card: JSON.parse(r.card) as StoredCard }));
    const steps = db.prepare(`
      SELECT step_id AS step, completed_at, best_score FROM step_progress WHERE user_id = ? AND substr(step_id, 1, ?) = ?
    `).all(req.user!.id, prefix.length, prefix);
    res.json({ success: true, data: { srs, steps } });
  });

  router.post('/reviews', (req, res) => {
    const parsed = reviewsBody.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Révisions invalides' });
    const userId = req.user!.id;
    const now = new Date();
    const getCard = db.prepare('SELECT card FROM srs_state WHERE user_id = ? AND element_id = ? AND facet = ?');
    const upsert = db.prepare(`
      INSERT INTO srs_state (user_id, element_id, facet, card, due_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (user_id, element_id, facet) DO UPDATE SET card = excluded.card, due_at = excluded.due_at
    `);
    const log = db.prepare('INSERT INTO reviews (user_id, element_id, facet, grade, correct, response_ms, at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const updated = db.transaction(() => parsed.data.reviews.map((r) => {
      const prev = getCard.get(userId, r.element, r.facet) as { card: string } | undefined;
      const card = reviewCard(prev ? JSON.parse(prev.card) : undefined, r.grade, now);
      upsert.run(userId, r.element, r.facet, JSON.stringify(card), new Date(card.due).getTime());
      log.run(userId, r.element, r.facet, r.grade, r.correct ? 1 : 0, r.responseMs ?? null, now.getTime());
      return { element: r.element, facet: r.facet, card };
    }))();
    res.json({ success: true, data: updated });
  });

  router.post('/steps', (req, res) => {
    const parsed = stepBody.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Étape invalide' });
    db.prepare(`
      INSERT INTO step_progress (user_id, step_id, completed_at, best_score) VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id, step_id) DO UPDATE SET
        completed_at = excluded.completed_at,
        best_score = MAX(COALESCE(step_progress.best_score, 0), COALESCE(excluded.best_score, 0))
    `).run(req.user!.id, parsed.data.step, Date.now(), parsed.data.score ?? null);
    res.json({ success: true });
  });

  return router;
}
