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
});
