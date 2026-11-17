import 'dotenv/config';
import { createApp } from './app.js';
import { purgeExpiredSessions } from './auth/session.js';
import { config } from './config.js';
import { importSeeds } from './content/store.js';
import { openDatabase } from './db/index.js';

const db = openDatabase();
importSeeds(db, config.contentDir);
purgeExpiredSessions(db);
setInterval(() => purgeExpiredSessions(db), 6 * 60 * 60 * 1000).unref();

const server = createApp(db).listen(config.port, () => {
  console.log(`learn-estv backend on :${config.port}`);
});
server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close();
    db.close();
    process.exit(0);
  });
}
