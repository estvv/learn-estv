// One chunk, loaded by compile.ts when needed.
export default import.meta.glob(
  ['../../../../../../node_modules/typescript/lib/lib.es*.d.ts', '../../../../../../node_modules/typescript/lib/lib.decorators*.d.ts', '!**/*.full.d.ts'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;
