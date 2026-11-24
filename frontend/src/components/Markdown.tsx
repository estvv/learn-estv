import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { blocks, parseBlock } from './blocks';

const components: Components = {
  // Fenced blocks whose language is a registered block become interactive.
  pre({ children, node, ...rest }) {
    const code = node?.children[0];
    if (code && code.type === 'element' && code.tagName === 'code') {
      const cls = (code.properties.className as string[] | undefined)?.find((c) => c.startsWith('language-'));
      const Block = cls ? blocks[cls.slice('language-'.length)] : undefined;
      const text = code.children.map((c) => (c.type === 'text' ? c.value : '')).join('');
      if (Block) return <Block params={parseBlock(text)} source={text} />;
    }
    return <pre {...rest} className="overflow-x-auto rounded-lg bg-neutral-100 p-3 text-sm">{children}</pre>;
  },
  table({ children }) {
    return <div className="overflow-x-auto"><table>{children}</table></div>;
  },
  a({ href, children }) {
    return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
  },
};

export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={`md ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown>
    </div>
  );
}
