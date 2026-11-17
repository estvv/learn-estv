import { Router } from 'express';
import { getPack, listSubjects } from '../content/store.js';
import type { DB } from '../db/index.js';

// Public: guests see all content.
export function contentRoutes(db: DB) {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ success: true, data: listSubjects(db) });
  });

  router.get('/:id', (req, res) => {
    const pack = getPack(db, req.params.id);
    if (!pack) return void res.status(404).json({ success: false, error: 'Sujet introuvable' });
    res.json({ success: true, data: pack });
  });

  return router;
}
