import Database from 'better-sqlite3';
import { pieceDuration, trimSilence } from '@learn/shared';
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
  ['pieces', 'description', 'TEXT'],
  ['pieces', 'level', 'TEXT'],
  ['pieces', 'sections', 'TEXT'],
  ['pieces', 'score', 'TEXT'],
  ['pieces', 'edits', 'TEXT'],
  ['piece_folders', 'parent_id', 'INTEGER REFERENCES piece_folders(id) ON DELETE CASCADE'],
];

function migrate(db: DB) {
  for (const [table, column, definition] of addedColumns) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!columns.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Pieces imported before imports cut the silence at their start. Once cut, a
// piece is not found again. Those written by hand keep their rests.
function trimPieces(db: DB) {
  type Row = { id: number; data: string; sections: string | null; edits: string | null };
  const rows = db.prepare(`
    SELECT id, data, sections, edits FROM pieces
    WHERE score IS NULL AND json_valid(data) AND json_extract(data, '$[0].time') > 0.01
  `).all() as Row[];
  const save = db.prepare('UPDATE pieces SET data = ?, sections = ?, edits = ?, duration = ? WHERE id = ?');
  const json = (value: unknown) => (value ? JSON.stringify(value) : null);
  db.transaction(() => {
    for (const r of rows) {
      const { notes, sections, edits } = trimSilence({ notes: JSON.parse(r.data), sections: r.sections && JSON.parse(r.sections), edits: r.edits && JSON.parse(r.edits) });
      save.run(JSON.stringify(notes), json(sections), json(edits), pieceDuration(notes), r.id);
    }
  })();
}

export function openDatabase(file = config.dbPath): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(schema);
  migrate(db);
  trimPieces(db);
  return db;
}
