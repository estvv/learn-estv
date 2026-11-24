import { frenchName, octaveOf, type Hand } from '@learn/shared';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { RepeatIcon } from '../../../components/icons';
import { NoteText } from '../Accidentals';
import { BEATS_PER_BAR } from './grid';
import { beatName, breakLines, type LineBox, type Sizing } from './numberLines';
import { handLetter, handName, pieceText, stepText, type Part } from './numbers';
import { clock } from './PlayerControls';

// The piece as numbers (see numbers.ts), from start to end: a band above the
// falling notes, or the whole screen ("big"), part by part. The number being
// played lights up; a click on one goes there.

const STRIP: Sizing = { font: 13, char: 8.5, min: 19, cap: 64 };
const BIG: Sizing = { font: 21, char: 13.5, min: 32, cap: 96 };
const BIG_COMPACT: Sizing = { font: 17, char: 11, min: 19, cap: 80 };
// Left of the lines: the part's letter.
const GUTTER = { strip: 44, big: 0 };

const TEXT: Record<Hand, string> = { left: 'text-amber-700', right: 'text-sky-700' };
const LIT: Record<Hand, string> = { left: 'bg-amber-500 text-white', right: 'bg-sky-500 text-white' };

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

  const sizing = !big ? STRIP : compact ? BIG_COMPACT : BIG;
  // Paddings, the letter's column and the hands' letters.
  const room = width - (big ? 72 : 36 + GUTTER.strip);
  const lines = useMemo(() => parts.map((p) => breakLines(p, room, sizing)), [parts, room, sizing]);

  // The same functions for every line, whatever the render.
  const latest = useRef({ onSeek, editing });
  latest.current = { onSeek, editing };
  const seek = useRef((time: number) => latest.current.onSeek(time)).current;
  const cut = useRef((part: number, beat: number) => latest.current.editing?.onCut(part, beat)).current;

  // The line being played stays in view.
  const line = Math.max(0, (lines[current] ?? []).filter((l) => l.from <= column).length - 1);
  useEffect(() => {
    const el = box.current;
    const target = el?.querySelector<HTMLElement>(`[data-line="${current}-${line}"]`);
    if (!el || !target) return;
    const top = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
    el.scrollTo({ top: big ? top - el.clientHeight * 0.3 : top - 4, behavior: 'smooth' });
  }, [current, line, big, width]);

  const looped = (i: number) => loop !== null && i >= loop[0] && i <= loop[1];
  const lit = (i: number) => (i === current ? litSteps(parts[i], position) : '');

  const body = parts.map((p, i) => {
    const grid = lines[i].map((l, k) => (
      <Line
        key={l.from}
        id={`${i}-${k}`}
        index={i}
        part={p}
        line={l}
        sizing={sizing}
        lit={lit(i)}
        column={i === current && k === line ? column : -1}
        onSeek={seek}
        onCut={big && correcting ? cut : undefined}
      />
    ));
    const empty = p.rows.length === 0 && <p className="py-2 text-xs text-neutral-400">Silence</p>;
    if (!big) {
      return (
        <div key={i} className="flex border-b border-neutral-100 last:border-b-0">
          <div className="shrink-0 py-1" style={{ width: GUTTER.strip }}>
            <LoopChip label={p.label} on={looped(i)} onClick={() => onLoop(looped(i) ? null : i)} />
          </div>
          <div className="min-w-0 flex-1">{grid}{empty}</div>
        </div>
      );
    }
    return (
      <section key={i} className={`mb-3 rounded-xl border p-3 ${i === current ? 'border-neutral-300 shadow-sm' : 'border-neutral-200'}`}>
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {correcting
            ? <LabelInput key={`${p.start}-${p.label}`} label={p.label} onRename={(label) => correcting.onRename(i, label)} />
            : <LoopChip label={p.label} on={looped(i)} onClick={() => onLoop(looped(i) ? null : i)} />}
          <button type="button" onClick={() => onSeek(p.start)} className="text-xs tabular-nums text-neutral-400 hover:text-neutral-700">{clock(p.start)}</button>
          {correcting && i > 0 && (
            <>
              <Small onClick={() => correcting.onMove(i, -1)} title="Commencer un temps plus tôt">← 1 temps</Small>
              <Small onClick={() => correcting.onMove(i, 1)} title="Commencer un temps plus tard">1 temps →</Small>
              <Small onClick={() => correcting.onJoin(i)} title="Ne faire qu’une partie avec celle d’avant">Joindre à la précédente</Small>
            </>
          )}
          <Stickers part={p} />
        </div>
        {grid}{empty}
      </section>
    );
  });

  if (!big) {
    return (
      <div className={`relative shrink-0 border-t border-neutral-200 bg-white ${short ? 'h-[4.6rem]' : compact ? 'h-[8.5rem]' : 'h-[10.5rem]'}`}>
        <div ref={box} className="h-full overflow-x-hidden overflow-y-auto overscroll-contain pl-2 pr-12 sm:pl-4">{body}</div>
        <button
          type="button"
          onClick={() => onBig(true)}
          title="Voir les chiffres en grand, par partie"
          aria-label="Voir les chiffres en grand, par partie"
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-sm hover:text-neutral-900"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-neutral-200 bg-white">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-100 px-3 py-2 sm:px-4">
        {/* The piece's form: click a part to go there. */}
        <div className="flex min-w-0 flex-1 basis-40 gap-1 overflow-x-auto">
          {parts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSeek(p.start)}
              aria-current={i === current}
              className={`h-8 min-w-8 shrink-0 rounded-lg px-2 text-sm font-semibold transition-colors ${
                i === current ? 'bg-neutral-900 text-white' : looped(i) ? 'bg-sky-100 text-sky-700' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <CopyButton text={() => pieceText(title, parts)} />
        <Small onClick={onEdit} title="Changer, ajouter ou effacer des notes">Modifier</Small>
        {editing && <Small active={!!correcting} onClick={() => setCorrecting(!correcting)}>{correcting ? 'Terminé' : 'Corriger les parties'}</Small>}
        <Small onClick={() => onBig(false)} title="Revenir aux notes qui tombent">Réduire</Small>
      </div>
      {correcting && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <span className="min-w-0 flex-1 basis-60">
            Clique le numéro d’un temps pour couper la partie à cet endroit. La même lettre = le même passage, avec les mêmes chiffres.
          </span>
          {correcting.error && <span className="text-red-600">{correcting.error}</span>}
          {correcting.onReset && <button type="button" onClick={correcting.onReset} className="font-medium underline">Revenir au découpage automatique</button>}
        </div>
      )}
      <div ref={box} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">{body}</div>
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
  return (
    <div data-line={id} className="flex py-1" style={{ fontSize: sizing.font }}>
      <div className="grid w-5 shrink-0 font-semibold" style={{ gridTemplateRows: `1.1em repeat(${part.rows.length}, 1.55em)` }}>
        <span />
        {part.rows.map((r) => <span key={r.hand} className={`self-center text-[0.75em] ${TEXT[r.hand]}`}>{handLetter(r.hand)}</span>)}
      </div>
      <div
        className="grid min-w-0 flex-1 tabular-nums"
        style={{
          gridTemplateColumns: line.widths.map((w) => `minmax(${w}px, 1fr)`).join(' '),
          gridTemplateRows: `1.1em repeat(${part.rows.length}, 1.55em)`,
          maxWidth: Math.max(count * sizing.cap, line.widths.reduce((a, w) => a + w, 0)),
        }}
      >
        {line.widths.map((_, c) => {
          const at = line.from + c;
          const beat = beatName(part, at);
          const now = at === column;
          const style = { gridColumn: c + 1, gridRow: 1 };
          const look = `flex items-center justify-center text-[0.72em] leading-none ${now ? 'font-bold text-neutral-900' : 'text-neutral-400'}`;
          const startsPart = at === 0;
          return [
            at % bar === 0 && c > 0 && <div key={`b${c}`} className="border-l border-neutral-200" style={{ gridColumn: c + 1, gridRow: '1 / -1' }} />,
            beat !== null && onCut && !startsPart
              ? <button key={c} type="button" onClick={() => onCut(index, at / part.division)} title="Couper ici" className={`${look} rounded bg-amber-100 font-semibold text-amber-800 hover:bg-amber-200`} style={style}>{beat}</button>
              : <span key={c} className={look} style={style}>{beat ?? <span className="text-neutral-300">·</span>}</span>,
          ];
        })}
        {part.rows.map((row, r) => row.steps.filter((s) => s.step >= line.from && s.step < line.from + count).map((s) => (
          <button
            key={`${r}-${s.step}`}
            type="button"
            onClick={() => onSeek(s.time)}
            className={`mx-px flex items-center justify-center whitespace-nowrap rounded font-semibold leading-none ${on.includes(`${r}:${s.step}`) ? LIT[row.hand] : `${TEXT[row.hand]} hover:bg-neutral-100`}`}
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
    <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
      {part.rows.map(({ hand }) => {
        const keys = part.keys.filter((k) => k.hand === hand);
        return (
          <span key={hand} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-neutral-400">{handName(hand)}</span>
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

function LoopChip({ label, on, onClick }: { label: string; on: boolean; onClick(): void }) {
  const title = on ? `Arrêter la boucle (partie ${label})` : `Répéter la partie ${label} en boucle`;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={on}
      className={`flex h-7 max-w-full items-center gap-1 rounded-lg px-1.5 text-xs font-bold transition-colors ${on ? 'bg-sky-100 text-sky-700' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
    >
      <span className="truncate">{label}</span><RepeatIcon className="h-3 w-3 shrink-0" />
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
      className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm font-semibold focus:border-neutral-500 focus:outline-none"
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
      {state === 'copied' ? 'Copié' : state === 'failed' ? 'Copie impossible' : 'Copier le texte'}
    </Small>
  );
}

export function Small({ active, title, onClick, children }: { active?: boolean; title?: string; onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`h-8 shrink-0 rounded-lg px-2.5 text-xs font-medium transition-colors ${active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
    >
      {children}
    </button>
  );
}
