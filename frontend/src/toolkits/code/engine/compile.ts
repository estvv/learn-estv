import ts from 'typescript';
import env from './env.d.ts.txt?raw';
import testEnv from './envTest.d.ts.txt?raw';

// TypeScript in the browser: checks the student's files and turns them into
// CommonJS for the sandbox. Pure (no worker API), so tests can use it too.

export interface File {
  name: string;
  code: string;
}

export interface Diagnostic {
  file: string;
  from: number;
  to: number;
  line: number; // 1-based
  message: string;
  code: number;
  // Error of the language itself (cannot run), not only of types.
  syntax: boolean;
}

export interface CompiledModule {
  name: string; // file name without extension
  js: string;
  // Source line (1-based) of each line of js; 0 when unknown.
  lines: number[];
  deps: { id: string; to: string }[];
}

export interface TypeCheck {
  name: string;
  code: string;
}

export interface Compiled {
  modules: CompiledModule[];
  main: string;
  // First file without comments, for tests on how it is written.
  source: string;
  diagnostics: Diagnostic[];
  // One per type check: its error, or null.
  types: (string | null)[];
}

const isScript = (name: string) => /\.[jt]sx?$/.test(name);
const isJs = (name: string) => /\.jsx?$/.test(name);
// Web exercises have a page or JSX; the others run in a worker, without DOM.
export const isWeb = (files: { name: string }[]) => files.some((f) => /\.(html|jsx|tsx)$/.test(f.name));
const isReact = (files: { name: string }[]) => files.some((f) => /\.[jt]sx$/.test(f.name));

const options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  moduleDetection: ts.ModuleDetectionKind.Force,
  jsx: ts.JsxEmit.ReactJSX,
  types: [],
  strict: true,
  noEmit: true,
  allowJs: true,
  checkJs: false,
  skipLibCheck: true,
  esModuleInterop: true,
  allowImportingTsExtensions: true,
  noImplicitOverride: true,
  noFallthroughCasesInSwitch: true,
};

const emitOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
  moduleDetection: ts.ModuleDetectionKind.Force,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  sourceMap: true,
  allowJs: true,
};

const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);
// Text of the type declarations, each set in its own chunk.
const languageLibs = () => import('./libs/language');
const domLibs = () => import('./libs/dom');
const reactTypes = () => import('./libs/react');
type Loader = () => Promise<{ default: Record<string, string> }>;

// Files that never change: the standard library and React's types.
const fixed = new Map<string, string>();
const loading = new Map<Loader, Promise<void>>();

function load(loader: Loader, pathOf: (path: string) => string): Promise<void> {
  let p = loading.get(loader);
  if (!p) {
    p = loader().then(({ default: texts }) => {
      for (const [path, text] of Object.entries(texts)) fixed.set(pathOf(path), text);
    });
    loading.set(loader, p);
  }
  return p;
}

// Loads what these files need; to await before anything else.
export async function prepare(files: { name: string }[]): Promise<void> {
  const lib = (path: string) => `/lib/${baseName(path)}`;
  await load(languageLibs, lib);
  if (isWeb(files)) await load(domLibs, lib);
  if (isReact(files)) await load(reactTypes, (path) => path.slice(path.indexOf('/node_modules/')));
}

// One TypeScript project per runtime: with the DOM or without.
class Project {
  private files = new Map<string, { text: string; version: number }>();
  private roots: string[] = [];
  readonly service: ts.LanguageService;

  constructor(private readonly web: boolean) {
    const host: ts.LanguageServiceHost = {
      getCompilationSettings: () => ({
        ...options,
        lib: ['lib.es2025.d.ts', 'lib.esnext.disposable.d.ts', 'lib.decorators.d.ts', ...(this.web ? ['lib.dom.d.ts'] : [])],
      }),
      getScriptFileNames: () => ['/env.d.ts', ...this.roots],
      getScriptVersion: (path) => String(this.files.get(path)?.version ?? 0),
      getScriptSnapshot: (path) => {
        const text = this.read(path);
        return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
      },
      getCurrentDirectory: () => '/src',
      getDefaultLibFileName: () => '/lib/lib.es2025.d.ts',
      fileExists: (path) => this.read(path) !== undefined,
      readFile: (path) => this.read(path),
      getDirectories: () => [],
    };
    this.service = ts.createLanguageService(host);
  }

  private read(path: string): string | undefined {
    if (path === '/env.d.ts') return this.web ? testEnv : env + testEnv;
    return fixed.get(path) ?? this.files.get(path)?.text;
  }

  private set(path: string, text: string) {
    const prev = this.files.get(path);
    if (prev?.text !== text) this.files.set(path, { text, version: (prev?.version ?? 0) + 1 });
  }

  open(list: File[]) {
    const scripts = list.filter((f) => isScript(f.name));
    this.roots = scripts.map((f) => `/src/${f.name}`);
    for (const f of scripts) this.set(`/src/${f.name}`, f.code);
    // Files of another exercise must not be importable here.
    for (const path of this.files.keys()) if (!this.roots.includes(path)) this.files.delete(path);
  }

  add(name: string, code: string): string {
    const path = `/src/${name}`;
    this.set(path, code);
    this.roots = [...this.roots, path];
    return path;
  }
}

let plain: Project | null = null;
let web: Project | null = null;

function open(list: File[]): Project {
  const project = isWeb(list) ? (web ??= new Project(true)) : (plain ??= new Project(false));
  project.open(list);
  return project;
}

const message = (d: ts.Diagnostic) => ts.flattenDiagnosticMessageText(d.messageText, '\n');

