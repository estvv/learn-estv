import { Router } from 'express';
import { requireUser } from '../auth/session.js';
import type { DB } from '../db/index.js';
import { profileStats } from '../stats.js';
import { toPublicUser, USER_FIELDS_SQL } from '../users.js';

// Profiles and pictures: accounts only, guests never see who uses the app.
export function userRoutes(db: DB) {
  const router = Router();
  router.use(requireUser);

  router.get('/', (_req, res) => {
    const rows = db.prepare(`SELECT ${USER_FIELDS_SQL} FROM users u WHERE u.disabled = 0 ORDER BY display_name`).all() as Record<string, unknown>[];
    res.json({ success: true, data: rows.map(toPublicUser) });
  });

  router.get('/:id/avatar', (req, res) => {
    const row = db.prepare('SELECT avatar, avatar_type FROM users WHERE id = ? AND avatar IS NOT NULL AND disabled = 0').get(Number(req.params.id)) as
      | { avatar: Buffer; avatar_type: string }
      | undefined;
    if (!row) return void res.status(404).end();
    res.set({ 'Content-Type': row.avatar_type, 'Cache-Control': 'private, max-age=31536000, immutable' });
    res.send(row.avatar);
  });

  router.get('/:username/profile', (req, res) => {
    const row = db.prepare(`SELECT ${USER_FIELDS_SQL}, u.created_at FROM users u WHERE lower(u.username) = lower(?) AND u.disabled = 0`)
      .get(req.params.username) as Record<string, unknown> | undefined;
    if (!row) return void res.status(404).json({ success: false, error: 'Profil introuvable' });
    res.json({
      success: true,
      data: { user: { ...toPublicUser(row), created_at: row.created_at as number }, stats: profileStats(db, row.id as number) },
    });
  });

  return router;
}
