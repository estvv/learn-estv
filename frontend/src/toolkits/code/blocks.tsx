import { lazy, Suspense, type ComponentType } from 'react';
import { registerBlock, type BlockProps } from '../../components/blocks';
import { exampleFiles } from './examples';
import type { Lang } from './languages';

// CodeMirror only loads with the first code on screen.
const Highlight = lazy(() => import('./highlight'));
const RunBlock = lazy(() => import('./RunBlock'));

const pre = 'overflow-x-auto rounded-lg border border-neutral-200 bg-white p-4 text-[13.5px] leading-relaxed';

export function HighlightedCode({ code, lang }: { code: string; lang: Lang }) {
  return <pre className={pre}><Suspense fallback={code}><Highlight code={code} lang={lang} /></Suspense></pre>;
}

const trim = (s: string) => s.replace(/\n$/, '');

// ```js, ```ts… coloured; ```js-run, ```ts-run, ```web-run, ```web-ts-run and
// ```react-run can be run and changed.
export function registerCodeBlocks() {
  for (const lang of ['js', 'ts', 'jsx', 'tsx', 'html', 'css'] as const) {
    registerBlock(lang, ({ source }) => <HighlightedCode code={trim(source)} lang={lang} />);
  }
  for (const kind of ['js', 'ts', 'web', 'web-ts', 'react']) {
    const Block: ComponentType<BlockProps> = ({ source }) => {
      const code = trim(source);
      return <Suspense fallback={<pre className={pre}>{code}</pre>}><RunBlock key={code} original={exampleFiles(kind, code)} /></Suspense>;
    };
    registerBlock(`${kind}-run`, Block);
  }
}
