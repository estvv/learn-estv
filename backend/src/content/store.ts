import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { buildPack, fullId, packSchema, type Accent, type Pack, type PackInput, type UnitFile } from '@learn/shared';
import type { DB } from '../db/index.js';

export type Source = 'seed' | 'user' | 'ai';

// Replaces every content row of the pack's subject. Progress tables are keyed
// by full id and untouched, so a re-import never loses progress.
export function importPack(db: DB, pack: Pack, source: Source, seedHash: string | null = null) {
  const s = pack.subject.id;
  const now = Date.now();
  db.transaction(() => {
    const existing = db.prepare('SELECT position FROM subjects WHERE id = ?').get(s) as { position: number } | undefined;
    const position = existing?.position
      ?? ((db.prepare('SELECT MAX(position) AS m FROM subjects').get() as { m: number | null }).m ?? -1) + 1;
    db.prepare('DELETE FROM subjects WHERE id = ?').run(s);
    db.prepare(`
      INSERT INTO subjects (id, name, description, accent, practice, lang, facets, source, seed_hash, position, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(s, pack.subject.name, pack.subject.description, pack.subject.accent, pack.subject.practice ?? null, pack.subject.lang ?? null, JSON.stringify(pack.subject.facets), source, seedHash, position, now);

    const skill = db.prepare('INSERT INTO skills (id, subject_id, slug, name, parent, position) VALUES (?, ?, ?, ?, ?, ?)');
    pack.skills.forEach((k, i) => skill.run(fullId(s, k.id), s, k.id, k.name, k.parent ?? null, i));

    const element = db.prepare('INSERT INTO elements (id, subject_id, slug, kind, skills, data, position) VALUES (?, ?, ?, ?, ?, ?, ?)');
    pack.elements.forEach((e, i) => element.run(fullId(s, e.id), s, e.id, e.kind, JSON.stringify(e.skills), JSON.stringify(e.data), i));

    const lesson = db.prepare('INSERT INTO lessons (id, subject_id, slug, title, markdown, skills, position) VALUES (?, ?, ?, ?, ?, ?, ?)');
    pack.lessons.forEach((l, i) => lesson.run(fullId(s, l.id), s, l.id, l.title, l.markdown, JSON.stringify(l.skills), i));

    const pathStmt = db.prepare('INSERT INTO paths (id, subject_id, slug, name, description, position) VALUES (?, ?, ?, ?, ?, ?)');
    const unitStmt = db.prepare('INSERT INTO units (id, path_id, slug, name, description, position) VALUES (?, ?, ?, ?, ?, ?)');
    const stepStmt = db.prepare('INSERT INTO steps (id, unit_id, slug, title, module, config, position) VALUES (?, ?, ?, ?, ?, ?, ?)');
    pack.paths.forEach((p, pi) => {
      const pid = fullId(s, p.id);
      pathStmt.run(pid, s, p.id, p.name, p.description, pi);
      p.units.forEach((u, ui) => {
        const uid = `${pid}/${u.id}`;
        unitStmt.run(uid, pid, u.id, u.name, u.description, ui);
        u.steps.forEach((st, si) => stepStmt.run(`${uid}/${st.id}`, uid, st.id, st.title, st.module, JSON.stringify(st.config), si));
      });
    });
  })();
}

interface Row { [key: string]: unknown }

// Rebuilds the pack (local ids) from the tables: the API and exports speak packs.
export function getPack(db: DB, subjectId: string): (Pack & { source: Source }) | undefined {
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subjectId) as Row | undefined;
  if (!subject) return undefined;
  const all = (sql: string, ...args: unknown[]) => db.prepare(sql).all(...args) as Row[];

  const units = all(`
    SELECT u.* FROM units u JOIN paths p ON p.id = u.path_id WHERE p.subject_id = ? ORDER BY u.position
  `, subjectId);
  const steps = all(`
    SELECT st.* FROM steps st JOIN units u ON u.id = st.unit_id JOIN paths p ON p.id = u.path_id
    WHERE p.subject_id = ? ORDER BY st.position
  `, subjectId);

  return {
    format: 1,
    source: subject.source as Source,
    subject: {
      id: subject.id as string,
      name: subject.name as string,
      description: subject.description as string,
      accent: subject.accent as Accent,
      practice: (subject.practice as string | null) ?? undefined,
      lang: (subject.lang as string | null) ?? undefined,
      facets: JSON.parse(subject.facets as string),
    },
    skills: all('SELECT * FROM skills WHERE subject_id = ? ORDER BY position', subjectId).map((k) => ({
      id: k.slug as string, name: k.name as string, parent: (k.parent as string | null) ?? undefined,
    })),
    elements: all('SELECT * FROM elements WHERE subject_id = ? ORDER BY position', subjectId).map((e) => ({
      id: e.slug as string, kind: e.kind as string, skills: JSON.parse(e.skills as string), data: JSON.parse(e.data as string),
    })),
    lessons: all('SELECT * FROM lessons WHERE subject_id = ? ORDER BY position', subjectId).map((l) => ({
      id: l.slug as string, title: l.title as string, markdown: l.markdown as string, skills: JSON.parse(l.skills as string),
    })),
    paths: all('SELECT * FROM paths WHERE subject_id = ? ORDER BY position', subjectId).map((p) => ({
      id: p.slug as string,
      name: p.name as string,
      description: p.description as string,
      units: units.filter((u) => u.path_id === p.id).map((u) => ({
        id: u.slug as string,
        name: u.name as string,
        description: u.description as string,
        steps: steps.filter((st) => st.unit_id === u.id).map((st) => ({
          id: st.slug as string, title: st.title as string, module: st.module as string, config: JSON.parse(st.config as string),
        })),
      })),
    })),
  };
}

export interface SubjectSummary {
  id: string;
  name: string;
  description: string;
  accent: Accent;
  source: Source;
  elements: number;
  lessons: number;
  steps: number;
}

export function listSubjects(db: DB): SubjectSummary[] {
  return db.prepare(`
    SELECT s.id, s.name, s.description, s.accent, s.source,
      (SELECT COUNT(*) FROM elements e WHERE e.subject_id = s.id) AS elements,
      (SELECT COUNT(*) FROM lessons l WHERE l.subject_id = s.id) AS lessons,
      (SELECT COUNT(*) FROM steps st JOIN units u ON u.id = st.unit_id JOIN paths p ON p.id = u.path_id WHERE p.subject_id = s.id) AS steps
    FROM subjects s ORDER BY s.position, s.name
  `).all() as SubjectSummary[];
}

// A pack is a JSON file, or a folder: pack.json + <path>/NN-<unit>.md files
// (format in shared/src/unitFile.ts).
function readPack(entry: string): unknown {
  const read = (file: string) => fs.readFileSync(file, 'utf8');
  if (!fs.statSync(entry).isDirectory()) return JSON.parse(read(entry));
  const base = JSON.parse(read(path.join(entry, 'pack.json'))) as PackInput;
  const units: UnitFile[] = (base.paths ?? []).flatMap((p) => {
    const dir = path.join(entry, p.id);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
      .map((f) => ({ path: p.id, id: f.replace(/^\d+-|\.md$/g, ''), text: read(path.join(dir, f)) }));
  });
  return buildPack(base, units);
}

// Imports every pack of the content directory whose content changed since the
// last import. A subject edited in the app (source != seed) is left alone.
// Returns the packs that could not be imported.
export function importSeeds(db: DB, dir: string, log = console.log): string[] {
  const failed: string[] = [];
  if (!fs.existsSync(dir)) {
    log(`Seed: dossier absent (${dir})`);
    return [dir];
  }
  const isPack = (f: string) => f.endsWith('.json') || fs.existsSync(path.join(dir, f, 'pack.json'));
  for (const file of fs.readdirSync(dir).filter(isPack).sort()) {
    let raw: unknown;
    try {
      raw = readPack(path.join(dir, file));
    } catch (e) {
      log(`Seed ${file} illisible : ${(e as Error).message}`);
      failed.push(file);
      continue;
    }
    const hash = createHash('sha256').update(JSON.stringify(raw)).digest('hex');
    const parsed = packSchema.safeParse(raw);
    if (!parsed.success) {
      log(`Seed ${file} invalide :\n${parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
      failed.push(file);
      continue;
    }
    const current = db.prepare('SELECT source, seed_hash FROM subjects WHERE id = ?').get(parsed.data.subject.id) as
      | { source: Source; seed_hash: string | null }
      | undefined;
    if (current && current.source !== 'seed') {
      log(`Seed ${file} ignoré : « ${parsed.data.subject.id} » a été modifié dans l'app`);
      continue;
    }
    if (current?.seed_hash === hash) continue;
    importPack(db, parsed.data, 'seed', hash);
    log(`Seed ${file} importé`);
  }
  return failed;
}
