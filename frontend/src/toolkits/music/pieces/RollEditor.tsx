import { stepsHeld, type Hand, type Score, type ScoreNote, type ScorePart } from '@learn/shared';
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { ensureAudio, playNote } from '../audio';
import { keyLayout } from '../keyGeometry';

// Where keys are laid: time goes up from the keyboard, as the notes will fall.
// Click an empty place for a note, drag up to hold it; click a note to pick it.

const BEAT = 76; // px
const BAR = 4;
// Moved less than this, it was a click.
const CLICK = 6;

const LOOK: Record<Hand, { note: string; picked: string }> = {
  left: { note: 'bg-amber-200 text-amber-900', picked: 'bg-amber-400 text-amber-950 ring-2 ring-amber-700' },
  right: { note: 'bg-sky-200 text-sky-900', picked: 'bg-sky-400 text-sky-950 ring-2 ring-sky-700' },
};

type Drag =
  | { kind: 'new'; y: number; moved: boolean; note: ScoreNote }
  | { kind: 'move' | 'size'; x: number; y: number; moved: boolean; from: ScoreNote; note: ScoreNote; held: number };

export const sameNote = (a: ScoreNote | null, b: ScoreNote) => !!a && a.hand === b.hand && a.step === b.step && a.midi === b.midi;

