// Runs inside the sandbox worker, before the student's code (loaded as text:
// see bundle.ts). Plain JavaScript, no import.
// `__send` posts a message to the app; `__run` is called by the bundle.
function __createHarness(__send) {
  const MAX_LOGS = 300;
  const nativeSetTimeout = globalThis.setTimeout;
  let currentTest = null;
  let logCount = 0;
  let indent = 0;
  let captured = [];
  const capturing = [];

  // --- Showing values, close to what Node and the browser consoles print.
  const isIdent = (k) => /^[A-Za-z_$][\w$]*$/.test(k);
  function inspect(v, depth = 0, seen = []) {
    if (v === null) return 'null';
    switch (typeof v) {
      case 'string': return depth === 0 && seen.length === 0 ? v : `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
      case 'number': return Object.is(v, -0) ? '-0' : String(v);
      case 'bigint': return `${v}n`;
      case 'undefined': return 'undefined';
      case 'boolean': return String(v);
      case 'symbol': return v.toString();
      case 'function': {
        const src = Function.prototype.toString.call(v);
        return /^class\b/.test(src) ? `[class ${v.name || '(anonyme)'}]` : `[Function: ${v.name || '(anonyme)'}]`;
      }
    }
    if (seen.includes(v)) return '[Circular]';
    const next = [...seen, v];
    const sub = (x) => inspect(x, depth + 1, next);
    const wrap = (open, parts, close) => {
      if (!parts.length) return open + close;
      const one = `${open} ${parts.join(', ')} ${close}`;
      if (one.length <= 76 && !one.includes('\n')) return open.endsWith('[') ? `${open}${parts.join(', ')}${close}` : one;
      return `${open}\n${parts.map((p) => `  ${p.replace(/\n/g, '\n  ')}`).join(',\n')}\n${close}`;
    };
    if (v instanceof Error) return depth === 0 ? `${v.name}: ${v.message}` : `[${v.name}: ${v.message}]`;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? 'Invalid Date' : v.toISOString();
    if (v instanceof RegExp) return String(v);
    if (v instanceof Promise) return 'Promise';
    if (v instanceof WeakMap) return 'WeakMap';
    if (v instanceof WeakSet) return 'WeakSet';
    if (depth > 4) return Array.isArray(v) ? '[Array]' : '[Object]';
    if (Array.isArray(v)) {
      const items = [];
      for (let i = 0; i < Math.min(v.length, 100); i++) items.push(i in v ? sub(v[i]) : '<vide>');
      if (v.length > 100) items.push(`… ${v.length - 100} de plus`);
      return wrap('[', items, ']');
    }
    if (v instanceof Map) return wrap(`Map(${v.size}) {`, [...v].map(([k, x]) => `${sub(k)} => ${sub(x)}`), '}');
    if (v instanceof Set) return wrap(`Set(${v.size}) {`, [...v].map(sub), '}');
    if (ArrayBuffer.isView(v) && 'length' in v) return wrap(`${v.constructor.name}(${v.length}) [`, [...v].map(sub), ']');
    if (v instanceof Number || v instanceof String || v instanceof Boolean) return `[${v.constructor.name}: ${inspect(v.valueOf(), 1, next)}]`;
    const proto = Object.getPrototypeOf(v);
    const name = proto === null ? '[Object: null prototype] ' : proto.constructor && proto.constructor !== Object ? `${proto.constructor.name} ` : '';
    const parts = Reflect.ownKeys(v).filter((k) => Object.prototype.propertyIsEnumerable.call(v, k)).map((k) => {
      const d = Object.getOwnPropertyDescriptor(v, k);
      const key = typeof k === 'symbol' ? `[${k.toString()}]` : isIdent(k) ? k : `'${k}'`;
      if (d && d.get) return `${key}: ${d.set ? '[Getter/Setter]' : '[Getter]'}`;
      return `${key}: ${sub(v[k])}`;
    });
    return wrap(`${name}{`, parts, '}');
  }

  // --- console
  function format(args) {
    return args.map((a) => inspect(a)).join(' ');
  }
  function write(level, text) {
    for (const c of capturing) c.push(text);
    if (currentTest === null) captured.push(text);
    if (logCount > MAX_LOGS) return;
    logCount++;
    const pad = '  '.repeat(indent);
    __send(logCount > MAX_LOGS
      ? { type: 'log', level: 'warn', text: '… sortie coupée (trop de lignes)', test: currentTest }
      : { type: 'log', level, text: pad + text.replace(/\n/g, `\n${pad}`), test: currentTest });
  }
  const counts = {};
  const timers = {};
  const log = (level) => (...args) => write(level, format(args));
  const console = {
    log: log('log'), info: log('log'), debug: log('log'), warn: log('warn'), error: log('error'), trace: log('log'),
    dir: (v) => write('log', inspect(v, 0, [])),
    assert: (ok, ...args) => { if (!ok) write('error', ['Assertion failed', args.length ? `: ${format(args)}` : ''].join('')); },
    group: (...args) => { if (args.length) write('log', format(args)); indent++; },
    groupCollapsed: (...args) => console.group(...args),
    groupEnd: () => { indent = Math.max(0, indent - 1); },
    count: (label = 'default') => { counts[label] = (counts[label] || 0) + 1; write('log', `${label}: ${counts[label]}`); },
    countReset: (label = 'default') => { counts[label] = 0; },
    time: (label = 'default') => { timers[label] = performance.now(); },
    timeEnd: (label = 'default') => { write('log', `${label}: ${(performance.now() - (timers[label] || 0)).toFixed(1)} ms`); },
    timeLog: (label = 'default') => { write('log', `${label}: ${(performance.now() - (timers[label] || 0)).toFixed(1)} ms`); },
    // React's development build calls these.
    clear: () => {}, timeStamp: () => {}, profile: () => {}, profileEnd: () => {},
    table: (data) => {
      const rows = Object.entries(data || {}).map(([i, r]) => [i, r !== null && typeof r === 'object' ? r : { Valeur: r }]);
      const cols = [...new Set(rows.flatMap(([, r]) => Object.keys(r)))];
      const grid = [['(index)', ...cols], ...rows.map(([i, r]) => [i, ...cols.map((c) => (c in r ? inspect(r[c], 1, [r]) : ''))])];
      const w = grid[0].map((_, c) => Math.max(...grid.map((r) => r[c].length)));
      write('log', grid.map((r) => r.map((x, c) => x.padEnd(w[c])).join(' │ ')).join('\n'));
    },
  };

  // --- Timers: a run without tests lasts until every timer has fired.
  let pending = 0;
  let onIdle = null;
  const live = new Map();
  const idle = () => { if (pending === 0 && onIdle) { const f = onIdle; onIdle = null; f(); } };
  const ended = (id) => { if (live.delete(id)) { pending--; nativeSetTimeout(idle, 0); } };
  const guarded = (fn, args) => {
    try {
      const r = typeof fn === 'function' ? fn(...args) : undefined;
      if (r && typeof r.then === 'function') r.then(undefined, (e) => fail(e, 'promise'));
    } catch (e) {
      fail(e, 'timer');
    }
  };
  const nativeClearTimeout = globalThis.clearTimeout;
  const nativeSetInterval = globalThis.setInterval;
  const nativeClearInterval = globalThis.clearInterval;
  const setTimeout = (fn, ms, ...args) => {
    const id = nativeSetTimeout(() => { guarded(fn, args); ended(id); }, ms);
    pending++;
    live.set(id, true);
    return id;
  };
  const setInterval = (fn, ms, ...args) => {
    const id = nativeSetInterval(() => guarded(fn, args), ms);
    pending++;
    live.set(id, true);
    return id;
  };
  const clear = (id) => { nativeClearTimeout(id); nativeClearInterval(id); ended(id); };

  // --- Called in every loop of web code, which cannot be stopped from outside.
  let loops = 0;
  let loopsSince = 0;
  const $guard = () => {
    if (++loops % 500) return;
    const now = performance.now();
    if (!loopsSince) {
      loopsSince = now;
      nativeSetTimeout(() => { loopsSince = 0; }, 0);
    } else if (now - loopsSince > 2000) {
      throw new Error('Arrêté : boucle infinie ?');
    }
  };

  // --- Errors
  function fail(e, phase) {
    const isError = e instanceof Error;
    __send({
      type: 'error',
      phase,
      message: isError ? `${e.name}: ${e.message}` : `Uncaught ${inspect(e, 1, [])}`,
      stack: isError ? String(e.stack || '') : '',
      test: currentTest,
    });
  }

  // --- Assertions
  class CheckError extends Error {}
  function equal(a, b, seen = []) {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (seen.some(([x, y]) => x === a && y === b)) return true;
    const next = [...seen, [a, b]];
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
    if (a instanceof Date) return a.getTime() === b.getTime();
    if (a instanceof RegExp) return String(a) === String(b);
    if (a instanceof Error) return a.name === b.name && a.message === b.message;
    if (a instanceof Map) return a.size === b.size && [...a].every(([k, v]) => b.has(k) && equal(v, b.get(k), next));
    if (a instanceof Set) return a.size === b.size && [...a].every((v) => b.has(v) || [...b].some((w) => equal(v, w, next)));
    if (Array.isArray(a) && a.length !== b.length) return false;
    const keys = (o) => Reflect.ownKeys(o).filter((k) => Object.prototype.propertyIsEnumerable.call(o, k) && o[k] !== undefined);
    const ka = keys(a);
    const kb = keys(b);
    return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && equal(a[k], b[k], next));
  }
  const show = (v) => inspect(v, 1, []);
  const expect = (value, hint) => {
    const make = (not) => {
      const check = (ok, what) => {
        if (ok === not) throw new CheckError([hint, `${not ? 'Attendu : pas ' : 'Attendu : '}${what}`, `Reçu : ${show(value)}`].filter(Boolean).join('\n'));
      };
      const thrown = () => {
        try { value(); return { ok: false }; } catch (e) { return { ok: true, e }; }
      };
      const matches = (e, kind) => kind === undefined
        || (typeof kind === 'function' ? e instanceof kind
          : kind instanceof RegExp ? kind.test(e && e.message) : String(e && e.message).includes(kind));
      const checkThrown = (r, kind) => {
        const label = kind === undefined ? 'une erreur' : typeof kind === 'function' ? `une erreur ${kind.name}` : `une erreur contenant ${kind}`;
        if ((r.ok && matches(r.e, kind)) === not) {
          throw new CheckError([hint, `Attendu : ${not ? 'pas d’erreur' : label}`, r.ok ? `Reçu : ${show(r.e)}` : 'Reçu : aucune erreur'].filter(Boolean).join('\n'));
        }
      };
      return {
        toBe: (x) => check(Object.is(value, x), show(x)),
        toEqual: (x) => check(equal(value, x), show(x)),
        toBeCloseTo: (x, digits = 2) => check(Math.abs(value - x) < 10 ** -digits / 2, `environ ${show(x)}`),
        toBeTruthy: () => check(!!value, 'une valeur vraie (truthy)'),
        toBeFalsy: () => check(!value, 'une valeur fausse (falsy)'),
        toBeUndefined: () => check(value === undefined, 'undefined'),
        toBeNull: () => check(value === null, 'null'),
        toBeTypeOf: (t) => check(typeof value === t, `une valeur de type ${t}`),
        toBeInstanceOf: (c) => check(value instanceof c, `une instance de ${c.name}`),
        toContain: (x) => check(value != null && (typeof value === 'string' ? value.includes(x) : [...value].some((y) => equal(y, x))), `quelque chose qui contient ${show(x)}`),
        toHaveLength: (n) => check(value != null && value.length === n, `une longueur de ${n}`),
        toMatch: (re) => check(re.test(value), `un texte qui correspond à ${re}`),
        toBeGreaterThan: (x) => check(value > x, `plus que ${show(x)}`),
        toBeLessThan: (x) => check(value < x, `moins que ${show(x)}`),
        toThrow: (kind) => checkThrown(thrown(), kind),
        toReject: async (kind) => {
          let r;
          try { await value; r = { ok: false }; } catch (e) { r = { ok: true, e }; }
          checkThrown(r, kind);
        },
      };
    };
    return Object.assign(make(false), { not: make(true) });
  };

  // Lines logged while fn runs.
  function capture(fn) {
    const lines = [];
    capturing.push(lines);
    const stop = () => { capturing.splice(capturing.indexOf(lines), 1); return lines; };
    let r;
    try { r = fn(); } catch (e) { stop(); throw e; }
    return r && typeof r.then === 'function' ? r.then(stop, (e) => { stop(); throw e; }) : stop();
  }

  // --- Modules (CommonJS output of TypeScript), dependencies first.
  async function run({ modules, main, source, externals = {}, stay = false, afterMain }) {
    const cache = {};
    const tests = [];
    const $test = (id, fn) => tests.push({ id, fn });
    const load = async (name) => {
      if (cache[name]) return;
      const module = (cache[name] = { exports: {} });
      const m = modules[name];
      for (const dep of m.deps) if (modules[dep.to]) await load(dep.to);
      const require = (id) => {
        if (id in externals) return externals[id];
        const dep = m.deps.find((d) => d.id === id);
        if (!dep || !modules[dep.to]) throw new Error(`Module introuvable : '${id}'`);
        return cache[dep.to].exports;
      };
      await m.fn.call(undefined, module.exports, require, module, $test);
    };
    globalThis.$source = source;
    globalThis.$logs = captured;
    let started = true;
    try {
      await load(main);
      if (afterMain) await afterMain(cache[main].exports);
    } catch (e) {
      started = false;
      fail(e, 'main');
    }
    if (started) {
      // Microtasks of the student's top-level code first.
      await new Promise((r) => nativeSetTimeout(r, 0));
      for (const t of tests) {
        currentTest = t.id;
        try {
          await t.fn();
          __send({ type: 'test', id: t.id, ok: true });
        } catch (e) {
          const known = e instanceof CheckError;
          __send({ type: 'test', id: t.id, ok: false, error: known ? e.message : e instanceof Error ? `${e.name}: ${e.message}` : `Erreur lancée : ${inspect(e, 1, [])}`, stack: known ? '' : String((e && e.stack) || '') });
        }
      }
      currentTest = null;
      if (!stay && !tests.length && pending > 0) await new Promise((r) => { onIdle = r; });
    }
    __send({ type: 'done' });
  }

  return { run, fail, globals: { console, setTimeout, setInterval, clearTimeout: clear, clearInterval: clear, $guard, expect, $capture: capture, $sleep: (ms) => new Promise((r) => nativeSetTimeout(r, ms)) } };
}
