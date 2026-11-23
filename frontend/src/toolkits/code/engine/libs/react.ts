// One chunk, loaded by compile.ts when needed.
export default import.meta.glob(
  [
    '../../../../../../node_modules/@types/react/{index,global,jsx-runtime}.d.ts', '../../../../../../node_modules/@types/react/package.json',
    '../../../../../../node_modules/@types/react-dom/{index,client}.d.ts', '../../../../../../node_modules/@types/react-dom/package.json',
    '../../../../../../node_modules/csstype/index.d.ts', '../../../../../../node_modules/csstype/package.json',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;
