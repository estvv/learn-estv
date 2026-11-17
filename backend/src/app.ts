import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { loadSession } from './auth/session.js';
import type { DB } from './db/index.js';
import { adminRoutes } from './routes/admin.js';
import { authRoutes } from './routes/auth.js';
import { contentRoutes } from './routes/content.js';
import { progressRoutes } from './routes/progress.js';
import { pieceRoutes } from './routes/pieces.js';
import { userRoutes } from './routes/users.js';

export function createApp(db: DB) {
  const app = express();
  // Caddy -> nginx -> here: two proxies in front.
  app.set('trust proxy', 2);
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },
  }));
  app.use(compression());
  app.use((req, res, next) => (req.path === '/api/pieces' ? next() : express.json({ limit: '2mb' })(req, res, next)));
  app.use(cookieParser());

  app.get('/health', (_req, res) => void res.json({ status: 'ok' }));

  app.use('/api', rateLimit({
    windowMs: 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: 'Trop de requêtes' },
  }));
  app.use('/api', loadSession(db));
  app.use('/api/auth', authRoutes(db));
  app.use('/api/admin', adminRoutes(db));
  app.use('/api/subjects', contentRoutes(db));
  app.use('/api/progress', progressRoutes(db));
  app.use('/api/users', userRoutes(db));
  app.use('/api/pieces', pieceRoutes(db));

  app.use('/api', (_req, res) => void res.status(404).json({ success: false, error: 'Introuvable' }));

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.parse.failed') {
      return void res.status(400).json({ success: false, error: 'JSON invalide' });
    }
    if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.too.large') {
      return void res.status(413).json({ success: false, error: 'Fichier trop lourd' });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Erreur interne' });
  });

  return app;
}
