import { buildPack, codeConfig, packSchema, type PackInput, type UnitFile } from '@learn/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { exampleFiles } from './examples';
import { check, prepare } from './engine/compile';
import { runInTest } from './engine/testRunner';

// Every exercise of the folder packs: the solution passes, the start does not.
const bases = import.meta.glob('../../../../content/packs/*/pack.json', { import: 'default', eager: true }) as Record<string, PackInput>;
const texts = import.meta.glob('../../../../content/packs/*/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

beforeAll(() => prepare([{ name: 'main.tsx' }]));

for (const [file, base] of Object.entries(bases)) {
  const dir = file.slice(0, file.lastIndexOf('/') + 1);
  const units: UnitFile[] = Object.entries(texts).filter(([p]) => p.startsWith(dir)).sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, text]) => {
    const [path, name] = p.slice(dir.length).split('/');
    return { path, id: name.replace(/^\d+-|\.md$/g, ''), text };
  });
  const pack = buildPack(base, units);

  describe(`pack ${base.subject.id}`, () => {
    it('is valid', () => {
      const parsed = packSchema.safeParse(pack);
      expect(parsed.error?.issues ?? []).toEqual([]);
    });

    for (const path of pack.paths ?? []) for (const unit of path.units ?? []) for (const step of unit.steps ?? []) {
      if (step.module !== 'code') continue;
      it(`${unit.id}/${step.id}`, { timeout: 20_000 }, async () => {
        const c = codeConfig.parse(step.config);
        const tests = c.parts.flatMap((p) => p.tests.map((t) => t.code));
        const types = c.parts.flatMap((p) => p.types);
        for (const p of c.parts) expect(p.tests.length + p.types.length, `partie ${p.title}`).toBeGreaterThan(0);
        const good = await runInTest(c.solution, tests, types, c.setup);
        expect(good.crash).toBe(null);
        expect(good.diagnostics.map((d) => `${d.file}:${d.line} ${d.message}`)).toEqual([]);
        expect(good.tests.filter((t) => !t?.ok)).toEqual([]);
        expect(good.types.filter((t) => t !== null)).toEqual([]);
        // Not already solved.
        const start = await runInTest(c.files, tests, types, c.setup).catch(() => null);
        const solved = start && !start.crash && start.tests.every((t) => t?.ok) && start.types.every((t) => t === null) && start.diagnostics.length === 0;
        expect(solved).toBeFalsy();
      });
    }

    for (const lesson of pack.lessons ?? []) {
      it(`lesson ${lesson.id}: the examples compile`, () => {
        for (const [, kind, code] of lesson.markdown.matchAll(/^```(js|ts|web|web-ts|react)-run\n([\s\S]*?)^```/gm)) {
          const files = exampleFiles(kind, code);
          expect(check(files).map((d) => `${d.line}: ${d.message}\n${code}`)).toEqual([]);
        }
      });
    }

    for (const e of pack.elements ?? []) {
      const data = e.data as { prompt?: string; answer?: string; wrong?: string[] };
      if (!data.prompt) continue;
      it(`question ${e.id}`, async () => {
        expect(new Set([data.answer, ...data.wrong!]).size).toBe(data.wrong!.length + 1);
        const code = /^```js\n([\s\S]*?)^```/m.exec(data.prompt!)?.[1];
        if (!code) return;
        const r = await runInTest([{ name: 'main.js', code }], []);
        const answer = data.answer!.replace(/`/g, '');
        if (/^Rien$/.test(answer)) expect(r.logs).toEqual([]);
        else if (r.crash) expect(answer).toContain(/\w*Error/.exec(r.crash)?.[0]);
        else expect(r.logs.join(' ')).toBe(answer);
      });
    }
  });
}
