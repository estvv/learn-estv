import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { hashPassword } from './auth/crypto.js';
import { importSeeds } from './content/store.js';
import { openDatabase, type DB } from './db/index.js';

const contentDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/packs');

let db: DB;
let app: ReturnType<typeof createApp>;

async function addUser(username: string, password: string, isAdmin = false) {
  db.prepare('INSERT INTO users (username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?)')
    .run(username, await hashPassword(password), isAdmin ? 1 : 0, Date.now());
}

async function login(username: string, password: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password }).expect(200);
  return agent;
}

beforeEach(() => {
  db = openDatabase(':memory:');
  importSeeds(db, contentDir, () => {});
  app = createApp(db);
});

describe('content', () => {
  it('lists subjects and returns the piano pack to guests', async () => {
    const list = await request(app).get('/api/subjects').expect(200);
    expect(list.body.data.map((s: { id: string }) => s.id)).toContain('piano');
    const pack = await request(app).get('/api/subjects/piano').expect(200);
    expect(pack.body.data.elements.length).toBe(37);
    expect(pack.body.data.paths[0].units[0].steps[0].module).toBe('lesson');
  });

  it('imports packs written as folders of Markdown units', () => {
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../content/packs');
    const logs: string[] = [];
    importSeeds(db, dir, (m) => logs.push(m));
    expect(logs).toContain('Seed javascript importé');
    expect(logs.join()).not.toMatch(/invalide|illisible/);
  });

  it('retires the piano, gone to piano-estv, and keeps its progress', async () => {
    await addUser('me', 'password123');
    db.prepare("INSERT INTO srs_state (user_id, element_id, facet, card, due_at) VALUES (1, 'piano/C4', 'name', '{}', 0)").run();
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../content/packs');
    const logs: string[] = [];
    importSeeds(db, dir, (m) => logs.push(m));
    expect(logs).toContain('Seed piano retiré');
    await request(app).get('/api/subjects/piano').expect(404);
    expect(db.prepare('SELECT COUNT(*) AS n FROM srs_state').get()).toEqual({ n: 1 });
  });

  it('skips seeds that did not change', async () => {
    const logs: string[] = [];
    importSeeds(db, contentDir, (m) => logs.push(m));
    expect(logs).toEqual([]);
  });
});

