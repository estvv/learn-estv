import { beforeAll, describe, expect, it } from 'vitest';
import { check, compile, hover, prepare, sourceLines } from './compile';
import { runInTest } from './testRunner';

const js = (code: string) => [{ name: 'main.js', code }];
const ts = (code: string) => [{ name: 'main.ts', code }];

beforeAll(() => prepare([{ name: 'index.html' }, { name: 'main.tsx' }]));

describe('compile', () => {
  it('reports syntax errors of JavaScript, types included, but not type errors', () => {
    expect(check(js('let x = ;')).some((d) => d.syntax)).toBe(true);
    expect(check(js('let x: number = 3')).length).toBeGreaterThan(0);
    expect(check(js('const n = 1; n.foo()'))).toEqual([]);
  });

  it('reports type errors of TypeScript with their place', () => {
    const [d] = check(ts('const a = 1;\nconst b: string = a;\n'));
    expect(d).toMatchObject({ line: 2, syntax: false, code: 2322 });
  });

  it('knows the standard library and the sandbox globals', () => {
    expect(check(ts('console.log([3, 1].toSorted(), Object.groupBy([1], String)); new Set([1]).union(new Set([2])); setTimeout(() => {}, 1);\nconst name = "x";'))).toEqual([]);
  });

  it('resolves imports between files, and forgets files of another exercise', () => {
    const main = { name: 'main.ts', code: "import { n } from './lib';\nconst s: string = n;\n" };
    expect(check([main, { name: 'lib.ts', code: 'export const n = 1;' }]).map((d) => d.code)).toEqual([2322]);
    expect(check([main]).map((d) => d.code)).toEqual([2307]);
  });

  it('runs type checks on top of the code', () => {
    const { types } = compile(ts('function f(x: number) { return x * 2; }'), [], [
      { name: 'ok', code: 'type _ = $Expect<$Equal<ReturnType<typeof f>, number>>;' },
      { name: 'ko', code: 'type _ = $Expect<$Equal<ReturnType<typeof f>, string>>;' },
      { name: 'rejects', code: '// @ts-expect-error\nf("a");' },
    ]);
    expect(types.map((t) => t === null)).toEqual([true, false, true]);
  });

  it('gives the type under the cursor', () => {
    expect(hover(ts('const age = 30;'), 'main.ts', 7)?.text).toBe('const age: 30');
  });

  it('maps output lines back to the source', () => {
    expect(sourceLines('AAAA;;AACA')).toEqual([1, 0, 2]);
    const { modules } = compile(ts('interface A { x: number }\n\n\nconst y = 1;\n'), [], []);
    const out = modules[0].js.split('\n').findIndex((l) => l.includes('y = 1'));
    expect(modules[0].lines[out]).toBe(4);
  });
});

describe('run', () => {
  it('tests see the code they follow, async ones included', async () => {
    const r = await runInTest(js('let total = 0;\nfunction add(n) { total += n; }\nconsole.log("hi", [1, "a"], { b: null });'), [
      'add(2); expect(total).toBe(2);',
      'await $sleep(1); expect(total).toBe(3);',
      'expect($logs).toEqual(["hi [1, \'a\'] { b: null }"]);',
      'missing();',
    ]);
    expect(r.tests.map((t) => t?.ok)).toEqual([true, false, true, false]);
    expect(r.tests[1]!.error).toBe('Attendu : 3\nReçu : 2');
    expect(r.tests[3]!.error).toContain('missing is not defined');
  });

  it('supports modules, top-level await and TypeScript-only syntax', async () => {
    const r = await runInTest([
      { name: 'main.ts', code: "import inc, { type N, base } from './lib';\nenum E { A = 3 }\nclass P { constructor(public x: N) {} }\nconst v = await Promise.resolve(inc(base) + E.A + new P(1).x);\n" },
      { name: 'lib.ts', code: 'export type N = number;\nexport const base: N = 1;\nexport default (n: N) => n + 1;\n' },
    ], ['expect(v).toBe(6);']);
    expect(r.tests.map((t) => t?.ok)).toEqual([true]);
  });

  it('waits for timers when there is no test, and reports crashes', async () => {
    const r = await runInTest(js('setTimeout(() => console.log("later"), 5); console.log("now");'), []);
    expect(r.logs).toEqual(['now', 'later']);
    expect((await runInTest(js('null.x;'), ['expect(1).toBe(1);'])).crash).toContain('TypeError');
  });

  it('checks like a test library', async () => {
    const r = await runInTest(js(''), [
      'expect({ a: [1, new Map([[1, { b: 2 }]])] }).toEqual({ a: [1, new Map([[1, { b: 2 }]])] });',
      'expect({ a: 1 }).not.toEqual({ a: 2 }); expect(NaN).toBe(NaN); expect(0.1 + 0.2).toBeCloseTo(0.3);',
      'expect(() => { throw new RangeError("trop grand"); }).toThrow(RangeError); expect(() => {}).not.toThrow();',
      'await expect(Promise.reject(new Error("non"))).toReject("non");',
      'expect($capture(() => console.log(1))).toEqual(["1"]);',
      'expect([1]).toEqual([1, 2]);',
      'expect(() => {}).toThrow();',
    ]);
    expect(r.tests.map((t) => t?.ok)).toEqual([true, true, true, true, true, false, false]);
  });
});

describe('web', () => {
  const page = (code: string, html = '<button id="b">0</button>') => [{ name: 'main.ts', code }, { name: 'index.html', code: html }];

  it('knows the DOM only in web exercises', () => {
    expect(check(page('document.querySelector("#b")!.textContent = "1";'))).toEqual([]);
    expect(check(ts('document.title;')).map((d) => d.code)).toEqual([2584]);
  });

  it('acts on the page', async () => {
    const r = await runInTest(page('const b = document.querySelector<HTMLButtonElement>("#b")!;\nlet n = 0;\nb.addEventListener("click", () => { b.textContent = String(++n); });'), [
      'await $click("#b"); await $click(b); expect($text("#b")).toBe("2");',
    ]);
    expect(r.tests).toEqual([{ ok: true, error: undefined }]);
  });

  it('stops endless loops', async () => {
    const r = await runInTest(page('export function f() { while (true) {} }'), ['f();']);
    expect(r.tests[0]?.error).toContain('boucle infinie');
  });

  it('types and renders React', async () => {
    const files = [{ name: 'main.tsx', code: "import { useState } from 'react';\nexport default function App({ start = 0 }: { start?: number }) {\n  const [n, setN] = useState(start);\n  return <button onClick={() => setN(n + 1)}>{n}</button>;\n}\n" }];
    expect(check(files)).toEqual([]);
    expect(check([{ name: 'main.tsx', code: 'export default () => <p clas="a" />;' }]).length).toBe(1);
    const r = await runInTest(files, ['const el = await $mount(<App start={4} />); await $click(el.querySelector("button")); expect($text("button")).toBe("5");']);
    expect(r.tests).toEqual([{ ok: true, error: undefined }]);
  });
});
