import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPack, fillTemplate, frenchName, isDue, noteLabel, noteName, packSchema, parseNote, parseRange, retrievability, reviewCard, selectElements } from './index.ts';

describe('music', () => {
  it('parses and names notes', () => {
    expect(parseNote('C4')).toBe(60);
    expect(parseNote('A0')).toBe(21);
    expect(parseNote('C#4')).toBe(61);
    expect(parseNote('Db4')).toBe(61);
    expect(parseNote('H4')).toBeUndefined();
    expect(noteName(61)).toBe('C#4');
    expect(noteName(61, true)).toBe('Db4');
    expect(frenchName(67)).toBe('Sol');
    expect(noteLabel(60, true)).toBe('Do (C4)');
    expect(noteLabel(61)).toBe('Do♯ / Ré♭ (C♯ / D♭)');
    expect(parseRange('C3-C5')).toEqual([48, 72]);
    expect(parseRange('C5..C3')).toEqual([48, 72]);
  });
});

describe('select', () => {
  const els = [
    { id: 'C4', kind: 'note', skills: ['blanches'], data: { octave: 4, black: false, label: 'Do' } },
    { id: 'Cs4', kind: 'note', skills: ['noires'], data: { octave: 4, black: true, label: 'Do♯' } },
    { id: 'C5', kind: 'note', skills: ['blanches'], data: { octave: 5, black: false, label: 'Do' } },
    { id: 'chat', kind: 'word', skills: [], data: {} },
  ];
  it('filters by kind, data and skill', () => {
    expect(selectElements(els, { kind: 'note', where: { black: false } }).map((e) => e.id)).toEqual(['C4', 'C5']);
    expect(selectElements(els, { where: { octave: [5] } }).map((e) => e.id)).toEqual(['C5']);
    expect(selectElements(els, { skill: 'noires' }).map((e) => e.id)).toEqual(['Cs4']);
    expect(selectElements(els, { ids: ['C5', 'C4'] }).map((e) => e.id)).toEqual(['C5', 'C4']);
  });
  it('fills templates', () => {
    expect(fillTemplate('{{label}} {{ octave }} {{id}} {{missing}}!', els[0])).toBe('Do 4 C4 !');
  });
});

describe('srs', () => {
  it('schedules a new card in the future and keeps it serialisable', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    const card = reviewCard(undefined, 'good', now);
    expect(typeof card.due).toBe('string');
    expect(isDue(card, now)).toBe(false);
    const again = reviewCard(JSON.parse(JSON.stringify(card)), 'again', new Date(card.due));
    expect(again.lapses + again.reps).toBeGreaterThan(card.reps);
    expect(retrievability(undefined)).toBe(0);
    expect(retrievability(card, now)).toBeGreaterThan(0.9);
  });
});

describe('unit files', () => {
  it('builds lessons, exercises, questions and cards', () => {
    const pack = buildPack({ format: 1, subject: { id: 's', name: 'S' }, paths: [{ id: 'p', name: 'P' }] }, [{ path: 'p', id: 'u', text: [
      '# Unité', '> Description', '', '@@ lesson l | Leçon', '', 'Texte', '',
      '@@ code c | Code | ts', 'Consigne', '@starter', 'let a;', '@part Un', 'Fais', '@test T1', 'expect(a)', '@part Deux', '@types T2', 'type A = 1;', '@hint', 'Aide', '@solution', 'let a = 1;', '',
      '@@ predict q', 'Quoi ?', '@answer `1`', '@wrong `2`', '@why Parce que', '', '@@ card k', 'Recto', '@back', 'Verso', '',
    ].join('\n') }]);
    expect(packSchema.safeParse(pack).error?.issues).toBeUndefined();
    const unit = pack.paths![0].units![0];
    expect([unit.name, unit.description, unit.steps!.map((x) => x.id)]).toEqual(['Unité', 'Description', ['l', 'c', 'lire', 'retenir']]);
    expect(unit.steps![1].config).toMatchObject({
      instructions: 'Consigne',
      files: [{ name: 'main.ts', code: 'let a;\n', readonly: false }],
      parts: [{ title: 'Un', instructions: 'Fais', tests: [{ name: 'T1', code: 'expect(a)' }] }, { title: 'Deux', types: [{ name: 'T2', code: 'type A = 1;' }] }],
      hints: ['Aide'],
      solution: [{ name: 'main.ts', code: 'let a = 1;\n' }],
    });
    expect(pack.elements!.map((e) => e.data)).toEqual([{ prompt: 'Quoi ?', answer: '`1`', wrong: ['`2`'], why: 'Parce que' }, { front: 'Recto', back: 'Verso' }]);
  });
});

describe('seed packs', () => {
  it('piano pack is valid', () => {
    const raw = JSON.parse(readFileSync(new URL('../../content/packs/piano.json', import.meta.url), 'utf8'));
    const parsed = packSchema.safeParse(raw);
    if (!parsed.success) console.error(parsed.error.issues);
    expect(parsed.success).toBe(true);
  });

  it('rejects unknown modules, lessons and skills', () => {
    const parsed = packSchema.safeParse({
      format: 1,
      subject: { id: 's', name: 'S' },
      elements: [{ id: 'a', kind: 'x', skills: ['nope'] }],
      paths: [{ id: 'p', name: 'P', units: [{ id: 'u', name: 'U', steps: [
        { id: 'l', title: 'L', module: 'lesson', config: { lesson: 'absent' } },
        { id: 'm', title: 'M', module: 'unknown' },
      ] }] }],
    });
    expect(parsed.success).toBe(false);
    const messages = parsed.error!.issues.map((i) => i.message).join('\n');
    expect(messages).toContain('compétence inconnue : nope');
    expect(messages).toContain('leçon inconnue : absent');
    expect(messages).toContain('module inconnu : unknown');
  });
});
