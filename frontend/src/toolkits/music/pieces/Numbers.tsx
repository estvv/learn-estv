import { frenchName, octaveOf, type Hand } from '@learn/shared';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { RepeatIcon } from '../../../components/icons';
import { NoteText } from '../Accidentals';
import { BEATS_PER_BAR } from './grid';
import { breakLines, lineWidth, type LineBox, type Sizing } from './numberLines';
import { handLetter, handName, pieceText, stepText, type Part } from './numbers';

// The piece as numbers (see numbers.ts). Above the falling notes: the line
// being played and the next one. "Big": the whole piece, part by part.

const STRIP: Sizing = { font: 19, char: 12, min: 24, beat: 76, cap: 132 };
const STRIP_SMALL: Sizing = { font: 15, char: 9.5, min: 18, beat: 40, cap: 96 };
const BIG: Sizing = { font: 22, char: 14, min: 28, beat: 84, cap: 140 };
const BIG_SMALL: Sizing = { font: 17, char: 10.5, min: 18, beat: 44, cap: 110 };
const GUTTER = 40; // the part's letter
const LETTERS = 24; // the hands' letters
const ROW = 1.6; // em
const HEAD = 0.7; // em

const TEXT: Record<Hand, string> = { left: 'text-amber-700', right: 'text-sky-700' };
const LIT: Record<Hand, string> = { left: 'bg-amber-500 text-white', right: 'bg-sky-500 text-white' };

const ghost = 'h-8 shrink-0 rounded-lg px-2.5 text-xs font-medium transition-colors';

export interface PartEditing {
  onCut(part: number, beat: number): void;
  onMove(part: number, beats: 1 | -1): void;
  onJoin(part: number): void;
  onRename(part: number, label: string): void;
  // Null when the parts are the automatic ones.
  onReset: (() => void) | null;
  error: string;
}

