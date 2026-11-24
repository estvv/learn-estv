// Kept in TypeScript (not a .sql file) so the bundle is self-contained.
export const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  disabled INTEGER NOT NULL DEFAULT 0,
  settings TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (lower(username));

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

-- Content. Ids are full ids: subject "piano", element "piano/C4",
-- step "piano/debutant/clavier/quiz-blanches".
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lang TEXT,
  facets TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL,            -- seed | user | ai
  seed_hash TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  parent TEXT,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS elements (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  kind TEXT NOT NULL,
  skills TEXT NOT NULL DEFAULT '[]',
  data TEXT NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  markdown TEXT NOT NULL,
  skills TEXT NOT NULL DEFAULT '[]',
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS paths (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  path_id TEXT NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS steps (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  module TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL
);

-- Progress. No foreign keys to content on purpose: re-importing a pack
-- replaces the content rows but must never erase progress.
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  facet TEXT NOT NULL,
  grade TEXT NOT NULL,
  correct INTEGER NOT NULL,
  response_ms INTEGER,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_user_at ON reviews (user_id, at);

CREATE TABLE IF NOT EXISTS srs_state (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  facet TEXT NOT NULL,
  card TEXT NOT NULL,
  due_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, element_id, facet)
);

-- Folders of imported pieces, in the owner's order of priority.
CREATE TABLE IF NOT EXISTS piece_folders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  name TEXT NOT NULL,
  -- Folder it sits in; NULL at the top level.
  parent_id INTEGER REFERENCES piece_folders(id) ON DELETE CASCADE,
  -- Order of priority among the folders of the same parent.
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_piece_folders_user ON piece_folders (user_id, subject_id);

-- Imported pieces (MIDI, MusicXML, audio transcription), private to their owner.
CREATE TABLE IF NOT EXISTS pieces (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  -- Free note to tell versions apart ("en entier", "boucle du refrain").
  description TEXT,
  folder_id INTEGER REFERENCES piece_folders(id) ON DELETE SET NULL,
  difficulty TEXT,
  -- Cover image URL; '' when searched without result, NULL when not searched yet.
  cover TEXT,
  -- Instruments of a multi-track file, JSON [{ name, instrument, enabled }].
  tracks TEXT,
  -- Level shown in the player (original, simplified, melody); NULL: original.
  level TEXT,
  -- Practice parts set by hand, JSON [{ start, label }]; NULL: automatic.
  sections TEXT,
  -- Pieces written by hand, JSON (shared/src/score.ts): the notes come from it.
  score TEXT,
  source TEXT NOT NULL,
  bpm REAL,
  data TEXT NOT NULL,
  note_count INTEGER NOT NULL,
  duration REAL NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pieces_user ON pieces (user_id, subject_id);

CREATE TABLE IF NOT EXISTS step_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  completed_at INTEGER NOT NULL,
  best_score REAL,
  PRIMARY KEY (user_id, step_id)
);

-- What the user typed in a code exercise, JSON { file name: code }.
CREATE TABLE IF NOT EXISTS step_code (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  files TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, step_id)
);
`;
