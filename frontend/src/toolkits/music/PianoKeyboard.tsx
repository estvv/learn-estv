import { frenchName, isBlack, noteName, type Hand } from '@learn/shared';
import { useMemo, useRef, type PointerEvent } from 'react';
import { inputBus } from './input/bus';
import { keyLayout } from './keyGeometry';
import { useHeldNotes, useNoteInput } from './input/hooks';

export type KeyMark = 'target' | 'correct' | 'wrong' | 'hint';
export type KeyLabels = 'none' | 'names' | 'c' | 'scientific';

// A number stuck on a key (see pieces/numbers.ts).
export interface Sticker {
  number: number;
  hand: Hand;
}

interface Props {
  from: number;
  to: number;
  marks?: ReadonlyMap<number, KeyMark>;
  labels?: KeyLabels;
  stickers?: ReadonlyMap<number, Sticker[]>;
  // Clickable keys emitting notes on the input bus (default true).
  interactive?: boolean;
  // Pixels, or any CSS height.
  height?: number | string;
}

const markClass: Record<KeyMark, { white: string; black: string }> = {
  target: { white: 'bg-sky-200', black: 'bg-sky-500' },
  hint: { white: 'bg-amber-100', black: 'bg-amber-500' },
  correct: { white: 'bg-emerald-200', black: 'bg-emerald-500' },
  wrong: { white: 'bg-red-200', black: 'bg-red-500' },
};


export function PianoKeyboard({ from, to, marks, labels = 'none', stickers, interactive = true, height = 150 }: Props) {
  const layout = useMemo(() => keyLayout(from, to), [from, to]);
  const held = useHeldNotes();
  useNoteInput(undefined, interactive);
  const pointerNote = useRef(new Map<number, number>()); // pointerId -> midi

  const keys = [...layout.entries()];

  const press = (e: PointerEvent, midi: number) => {
    if (!interactive) return;
    e.preventDefault();
    // Without capture, sliding across keys fires pointerenter on each (glissando).
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    const prev = pointerNote.current.get(e.pointerId);
    if (prev === midi) return;
    if (prev !== undefined) inputBus.noteOff(prev, 'virtual');
    pointerNote.current.set(e.pointerId, midi);
    inputBus.noteOn(midi, 'virtual');
  };
  const enter = (e: PointerEvent, midi: number) => {
    if (e.buttons & 1 && pointerNote.current.has(e.pointerId)) press(e, midi);
  };
  const lift = (e: PointerEvent) => {
    const prev = pointerNote.current.get(e.pointerId);
    if (prev === undefined) return;
    pointerNote.current.delete(e.pointerId);
    inputBus.noteOff(prev, 'virtual');
  };

  const label = (midi: number): string | null => {
    switch (labels) {
      case 'names': return isBlack(midi) ? null : frenchName(midi);
      case 'c': return midi % 12 === 0 ? noteName(midi) : null;
      case 'scientific': return isBlack(midi) ? null : noteName(midi);
      default: return null;
    }
  };

  // Names shrink with the keys rather than run into each other.
  const whites = keys.filter(([, k]) => !k.black).length;
  const fontSize = `min(11px, ${(50 / whites).toFixed(2)}cqw)`;

  const stickerSize = `clamp(7px, ${(58 / whites).toFixed(2)}cqw, 17px)`;
  const stuck = (midi: number, black: boolean) => stickers?.get(midi)?.map((s) => (
    <span
      key={s.hand}
      className={`font-bold leading-tight ${s.hand === 'left' ? (black ? 'text-amber-300' : 'text-amber-700') : black ? 'text-sky-300' : 'text-sky-700'}`}
      style={{ fontSize: stickerSize }}
    >
      {s.number}
    </span>
  ));

  const pct = (v: number) => `${v * 100}%`;
  return (
    <div
      className="relative w-full select-none touch-none [-webkit-touch-callout:none]"
      style={{ height, containerType: 'inline-size' }}
      onPointerUp={lift}
      onPointerCancel={lift}
      onPointerLeave={lift}
      role="group"
      aria-label="Clavier de piano"
    >
      {keys.filter(([, k]) => !k.black).map(([m, k]) => {
        const mark = marks?.get(m);
        const down = held.has(m);
        return (
          <div
            key={m}
            onPointerDown={(e) => press(e, m)}
            onPointerEnter={(e) => enter(e, m)}
            className={`absolute top-0 bottom-0 flex flex-col items-center justify-end gap-0.5 rounded-b-md border border-neutral-200 pb-2 font-medium text-neutral-400 transition-colors ${
              mark ? markClass[mark].white : down ? 'bg-neutral-200' : 'bg-white'
            } ${interactive ? 'cursor-pointer' : ''}`}
            style={{ left: pct(k.x), width: pct(k.width), fontSize }}
            title={noteName(m)}
          >
            {stuck(m, false)}
            {label(m)}
          </div>
        );
      })}
      {keys.filter(([, k]) => k.black).map(([m, k]) => {
        const mark = marks?.get(m);
        const down = held.has(m);
        return (
          <div
            key={m}
            onPointerDown={(e) => press(e, m)}
            onPointerEnter={(e) => enter(e, m)}
            className={`absolute top-0 z-10 flex flex-col items-center justify-end gap-0.5 rounded-b-md pb-1.5 font-medium text-white transition-colors ${
              mark ? markClass[mark].black : down ? 'bg-neutral-600' : 'bg-neutral-800'
            } ${interactive ? 'cursor-pointer' : ''}`}
            style={{ left: pct(k.x), width: pct(k.width), height: '62%', fontSize }}
            title={noteName(m)}
          >
            {stuck(m, true)}
            {label(m)}
          </div>
        );
      })}
    </div>
  );
}