export function Numbers({ title, parts, part: current, column, position, loop, big, compact, short, editing, onEdit, onSeek, onLoop, onBig }: {
  title: string;
  // Already without the hand that is turned off.
  parts: Part[];
  // Where the piece is.
  part: number;
  column: number;
  position: number;
  loop: [number, number] | null;
  big: boolean;
  compact: boolean;
  short: boolean;
  // Null when the parts are the owner's, changed with the piece.
  editing: PartEditing | null;
  onEdit(): void;
  onSeek(time: number): void;
  // Null: stop looping.
  onLoop(part: number | null): void;
  onBig(on: boolean): void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [wantsCorrecting, setCorrecting] = useState(false);
  const correcting = editing && wantsCorrecting ? editing : null;
  useLayoutEffect(() => {
    const el = box.current!;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [big]);

  const sizing = big ? (compact ? BIG_SMALL : BIG) : compact ? STRIP_SMALL : STRIP;
  const room = width - GUTTER - LETTERS - (big ? 32 : 60);
  const lines = useMemo(() => parts.map((p) => breakLines(p, room, sizing)), [parts, room, sizing]);

  // The same functions for every line, whatever the render.
  const latest = useRef({ onSeek, editing });
  latest.current = { onSeek, editing };
  const seek = useRef((time: number) => latest.current.onSeek(time)).current;
  const cut = useRef((part: number, beat: number) => latest.current.editing?.onCut(part, beat)).current;

  const line = Math.max(0, (lines[current] ?? []).filter((l) => l.from <= column).length - 1);
  // The line being played stays in view.
  useEffect(() => {
    const el = box.current;
    const target = big ? el?.querySelector<HTMLElement>(`[data-line="${current}-${line}"]`) : null;
    if (!el || !target) return;
    const top = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
    el.scrollTo({ top: top - el.clientHeight * 0.3, behavior: 'smooth' });
  }, [current, line, big, width]);

  const looped = (i: number) => loop !== null && i >= loop[0] && i <= loop[1];
  const draw = (i: number, k: number) => (
    <Line
      key={`${i}-${k}`}
      id={`${i}-${k}`}
      index={i}
      part={parts[i]}
      line={lines[i][k]}
      sizing={sizing}
      lit={i === current ? litSteps(parts[i], position) : ''}
      column={i === current && k === line ? column : -1}
      onSeek={seek}
      onCut={big && correcting ? cut : undefined}
    />
  );

  if (!big) {
    // The line being played, then the one after it (the loop's first line at its end).
    const after = (): [number, number] | null => {
      if (lines[current]?.[line + 1]) return [current, line + 1];
      const i = loop && current >= loop[1] ? loop[0] : current + 1;
      return lines[i]?.[0] ? [i, 0] : null;
    };
    const shown = [[current, line] as [number, number], ...(short ? [] : [after()])].filter((x) => x !== null);
    // The height does not change with what is in it.
    const hands = Math.max(1, ...parts.map((p) => p.rows.length));
    const height = sizing.font * (HEAD + ROW * hands) + 10;
    return (
      <div ref={box} className="relative shrink-0 border-t border-neutral-200 bg-white py-2 pl-3 sm:pl-5" style={{ height: height * (short ? 1 : 2) + 16 }}>
        {shown.map(([i, k], n) => lines[i]?.[k] && (
          <div key={n} className={`flex overflow-hidden ${n ? 'opacity-35' : ''}`} style={{ height }}>
            <div className="shrink-0 text-sm font-bold text-neutral-400" style={{ width: GUTTER, paddingTop: sizing.font * HEAD + 4 }}>
              {(k === 0 || n === 0) && parts[i].label}
            </div>
            <div className="min-w-0 flex-1 pr-12">
              {parts[i].rows.length ? draw(i, k) : <p className="pt-4 text-sm text-neutral-300">Silence</p>}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onBig(true)}
          title="Voir tous les chiffres"
          aria-label="Voir tous les chiffres"
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 sm:right-4"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-neutral-200 bg-white">
      <div className="flex shrink-0 items-center gap-1 px-2 pt-2 sm:px-4">
        <span className="min-w-0 flex-1 truncate pl-1 text-sm font-semibold text-neutral-900">{correcting ? 'Parties' : 'Chiffres'}</span>
        {correcting ? (
          <Small active onClick={() => setCorrecting(false)}>Terminé</Small>
        ) : (
          <>
            <CopyButton text={() => pieceText(title, parts)} />
            {editing && <Small onClick={() => setCorrecting(true)} title="Déplacer, couper, joindre ou renommer les parties">Parties</Small>}
            <Small onClick={onEdit} title="Changer, ajouter ou effacer des notes">Modifier</Small>
            <Small onClick={() => onBig(false)} title="Revenir aux notes qui tombent">Fermer</Small>
          </>
        )}
      </div>
      {correcting && (
        <p className="shrink-0 px-3 pt-1 text-xs text-neutral-500 sm:px-5">
          Clique un trait de temps pour couper ici. La même lettre = le même passage, avec les mêmes chiffres.
          {correcting.onReset && <button type="button" onClick={correcting.onReset} className="ml-2 font-medium text-neutral-900 underline">Découpage automatique</button>}
          {correcting.error && <span className="ml-2 text-red-600">{correcting.error}</span>}
        </p>
      )}
      <div ref={box} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-2 sm:px-5">
        {parts.map((p, i) => (
          <section key={i} className="border-b border-neutral-100 py-4 last:border-b-0">
            {correcting && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <LabelInput key={`${p.start}-${p.label}`} label={p.label} onRename={(label) => correcting.onRename(i, label)} />
                {i > 0 && (
                  <>
                    <Small onClick={() => correcting.onMove(i, -1)} title="Commencer un temps plus tôt">← 1 temps</Small>
                    <Small onClick={() => correcting.onMove(i, 1)} title="Commencer un temps plus tard">1 temps →</Small>
                    <Small onClick={() => correcting.onJoin(i)} title="Ne faire qu’une partie avec celle d’avant">Joindre à la précédente</Small>
                  </>
                )}
              </div>
            )}
            <div className="flex">
              <div className="shrink-0" style={{ width: GUTTER }}>
                {!correcting && <PartLetter label={p.label} on={looped(i)} current={i === current} onClick={() => onLoop(looped(i) ? null : i)} />}
              </div>
              <div className="min-w-0 flex-1">
                {lines[i].map((_, k) => draw(i, k))}
                {p.rows.length ? !correcting && <Stickers part={p} /> : <p className="text-sm text-neutral-300">Silence</p>}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// "row:step" of the notes sounding now.
function litSteps(part: Part, position: number): string {
  const out: string[] = [];
  part.rows.forEach((row, r) => {
    const started = row.steps.filter((x) => x.time <= position + 0.03);
    const s = started[started.length - 1];
    if (s && (s.end > position || position - s.time < 0.12)) out.push(`${r}:${s.step}`);
  });
  return out.join(',');
}

// One line of a part: the hands one above the other, a tick on each beat.
const Line = memo(function Line({ id, index, part, line, sizing, lit, column, onSeek, onCut }: {
  id: string;
  index: number;
  part: Part;
  line: LineBox;
  sizing: Sizing;
  lit: string;
  // Being played, -1 in the other lines.
  column: number;
  onSeek(time: number): void;
  onCut?(part: number, beat: number): void;
}) {
  const count = line.widths.length;
  const on = lit ? lit.split(',') : [];
  const bar = BEATS_PER_BAR * part.division;
  const rows = `${HEAD}em repeat(${part.rows.length}, ${ROW}em)`;
  return (
    <div data-line={id} className="flex py-[5px]" style={{ fontSize: sizing.font }}>
      <div className="grid shrink-0" style={{ width: LETTERS, gridTemplateRows: rows }}>
        <span />
        {part.rows.map((r) => <span key={r.hand} className={`self-center text-xs font-semibold opacity-60 ${TEXT[r.hand]}`}>{handLetter(r.hand)}</span>)}
      </div>
      <div
        className="grid min-w-0 flex-1 tabular-nums"
        style={{
          gridTemplateColumns: line.widths.map((w) => `minmax(${w}px, 1fr)`).join(' '),
          gridTemplateRows: rows,
          maxWidth: lineWidth(line, part, sizing),
        }}
      >
        {line.widths.map((_, c) => {
          const at = line.from + c;
          if (at % part.division !== 0) return null;
          const style = { gridColumn: c + 1, gridRow: 1 };
          const now = Math.floor(column / part.division) === at / part.division && column >= 0;
          if (onCut && at > 0) {
            return <button key={c} type="button" onClick={() => onCut(index, at / part.division)} title="Couper ici" aria-label="Couper ici" className="relative mx-auto h-full w-2 rounded-sm bg-neutral-300 after:absolute after:-inset-x-2 after:-inset-y-1 hover:bg-neutral-900" style={style} />;
          }
          return <span key={c} className={`mx-auto rounded-full ${now ? 'h-1.5 w-1.5 bg-neutral-900' : at % bar === 0 ? 'h-1.5 w-1.5 bg-neutral-300' : 'h-1 w-1 bg-neutral-200'}`} style={style} />;
        })}
        {part.rows.map((row, r) => row.steps.filter((s) => s.step >= line.from && s.step < line.from + count).map((s) => (
          <button
            key={`${r}-${s.step}`}
            type="button"
            onClick={() => onSeek(s.time)}
            className={`mx-px flex items-center justify-center whitespace-nowrap rounded-md font-semibold leading-none ${on.includes(`${r}:${s.step}`) ? LIT[row.hand] : `${TEXT[row.hand]} hover:bg-neutral-100`}`}
            style={{ gridColumn: s.step - line.from + 1, gridRow: r + 2 }}
          >
            {stepText(s)}
          </button>
        )))}
      </div>
    </div>
  );
});

// Which key each number is, to put the stickers on the piano.
function Stickers({ part }: { part: Part }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-400">
      {part.rows.map(({ hand }) => {
        const keys = part.keys.filter((k) => k.hand === hand);
        return (
          <span key={hand} className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            {handName(hand)}
            {keys.map((k) => {
              // The same note twice, octaves apart: tell which.
              const twice = keys.some((o) => o !== k && (o.midi - k.midi) % 12 === 0);
              return (
                <span key={k.midi} className="whitespace-nowrap">
                  <b className={TEXT[hand]}>{k.number}</b> <NoteText text={frenchName(k.midi)} />{twice && octaveOf(k.midi)}
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
}

// The part's letter; a click repeats the part.
function PartLetter({ label, on, current, onClick }: { label: string; on: boolean; current: boolean; onClick(): void }) {
  const title = on ? `Arrêter la boucle (partie ${label})` : `Répéter la partie ${label} en boucle`;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={on}
      className={`group flex max-w-9 flex-col items-center gap-1 rounded-lg px-1.5 py-1 text-base font-bold ${on ? 'bg-sky-100 text-sky-700' : current ? 'text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:bg-neutral-100'}`}
    >
      <span className="max-w-full truncate">{label}</span>
      <RepeatIcon className={`h-3.5 w-3.5 ${on ? '' : 'opacity-40 group-hover:opacity-100'}`} />
    </button>
  );
}

export function LabelInput({ label, onRename }: { label: string; onRename(label: string): void }) {
  const [value, setValue] = useState(label);
  const save = () => {
    if (!value.trim()) setValue(label);
    else if (value.trim() !== label) onRename(value);
  };
  return (
    <input
      value={value}
      maxLength={12}
      aria-label="Nom de la partie"
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="w-20 rounded-lg border border-neutral-200 px-2 py-1 text-sm font-semibold focus:border-neutral-500 focus:outline-none"
    />
  );
}

function CopyButton({ text }: { text(): string }) {
  const [state, setState] = useState<'copied' | 'failed' | null>(null);
  useEffect(() => {
    if (!state) return;
    const id = setTimeout(() => setState(null), 1800);
    return () => clearTimeout(id);
  }, [state]);
  return (
    <Small onClick={() => void navigator.clipboard.writeText(text()).then(() => setState('copied'), () => setState('failed'))}>
      {state === 'copied' ? 'Copié' : state === 'failed' ? 'Copie impossible' : 'Copier'}
    </Small>
  );
}

export function Small({ active, title, onClick, children }: { active?: boolean; title?: string; onClick(): void; children: ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} className={`${ghost} ${active ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}>
      {children}
    </button>
  );
}