describe('auth and progress', () => {
  it('rejects guests on progress routes', async () => {
    await request(app).get('/api/progress/piano').expect(401);
    const me = await request(app).get('/api/auth/me').expect(200);
    expect(me.body.data).toBeNull();
  });

  it('changes the password and keeps the session', async () => {
    await addUser('alice', 'generated-pw');
    const agent = await login('alice', 'generated-pw');
    await agent.get('/api/progress/piano').expect(200);
    await agent.post('/api/auth/password').send({ current: 'generated-pw', next: 'my-new-password' }).expect(200);
    await agent.get('/api/progress/piano').expect(200);
    await request(app).post('/api/auth/login').send({ username: 'alice', password: 'generated-pw' }).expect(401);
  });

  it('records reviews into FSRS state and step progress', async () => {
    await addUser('me', 'password123');
    const agent = await login('me', 'password123');
    const res = await agent.post('/api/progress/reviews').send({
      reviews: [{ element: 'piano/C4', facet: 'name', grade: 'good', correct: true, responseMs: 2500 }],
    }).expect(200);
    expect(res.body.data[0].card.reps).toBe(1);
    await agent.post('/api/progress/reviews').send({
      reviews: [{ element: 'piano/C4', facet: 'name', grade: 'again', correct: false }],
    }).expect(200);
    await agent.post('/api/progress/steps').send({ step: 'piano/debutant/clavier/decouvrir' }).expect(200);
    await agent.post('/api/progress/steps').send({ step: 'piano/debutant/clavier/quiz-blanches', score: 0.9 }).expect(200);
    await agent.post('/api/progress/steps').send({ step: 'piano/debutant/clavier/quiz-blanches', score: 0.5 }).expect(200);

    const progress = await agent.get('/api/progress/piano').expect(200);
    expect(progress.body.data.srs).toHaveLength(1);
    expect(progress.body.data.srs[0].card.reps).toBe(2);
    const quiz = progress.body.data.steps.find((s: { step: string }) => s.step.endsWith('quiz-blanches'));
    expect(quiz.best_score).toBe(0.9);

    const summary = await agent.get('/api/progress').expect(200);
    expect(summary.body.data[0]).toMatchObject({ subject: 'piano', started: 1 });
  });

  it('keeps the code typed in an exercise, per user', async () => {
    await addUser('a', 'password123');
    await addUser('b', 'password123');
    const a = await login('a', 'password123');
    const step = 'javascript/bases/variables/echange';
    expect((await a.get('/api/progress/code').query({ step }).expect(200)).body.data).toBeNull();
    await a.put('/api/progress/code').send({ step, files: { 'main.js': 'let a;' } }).expect(200);
    await a.put('/api/progress/code').send({ step, files: { 'main.js': 'let b;' } }).expect(200);
    expect((await a.get('/api/progress/code').query({ step })).body.data).toEqual({ 'main.js': 'let b;' });
    expect((await (await login('b', 'password123')).get('/api/progress/code').query({ step })).body.data).toBeNull();
    await a.put('/api/progress/code').send({ step, files: { 'main.js': 'x'.repeat(50_000) } }).expect(400);
    await request(app).put('/api/progress/code').send({ step, files: {} }).expect(401);
  });

  it('lets the admin create accounts', async () => {
    await addUser('admin', 'password123', true);
    const admin = await login('admin', 'password123');
    const created = await admin.post('/api/admin/users').send({ username: 'bob' }).expect(201);
    const bob = await login('bob', created.body.data.password);
    const me = await bob.get('/api/auth/me').expect(200);
    expect(me.body.data).toMatchObject({ username: 'bob', is_admin: false });
    await bob.get('/api/admin/users').expect(403);
  });

  it('edits the profile, stores a picture and serves profiles to accounts only', async () => {
    await addUser('me', 'password123');
    const agent = await login('me', 'password123');
    await agent.patch('/api/auth/profile').send({ display_name: '  Estève  ' }).expect(200);
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(32)]);
    await agent.put('/api/auth/avatar').set('Content-Type', 'image/webp').send(webp).expect(200);
    await agent.put('/api/auth/avatar').set('Content-Type', 'image/webp').send(Buffer.from('not an image')).expect(400);
    const me = (await agent.get('/api/auth/me').expect(200)).body.data;
    expect(me.display_name).toBe('Estève');
    expect(me.avatar_url).toMatch(/^\/api\/users\/\d+\/avatar\?v=\d+$/);
    const img = await agent.get(me.avatar_url).expect(200);
    expect(img.headers['content-type']).toBe('image/webp');

    await agent.post('/api/progress/reviews').send({ reviews: [{ element: 'piano/C4', facet: 'name', grade: 'good', correct: true }] }).expect(200);
    await agent.post('/api/progress/steps').send({ step: 'piano/debutant/clavier/decouvrir' }).expect(200);
    const profile = (await agent.get('/api/users/me/profile').expect(200)).body.data;
    expect(profile.user.display_name).toBe('Estève');
    expect(profile.stats.active_days).toBe(1);
    expect(profile.stats.totals).toMatchObject({ answers: 1, correct_rate: 1, elements_seen: 1, steps_done: 1 });
    expect(profile.stats.subjects[0]).toMatchObject({ id: 'piano', accent: 'violet', steps_done: 1, elements_seen: 1 });
    expect(profile.stats.recent[0]).toMatchObject({ title: 'Le clavier du piano', subject_name: 'Piano' });
    expect(profile.stats.heatmap.at(-1).count).toBe(2);

    await request(app).get('/api/users/me/profile').expect(401);
    await request(app).get(me.avatar_url).expect(401);
  });
});
