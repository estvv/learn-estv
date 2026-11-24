import type { Hand } from '@learn/shared';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BEATS_PER_BAR } from './grid';
import { beatName, breakLines, type Sizing } from './numberLines';
import { handLetter, stepText, type Part } from './numbers';
import { HANDS } from './score';

// A part's grid with every cell there to be filled: the hands one above the
// other, time going right.

const SIZING: Sizing = { font: 16, char: 10.5, min: 32, cap: 60 };
const PHONE: Sizing = { font: 15, char: 10, min: 25, cap: 60 };

export interface Cell {
  hand: Hand;
  step: number;
}

const LOOK: Record<Hand, { text: string; on: string; lit: string }> = {
  left: { text: 'text-amber-700', on: 'ring-amber-500 bg-amber-50', lit: 'bg-amber-200' },
  right: { text: 'text-sky-700', on: 'ring-sky-500 bg-sky-50', lit: 'bg-sky-200' },
};

export function EditGrid({ part, selected, column, small, onSelect }: {
  part: Part;
  selected: Cell | null;
  // Being played; -1: none.
  column: number;
  small: boolean;
  onSelect(cell: Cell): void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = box.current!;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sizing = small ? PHONE : SIZING;
  const lines = useMemo(() => breakLines(part, width - 24, sizing), [part, width, sizing]);
  const texts = useMemo(() => {
    const out = new Map<string, string>();
    for (const row of part.rows) for (const s of row.steps) out.set(`${row.hand}${s.step}`, stepText(s));
    return out;
  }, [part]);
  const bar = BEATS_PER_BAR * part.division;

  return (
    <div ref={box} style={{ fontSize: sizing.font }}>
      {lines.map((line) => (
        <div key={line.from} className="mb-3 flex">
          <div className="grid w-6 shrink-0 font-semibold" style={{ gridTemplateRows: '1.1em repeat(2, 2.2em)' }}>
            <span />
            {HANDS.map((h) => <span key={h} className={`self-center text-[0.75em] ${LOOK[h].text}`}>{handLetter(h)}</span>)}
          </div>
          <div
            className="grid min-w-0 flex-1 tabular-nums"
            style={{
              gridTemplateColumns: line.widths.map((w) => `minmax(${w}px, 1fr)`).join(' '),
              gridTemplateRows: '1.1em repeat(2, 2.2em)',
              maxWidth: Math.max(line.widths.length * sizing.cap, line.widths.reduce((a, w) => a + w, 0)),
            }}
          >
            {line.widths.map((_, c) => {
              const at = line.from + c;
              const beat = beatName(part, at);
              return (
                <span
                  key={c}
                  className={`flex items-center justify-center text-[0.68em] leading-none ${at === column ? 'font-bold text-neutral-900' : 'text-neutral-400'}`}
                  style={{ gridColumn: c + 1, gridRow: 1 }}
                >
                  {beat ?? '·'}
                </span>
              );
            })}
            {HANDS.map((hand, r) => line.widths.map((_, c) => {
              const step = line.from + c;
              const text = texts.get(`${hand}${step}`) ?? '';
              const on = selected?.hand === hand && selected.step === step;
              // Bars and beats show in the cells' left edge.
              const edge = step % bar === 0 ? 'border-l-neutral-400' : step % part.division === 0 ? 'border-l-neutral-300' : 'border-l-neutral-100';
              return (
                <button
                  key={`${hand}${c}`}
                  type="button"
                  data-cell={`${hand}${step}`}
                  aria-label={`${hand === 'left' ? 'Gauche' : 'Droite'}, colonne ${step + 1}${text ? ` : ${text}` : ''}`}
                  aria-pressed={on}
                  // Already picked: what is being typed keeps the focus.
                  onMouseDown={(e) => on && e.preventDefault()}
                  onClick={() => onSelect({ hand, step })}
                  className={`flex items-center justify-center whitespace-nowrap border-y border-l border-y-neutral-200 font-semibold leading-none ${edge} ${LOOK[hand].text} ${
                    on ? `relative z-10 rounded-sm ring-2 ring-inset ${LOOK[hand].on}` : step === column && text ? LOOK[hand].lit : 'hover:bg-neutral-50'
                  }`}
                  style={{ gridColumn: c + 1, gridRow: r + 2 }}
                >
                  {text}
                </button>
              );
            }))}
          </div>
        </div>
      ))}
    </div>
  );
}
