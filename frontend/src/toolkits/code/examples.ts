// Web examples: the page, a line `---`, then the script.
export function exampleFiles(kind: string, code: string): { name: string; code: string }[] {
  if (kind === 'react') return [{ name: 'main.tsx', code }];
  if (kind === 'js' || kind === 'ts') return [{ name: `main.${kind}`, code }];
  const at = code.indexOf('\n---\n');
  const [html, script] = at < 0 ? [code, ''] : [code.slice(0, at), code.slice(at + 5)];
  return [{ name: kind === 'web-ts' ? 'main.ts' : 'main.js', code: script }, { name: 'index.html', code: html }];
}
