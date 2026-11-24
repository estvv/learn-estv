import { Router } from 'express';
import { aiReadBody } from '@learn/shared';
import { AiError, type ImageReader } from '../ai/index.js';
import { requireUser } from '../auth/session.js';

// Accounts only: each reading is paid by the server's key.
export function aiRoutes(read: ImageReader) {
  const router = Router();
  router.use(requireUser);

  router.post('/read', async (req, res) => {
    const parsed = aiReadBody.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: 'Images invalides ou trop lourdes' });
    try {
      res.json({ success: true, data: await read(parsed.data.images) });
    } catch (e) {
      if (e instanceof AiError) return void res.status(422).json({ success: false, error: e.message });
      throw e;
    }
  });

  return router;
}
