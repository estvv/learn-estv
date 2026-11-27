import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Repo root in dev, found from this file (src/, src/scripts/ or dist/). In
// Docker, DB_PATH and CONTENT_DIR are set explicitly.
function findRepoRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'content')) && fs.existsSync(path.join(dir, 'backend'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}
const repoRoot = findRepoRoot();

export const config = {
  // Deployed commit, shown by /health so a deploy can check itself.
  commit: process.env.APP_COMMIT || 'dev',
  port: Number(process.env.PORT ?? 3014),
  dbPath: process.env.DB_PATH ?? path.join(repoRoot, 'data/learn.db'),
  contentDir: process.env.CONTENT_DIR ?? path.join(repoRoot, 'content/packs'),
  cookieSecure: process.env.COOKIE_SECURE !== '0' && process.env.NODE_ENV === 'production',
};