function diagnose({ service }: Project, list: File[]): Diagnostic[] {
  return list.filter((f) => isScript(f.name)).flatMap((f) => {
    const path = `/src/${f.name}`;
    const convert = (syntax: boolean) => (d: ts.Diagnostic): Diagnostic => {
      const from = Math.min(d.start ?? 0, f.code.length);
      return {
        file: f.name, from, to: Math.min(from + (d.length ?? 1), f.code.length),
        line: f.code.slice(0, from).split('\n').length, message: message(d), code: d.code, syntax,
      };
    };
    const syntactic = service.getSyntacticDiagnostics(path).map(convert(true));
    if (isJs(f.name)) return syntactic;
    return [...syntactic, ...service.getSemanticDiagnostics(path).map(convert(false))];
  });
}

export function check(list: File[]): Diagnostic[] {
  return diagnose(open(list), list);
}

// Type of what is under the cursor, as an editor shows it.
export function hover(list: File[], file: string, pos: number): { from: number; to: number; text: string; doc: string } | null {
  if (!isScript(file)) return null;
  const info = open(list).service.getQuickInfoAtPosition(`/src/${file}`, pos);
  if (!info) return null;
  return {
    from: info.textSpan.start,
    to: info.textSpan.start + info.textSpan.length,
    text: ts.displayPartsToString(info.displayParts),
    doc: ts.displayPartsToString(info.documentation),
  };
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Source line of each output line, from the first segment of a source map line.
export function sourceLines(mappings: string): number[] {
  let line = 0;
  return mappings.split(';').map((group) => {
    let first = 0;
    for (const segment of group.split(',')) {
      const values: number[] = [];
      let value = 0;
      let shift = 0;
      for (const c of segment) {
        const n = B64.indexOf(c);
        value |= (n & 31) << shift;
        shift += 5;
        if (!(n & 32)) {
          values.push(value & 1 ? -(value >> 1) : value >> 1);
          value = 0;
          shift = 0;
        }
      }
      if (values.length >= 4) {
        line += values[2];
        if (!first) first = line + 1;
      }
    }
    return first;
  });
}

const moduleName = (file: string) => file.replace(/\.[jt]sx?$/, '');

// `$guard()` first in every loop: a page's endless loop cannot be stopped from outside.
const guardLoops: ts.TransformerFactory<ts.SourceFile> = (context) => (file) => {
  const f = context.factory;
  const guarded = (body: ts.Statement) => f.createBlock([
    f.createExpressionStatement(f.createCallExpression(f.createIdentifier('$guard'), undefined, [])),
    ...(ts.isBlock(body) ? body.statements : [body]),
  ], true);
  const visit = (node: ts.Node): ts.Node => {
    const n = ts.visitEachChild(node, visit, context);
    if (ts.isForStatement(n)) return f.updateForStatement(n, n.initializer, n.condition, n.incrementor, guarded(n.statement));
    if (ts.isForOfStatement(n)) return f.updateForOfStatement(n, n.awaitModifier, n.initializer, n.expression, guarded(n.statement));
    if (ts.isWhileStatement(n)) return f.updateWhileStatement(n, n.expression, guarded(n.statement));
    if (ts.isDoStatement(n)) return f.updateDoStatement(n, guarded(n.statement), n.expression);
    return n;
  };
  return ts.visitNode(file, visit) as ts.SourceFile;
};

function emit(file: File, guard: boolean): CompiledModule {
  const out = ts.transpileModule(file.code, {
    compilerOptions: emitOptions,
    fileName: `/src/${file.name}`,
    transformers: guard ? { before: [guardLoops] } : undefined,
  });
  const map = JSON.parse(out.sourceMapText!) as { mappings: string };
  const imports = ts.preProcessFile(file.code, true, true).importedFiles.map((i) => i.fileName);
  return {
    name: moduleName(file.name),
    js: out.outputText.replace(/\n\/\/# sourceMappingURL=.*$/m, '\n'),
    lines: sourceLines(map.mappings),
    deps: [...new Set(imports)].filter((id) => id.startsWith('./')).map((id) => ({ id, to: moduleName(id.slice(2)) })),
  };
}

const kinds: Record<string, ts.ScriptKind> = { js: ts.ScriptKind.JS, jsx: ts.ScriptKind.JSX, ts: ts.ScriptKind.TS, tsx: ts.ScriptKind.TSX };

// Tests go in the same scope as the first file's code.
export function compile(list: File[], tests: string[], types: TypeCheck[]): Compiled {
  const project = open(list);
  const diagnostics = diagnose(project, list);
  const [first, ...rest] = list.filter((f) => isScript(f.name));
  const extension = first.name.slice(first.name.lastIndexOf('.') + 1);
  const source = ts.createPrinter({ removeComments: true })
    .printFile(ts.createSourceFile(first.name, first.code, ts.ScriptTarget.ES2022, true, kinds[extension]));
  const empty = { modules: [], main: moduleName(first.name), source, diagnostics, types: types.map(() => 'Le code ne compile pas') };
  if (diagnostics.some((d) => d.syntax)) return empty;

  const typeResults = types.map((t, i) => {
    const path = project.add(`${moduleName(first.name)}.types${i}.${extension.endsWith('x') ? 'tsx' : 'ts'}`, `${first.code}\n{\n${t.code}\n}\n`);
    const errors = [...project.service.getSyntacticDiagnostics(path), ...project.service.getSemanticDiagnostics(path)]
      .filter((d) => (d.start ?? 0) > first.code.length);
    return errors.length ? errors.map(message).join('\n') : null;
  });
  const tested = tests.length
    ? `${first.code}\n;${tests.map((t, i) => `$test(${i}, async () => {\n${t}\n});`).join('\n')}\n`
    : first.code;
  const guard = isWeb(list);
  return {
    modules: [emit({ ...first, code: tested }, guard), ...rest.map((f) => emit(f, guard))],
    main: moduleName(first.name), source, diagnostics, types: typeResults,
  };
}
