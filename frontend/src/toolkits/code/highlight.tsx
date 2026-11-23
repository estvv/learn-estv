import { classHighlighter, highlightCode } from '@lezer/highlight';
import { useMemo, type ReactNode } from 'react';
import { languages, type Lang } from './languages';

// Read-only code with the editor's colours (tok-* classes of index.css).
export default function Highlight({ code, lang }: { code: string; lang: Lang }) {
  const nodes = useMemo(() => {
    const out: ReactNode[] = [];
    highlightCode(
      code,
      languages[lang].parser.parse(code),
      classHighlighter,
      (text, classes) => out.push(classes ? <span key={out.length} className={classes}>{text}</span> : text),
      () => out.push('\n'),
    );
    return out;
  }, [code, lang]);
  return <>{nodes}</>;
}
