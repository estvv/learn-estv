import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { schema } from './schema.js';

export type DB = Database.Database;

// Columns added after the first schema: created on fresh databases and on
// existing ones alike.
const addedColumns: [table: string, column: string, definition: string][] = [
  ['users', 'display_name', 'TEXT'],
  ['users', 'avatar', 'BLOB'],
  ['users', 'avatar_type', 'TEXT'],
  ['users', 'avatar_updated_at', 'INTEGER'],
  ['subjects', 'accent', "TEXT NOT NULL DEFAULT 'neutral'"],
  ['subjects', 'practice', 'TEXT'],
  ['pieces', 'artist', 'TEXT'],
  ['pieces', 'folder_id', 'INTEGER REFERENCES piece_folders(id) ON DELETE SET NULL'],
  ['pieces', 'difficulty', 'TEXT'],
  ['pieces', 'cover', 'TEXT'],
  ['pieces', 'tracks', 'TEXT'],
  ['piece_folders', 'parent_id', 'INTEGER REFERENCES piece_folders(id) ON DELETE CASCADE'],
];

function migrate(db: DB) {
  for (const [table, column, definition] of addedColumns) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!columns.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function openDatabase(file = config.dbPath): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(schema);
  migrate(db);
  return db;
}