export function RollEditor({ part, division, from, to, hand, length, cursor, playhead, picked, onPick, onAdd, onChange, onRemove }: {
  part: ScorePart;
  division: Score['division'];
  from: number;
  to: number;
  hand: Hand;
  // Of the notes added, in columns.
  length: number;
  // Where keys played are written; null: they are not.
  cursor: number | null;
  // In columns; null: not playing.
  playhead: number | null;
  picked: ScoreNote | null;
  onPick(note: ScoreNote | null): void;
  onAdd(note: ScoreNote): void;
  onChange(note: ScoreNote, by: ScoreNote): void;
  onRemove(note: ScoreNote): void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const step = BEAT / division;
  const columns = part.beats * division;
  const total = columns * step;
  const layout = keyLayout(from, to);

  // Time starts at the bottom.
  useLayoutEffect(() => {
    const el = scroller.current!;
    el.scrollTop = el.scrollHeight;
  }, [part.label]);
  const follow = playhead ?? cursor;
  const followed = follow === null ? null : Math.floor(follow / division);
  useEffect(() => {
    const el = scroller.current;
    if (!el || followed === null) return;
    const bottom = el.scrollHeight - followed * BEAT;
    if (bottom > el.scrollTop + el.clientHeight + 4 || bottom < el.scrollTop + el.clientHeight * 0.45) el.scrollTo({ top: bottom - el.clientHeight, behavior: 'smooth' });
  }, [followed]);

  const placeAt = (clientX: number, clientY: number) => {
    const r = sheet.current!.getBoundingClientRect();
    const x = (clientX - r.left) / r.width;
    let midi: number | null = null;
    for (const [m, b] of layout) if (x >= b.x && x < b.x + b.width && (midi === null || b.black)) midi = m;
    return { midi, step: Math.min(columns - 1, Math.max(0, Math.floor((r.bottom - clientY) / step))) };
  };
  const hear = (midi: number) => void ensureAudio().then(() => playNote(midi, 0.35)).catch(() => {});

  const downEmpty = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const at = placeAt(e.clientX, e.clientY);
    if (at.midi === null) return;
    const note: ScoreNote = { hand, midi: at.midi, step: at.step, length };
    setDrag({ kind: 'new', y: e.clientY, moved: false, note });
    // Fingers scroll: only a mouse draws.
    if (e.pointerType === 'mouse') sheet.current!.setPointerCapture(e.pointerId);
  };
  const downNote = (e: PointerEvent, note: ScoreNote, kind: 'move' | 'size') => {
    if (e.button !== 0) return;
    e.stopPropagation();
    sheet.current!.setPointerCapture(e.pointerId);
    setDrag({ kind, x: e.clientX, y: e.clientY, moved: false, from: note, note, held: stepsHeld(part, division, note) });
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    const far = Math.abs(e.clientY - drag.y) > CLICK || (drag.kind !== 'new' && Math.abs(e.clientX - drag.x) > CLICK);
    if (!drag.moved && !far) return;
    if (drag.kind === 'new') {
      if (e.pointerType !== 'mouse') return setDrag(null);
      const up = Math.max(1, placeAt(e.clientX, e.clientY).step - drag.note.step + 1);
      return setDrag({ ...drag, moved: true, note: { ...drag.note, length: up } });
    }
    const by = Math.round((drag.y - e.clientY) / step);
    if (drag.kind === 'size') return setDrag({ ...drag, moved: true, note: { ...drag.from, length: Math.max(1, drag.held + by) } });
    const { midi } = placeAt(e.clientX, e.clientY);
    setDrag({ ...drag, moved: true, note: { ...drag.from, midi: midi ?? drag.from.midi, step: Math.min(columns - 1, Math.max(0, drag.from.step + by)), length: drag.held } });
  };
  const up = () => {
    if (!drag) return;
    setDrag(null);
    if (drag.kind === 'new') {
      if (picked && !drag.moved) return onPick(null);
      hear(drag.note.midi);
      return onAdd(drag.note);
    }
    if (!drag.moved) {
      hear(drag.from.midi);
      return onPick(sameNote(picked, drag.from) ? null : drag.from);
    }
    if (drag.note.midi !== drag.from.midi) hear(drag.note.midi);
    onChange(drag.from, drag.note);
  };

  const shown = part.notes.map((n) => (drag && drag.kind !== 'new' && sameNote(drag.from, n) ? { key: n, note: drag.note } : { key: n, note: n }));
  const number = (n: ScoreNote) => part.keys.find((k) => k.hand === n.hand && k.midi === n.midi)?.number;
  const box = (n: ScoreNote) => {
    const b = layout.get(n.midi);
    if (!b) return null;
    const inset = b.black ? 0.04 : 0.14;
    return {
      left: `${(b.x + b.width * inset) * 100}%`, width: `${b.width * (1 - 2 * inset) * 100}%`,
      bottom: n.step * step + 1, height: stepsHeld(part, division, n) * step - 2,
    };
  };

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-white [scrollbar-width:none]">
      <div className="flex min-h-full flex-col justify-end">
        <div
          ref={sheet}
          onPointerDown={downEmpty}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => setDrag(null)}
          className="relative w-full shrink-0 cursor-crosshair select-none overflow-hidden border-t border-neutral-300 touch-pan-y"
          style={{ height: total }}
        >
          {[...layout].filter(([, b]) => b.black).map(([m, b]) => (
            <div key={m} className="pointer-events-none absolute inset-y-0 bg-neutral-50" style={{ left: `${b.x * 100}%`, width: `${b.width * 100}%` }} />
          ))}
          {[...layout].filter(([m]) => m % 12 === 0).map(([m, b]) => (
            <div key={m} className="pointer-events-none absolute inset-y-0 w-px bg-neutral-200" style={{ left: `${b.x * 100}%` }} />
          ))}
          {Array.from({ length: columns }, (_, c) => (
            <div
              key={c}
              className={`pointer-events-none absolute inset-x-0 border-t ${c % (BAR * division) === 0 ? 'border-neutral-400' : c % division === 0 ? 'border-neutral-200' : 'border-neutral-100'}`}
              style={{ bottom: c * step - 1 }}
            >
              {c % division === 0 && <span className="absolute -top-4 left-1 text-[10px] tabular-nums text-neutral-400">{((c / division) % BAR) + 1}</span>}
            </div>
          ))}
          {cursor !== null && <div className="pointer-events-none absolute inset-x-0 bg-neutral-900/10" style={{ bottom: cursor * step, height: step }} />}

          {shown.map(({ key, note }) => {
            const b = box(note);
            if (!b) return null;
            const on = sameNote(picked, key);
            return (
              <div
                key={`${key.hand}${key.step}-${key.midi}`}
                onPointerDown={(e) => downNote(e, key, 'move')}
                className={`absolute flex touch-none items-end justify-center rounded-md pb-0.5 text-sm font-bold leading-none ${on ? `z-10 ${LOOK[note.hand].picked}` : LOOK[note.hand].note}`}
                style={b}
              >
                {number(note)}
                {on && (
                  <>
                    <span
                      onPointerDown={(e) => downNote(e, key, 'size')}
                      title="Tirer pour tenir la note plus ou moins longtemps"
                      className="absolute -top-2 left-1/2 h-4 w-8 -translate-x-1/2 cursor-ns-resize touch-none rounded-full border-2 border-white bg-neutral-900"
                    />
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onRemove(key)}
                      title="Supprimer (Suppr)"
                      aria-label="Supprimer la note"
                      className="absolute -right-9 bottom-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm text-red-600 shadow ring-1 ring-neutral-200 hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            );
          })}
          {drag?.kind === 'new' && box(drag.note) && (
            <div className={`pointer-events-none absolute rounded-md opacity-70 ${LOOK[hand].note}`} style={box(drag.note)!} />
          )}
          {playhead !== null && <div className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-neutral-900" style={{ bottom: playhead * step }} />}
        </div>
      </div>
    </div>
  );
}
