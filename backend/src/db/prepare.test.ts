import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importSeeds } from '../content/store.js';
import { openDatabase } from './index.js';
import { prepareDatabase } from './prepare.js';

let dir: string;
let file: string;
let packs: string;
const silent = () => {};

const pack = (name: string) => JSON.stringify({ format: 1, subject: { id: 's', name } });

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learn-'));
  file = path.join(dir, 'learn.db');
  packs = path.join(dir, 'packs');
  fs.mkdirSync(packs);
  fs.writeFileSync(path.join(packs, 's.json'), pack('Avant'));
});
afterEach(() => fs.rmSync(dir, { recursive: true }));

const subject = (f: string) => {
  const db = new Database(f, { readonly: true });
  try {
    return (db.prepare("SELECT name FROM subjects WHERE id = 's'").get() as { name: string }).name;
  } finally {
    db.close();
  }
};
const backups = () => fs.readdirSync(path.join(dir, 'backups'));

describe('prepareDatabase', () => {
  it('has nothing to do without a database', async () => {
    expect(await prepareDatabase(file, packs, 'x', silent)).toBeNull();
  });

  it('saves the database and only rehearses the update, even while it is open', async () => {
    const live = openDatabase(file);
    importSeeds(live, packs, silent);
    live.prepare("INSERT INTO users (username, password_hash, is_admin, created_at) VALUES ('a', 'h', 0, 1)").run();
    fs.writeFileSync(path.join(packs, 's.json'), pack('Après'));

    const backup = await prepareDatabase(file, packs, 'abc', silent);
    expect(subject(backup!)).toBe('Avant');
    expect(subject(file)).toBe('Avant');
    const saved = new Database(backup!, { readonly: true });
    expect(saved.prepare('SELECT username FROM users').all()).toEqual([{ username: 'a' }]);
    saved.close();
    expect(backups()).toEqual([path.basename(backup!)]);
    live.close();
  });

  it('accepts a database from an older version', async () => {
    const old = openDatabase(file);
    importSeeds(old, packs, silent);
    old.exec('DROP TABLE step_code; ALTER TABLE pieces DROP COLUMN level');
    old.close();
    await expect(prepareDatabase(file, packs, 'x', silent)).resolves.toContain('.db');
  });

  it('refuses content that would not be imported, and keeps the backup', async () => {
    openDatabase(file).close();
    fs.writeFileSync(path.join(packs, 's.json'), '{"format": 2}');
    await expect(prepareDatabase(file, packs, 'x', silent)).rejects.toThrow('s.json');
    expect(backups()).toHaveLength(1);
  });

  it('keeps the ten latest backups', async () => {
    openDatabase(file).close();
    fs.mkdirSync(path.join(dir, 'backups'));
    for (let i = 0; i < 12; i++) fs.writeFileSync(path.join(dir, 'backups', `learn-2020-01-${10 + i}T00-00-00-x.db`), '');
    await prepareDatabase(file, packs, 'x', silent);
    expect(backups()).toHaveLength(10);
    expect(backups()[0]).toContain('2020-01-13');
  });

  it('cuts the silence at the start of pieces already imported, once', () => {
    const add = (id: number, notes: unknown[], more: { score?: string; sections?: string } = {}) => {
      const db = openDatabase(file);
      db.prepare("INSERT OR IGNORE INTO users (id, username, password_hash, created_at) VALUES (1, 'me', 'x', 0)").run();
      db.prepare(`INSERT INTO pieces (id, user_id, subject_id, title, source, data, note_count, duration, created_at, score, sections) VALUES (?, 1, 's', 't', 'midi', ?, 1, 9, 0, ?, ?)`)
        .run(id, JSON.stringify(notes), more.score ?? null, more.sections ?? null);
      db.close();
    };
    const note = (time: number) => ({ midi: 60, time, duration: 1, velocity: 0.7, hand: null });
    add(1, [note(2), note(5)], { sections: JSON.stringify([{ start: 0, label: 'A' }, { start: 5, label: 'B' }]) });
    add(2, [note(0), note(5)]);
    add(3, [note(2)], { score: '{}' });
    const read = () => {
      const db = openDatabase(file);
      const rows = db.prepare('SELECT data, sections, duration FROM pieces ORDER BY id').all() as { data: string; sections: string | null; duration: number }[];
      db.close();
      return rows.map((r) => [(JSON.parse(r.data) as { time: number }[]).map((x) => x.time), r.sections && JSON.parse(r.sections), r.duration]);
    };
    const expected = [[[0, 3], [{ start: 0, label: 'A' }, { start: 3, label: 'B' }], 4], [[0, 5], null, 9], [[2], null, 9]];
    expect(read()).toEqual(expected);
    expect(read()).toEqual(expected);
  });
});
