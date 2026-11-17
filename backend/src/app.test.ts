import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { hashPassword } from './auth/crypto.js';
import { importSeeds } from './content/store.js';
import { openDatabase, type DB } from './db/index.js';

const contentDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../content/packs');

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
  // Covers: no network in tests; songs titled "Inconnu" have none.
  app = createApp(db, { findCover: async (title, artist) => (title === 'Inconnu' ? null : `https://img.test/${artist ?? '-'}/${title}`) });
});

describe('content', () => {
  it('lists subjects and returns the piano pack to guests', async () => {
    const list = await request(app).get('/api/subjects').expect(200);
    expect(list.body.data.map((s: { id: string }) => s.id)).toContain('piano');
    const pack = await request(app).get('/api/subjects/piano').expect(200);
    expect(pack.body.data.elements.length).toBe(37);
    expect(pack.body.data.paths[0].units[0].steps[0].module).toBe('lesson');
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
    expect(profile.stats.streak.current).toBe(1);
    expect(profile.stats.totals).toMatchObject({ answers: 1, correct_rate: 1, elements_seen: 1, steps_done: 1 });
    expect(profile.stats.subjects[0]).toMatchObject({ id: 'piano', accent: 'violet', steps_done: 1, elements_seen: 1 });
    expect(profile.stats.recent[0]).toMatchObject({ title: 'Le clavier du piano', subject_name: 'Piano' });
    expect(profile.stats.heatmap.at(-1).count).toBe(2);

    await request(app).get('/api/users/me/profile').expect(401);
    await request(app).get(me.avatar_url).expect(401);
  });

  it('stores pieces privately per account', async () => {
    await addUser('me', 'password123');
    await addUser('other', 'password123');
    const me = await login('me', 'password123');
    const other = await login('other', 'password123');
    const piece = {
      title: 'Gamme', source: 'midi', bpm: 120,
      notes: [
        { midi: 62, time: 0.5, duration: 0.5, velocity: 0.8, hand: 'right' },
        { midi: 60, time: 0, duration: 0.5, velocity: 0.8, hand: null },
      ],
    };
    const created = await me.post('/api/pieces').send({ subject: 'piano', piece }).expect(201);
    const id = created.body.data.id;
    const list = (await me.get('/api/pieces?subject=piano').expect(200)).body.data;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: 'Gamme', note_count: 2, duration: 1 });
    const full = (await me.get(`/api/pieces/${id}`).expect(200)).body.data;
    expect(full.notes.map((n: { midi: number }) => n.midi)).toEqual([60, 62]);
    await other.get(`/api/pieces/${id}`).expect(404);
    expect((await other.get('/api/pieces').expect(200)).body.data).toHaveLength(0);
    await request(app).get('/api/pieces').expect(401);
    expect(list[0].artist).toBeNull();
    expect(list[0].cover).toBe('https://img.test/-/Gamme');
    await me.patch(`/api/pieces/${id}`).send({ title: 'Do majeur' }).expect(200);
    const renamed = await me.patch(`/api/pieces/${id}`).send({ artist: '  Bach ' }).expect(200);
    expect(renamed.body.data.cover).toBe('https://img.test/Bach/Do majeur');
    expect((await me.patch(`/api/pieces/${id}`).send({ title: 'Inconnu' }).expect(200)).body.data.cover).toBeNull();
    expect((await me.get('/api/pieces').expect(200)).body.data[0].cover).toBeNull();
    await me.patch(`/api/pieces/${id}`).send({ title: 'Do majeur' }).expect(200);
    let meta = (await me.get('/api/pieces').expect(200)).body.data[0];
    expect(meta).toMatchObject({ title: 'Do majeur', artist: 'Bach' });
    await me.patch(`/api/pieces/${id}`).send({ artist: '' }).expect(200);
    meta = (await me.get('/api/pieces').expect(200)).body.data[0];
    expect(meta).toMatchObject({ title: 'Do majeur', artist: null });
    await me.patch(`/api/pieces/${id}`).send({}).expect(400);
    expect((await me.get('/api/pieces/cover?title=Hymne&artist=Moi').expect(200)).body.data.cover).toBe('https://img.test/Moi/Hymne');
    expect((await me.get('/api/pieces/cover?title=Inconnu').expect(200)).body.data.cover).toBeNull();
    await me.get('/api/pieces/cover').expect(400);
    expect((await me.get('/api/pieces/cover?link=https://example.com/x').expect(200)).body.data.cover).toBeNull();
    // A cover picked by hand: only catalogue images, kept over a new search.
    await me.patch(`/api/pieces/${id}`).send({ cover: 'https://evil.test/x.jpg' }).expect(400);
    const picked = 'https://cdn-images.dzcdn.net/images/cover/abc/250x250.jpg';
    expect((await me.patch(`/api/pieces/${id}`).send({ title: 'Autre', cover: picked }).expect(200)).body.data.cover).toBe(picked);
    expect((await me.get('/api/pieces').expect(200)).body.data[0].cover).toBe(picked);
    await me.patch(`/api/pieces/${id}`).send({ cover: null }).expect(200);
    expect((await me.get('/api/pieces').expect(200)).body.data[0].cover).toBeNull();
    await me.patch(`/api/pieces/${id}`).send({ title: 'Do majeur' }).expect(200);
    await request(app).get('/api/pieces/cover?title=x').expect(401);
    await other.patch(`/api/pieces/${id}`).send({ artist: 'x' }).expect(404);

    // Folders, in order of priority, and difficulty tags.
    const first = (await me.post('/api/pieces/folders').send({ subject: 'piano', name: 'Priorité' }).expect(201)).body.data.id;
    const second = (await me.post('/api/pieces/folders').send({ subject: 'piano', name: 'Plus tard' }).expect(201)).body.data.id;
    await me.put('/api/pieces/folders/order').send({ ids: [second, first] }).expect(200);
    const folders = (await me.get('/api/pieces/folders?subject=piano').expect(200)).body.data;
    expect(folders.map((f: { name: string }) => f.name)).toEqual(['Plus tard', 'Priorité']);
    expect((await other.get('/api/pieces/folders').expect(200)).body.data).toHaveLength(0);
    const otherFolder = (await other.post('/api/pieces/folders').send({ subject: 'piano', name: 'À moi' }).expect(201)).body.data.id;
    await me.patch(`/api/pieces/${id}`).send({ folder_id: otherFolder }).expect(400);
    await me.patch(`/api/pieces/${id}`).send({ folder_id: first, difficulty: 'hard' }).expect(200);
    await me.patch(`/api/pieces/${id}`).send({ difficulty: 'trivial' }).expect(400);
    meta = (await me.get('/api/pieces').expect(200)).body.data[0];
    expect(meta).toMatchObject({ folder_id: first, difficulty: 'hard', title: 'Do majeur' });

    // Subfolders: no folder inside itself; deleting moves the content up.
    const sub = (await me.post('/api/pieces/folders').send({ subject: 'piano', name: 'Chopin', parent_id: first }).expect(201)).body.data.id;
    const subsub = (await me.post('/api/pieces/folders').send({ subject: 'piano', name: 'Nocturnes', parent_id: sub }).expect(201)).body.data.id;
    await me.post('/api/pieces/folders').send({ subject: 'piano', name: 'x', parent_id: otherFolder }).expect(400);
    await me.patch(`/api/pieces/folders/${first}`).send({ parent_id: subsub }).expect(400);
    await me.patch(`/api/pieces/folders/${first}`).send({ parent_id: first }).expect(400);
    await me.patch(`/api/pieces/folders/${subsub}`).send({ parent_id: second }).expect(200);
    await me.patch(`/api/pieces/folders/${subsub}`).send({ parent_id: sub }).expect(200);
    await me.patch(`/api/pieces/${id}`).send({ folder_id: sub }).expect(200);
    await me.delete(`/api/pieces/folders/${sub}`).expect(200);
    const tree = (await me.get('/api/pieces/folders?subject=piano').expect(200)).body.data as { id: number; parent_id: number | null }[];
    expect(tree.find((f) => f.id === subsub)?.parent_id).toBe(first);
    expect((await me.get('/api/pieces').expect(200)).body.data[0].folder_id).toBe(first);

    await me.delete(`/api/pieces/folders/${first}`).expect(200);
    meta = (await me.get('/api/pieces').expect(200)).body.data[0];
    expect(meta).toMatchObject({ folder_id: null, difficulty: 'hard' });
    const top = (await me.get('/api/pieces/folders?subject=piano').expect(200)).body.data as { id: number; parent_id: number | null }[];
    expect(top.find((f) => f.id === subsub)?.parent_id).toBeNull();
    await me.delete(`/api/pieces/${id}`).expect(200);
    expect((await me.get('/api/pieces').expect(200)).body.data).toHaveLength(0);
  });
});
