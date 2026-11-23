import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { linter, lintGutter } from '@codemirror/lint';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, hoverTooltip, keymap, lineNumbers } from '@codemirror/view';
import { classHighlighter } from '@lezer/highlight';
import { useEffect, useRef } from 'react';
import { callTs } from './engine/client';
import type { File } from './engine/compile';
import { languageSupport } from './languages';

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '13.5px', backgroundColor: 'white' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', lineHeight: '1.6' },
  '.cm-content': { padding: '12px 0' },
  '.cm-gutters': { backgroundColor: 'white', color: '#a3a3a3', border: 'none' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: '#f5f5f580' },
  '.cm-tooltip': { border: '1px solid #e5e5e5', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)', maxWidth: '520px', overflow: 'hidden' },
  '.cm-diagnostic': { whiteSpace: 'pre-wrap', padding: '6px 10px', fontSize: '12.5px' },
});

interface Props {
  file: string;
  value: string;
  // Every file of the exercise, so that imports resolve.
  files: File[];
  onChange?(code: string): void;
  onRun?(): void;
  readOnly?: boolean;
}

// One file in CodeMirror, with TypeScript's errors and hover types. Mount it
// with a key per file.
export function CodeEditor({ file, value, files, onChange, onRun, readOnly = false }: Props) {
  const parent = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const live = useRef({ files, onChange, onRun });
  live.current = { files, onChange, onRun };

  useEffect(() => {
    const current = (code: string) => live.current.files.map((f) => (f.name === file ? { name: file, code } : { name: f.name, code: f.code }));
    const readOnlyConf = new Compartment();
    const v = new EditorView({
      parent: parent.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => (live.current.onRun?.(), true) }])),
          lineNumbers(),
          history(),
          drawSelection(),
          indentOnInput(),
          indentUnit.of('  '),
          bracketMatching(),
          closeBrackets(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          languageSupport(file),
          syntaxHighlighting(classHighlighter),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': `Code de ${file}` }),
          readOnlyConf.of(EditorState.readOnly.of(readOnly)),
          theme,
          lintGutter(),
          linter(async (ev) => {
            const code = ev.state.doc.toString();
            if (!/\.[jt]sx?$/.test(file)) return [];
            const found = await callTs('check', current(code)).catch(() => []);
            return found.filter((d) => d.file === file).map((d) => ({
              from: Math.min(d.from, ev.state.doc.length),
              to: Math.min(Math.max(d.to, d.from), ev.state.doc.length),
              severity: 'error' as const,
              message: d.message,
            }));
          }, { delay: 500 }),
          hoverTooltip(async (ev, pos) => {
            const info = await callTs('hover', current(ev.state.doc.toString()), file, pos).catch(() => null);
            if (!info || info.to > ev.state.doc.length) return null;
            return {
              pos: info.from,
              end: info.to,
              above: true,
              create: () => {
                const dom = document.createElement('div');
                dom.className = 'max-h-60 overflow-auto px-3 py-2';
                const code = dom.appendChild(document.createElement('div'));
                code.className = 'font-mono text-xs whitespace-pre-wrap';
                code.textContent = info.text;
                if (info.doc) {
                  const doc = dom.appendChild(document.createElement('div'));
                  doc.className = 'mt-1 text-xs text-neutral-500';
                  doc.textContent = info.doc;
                }
                return { dom };
              },
            };
          }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) live.current.onChange?.(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // The document then lives in the editor; outside changes come below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, readOnly]);

  // Reset, loaded draft…
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={parent} className="h-full min-h-0 overflow-hidden" />;
}
