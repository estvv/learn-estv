import { frenchName, isBlack, noteName } from '@learn/shared';
import { useMemo, useRef, type PointerEvent } from 'react';
import { inputBus } from './input/bus';
import { keyLayout } from './keyGeometry';
import { useHeldNotes, useNoteInput } from './input/hooks';
import { keyLabelsForOctave } from './input/keyboard';
import { inputSettings } from './input/settings';
import { useObservable } from '../../lib/store';

export type KeyMark = 'target' | 'correct' | 'wrong' | 'hint';
export type KeyLabels = 'none' | 'names' | 'c' | 'scientific' | 'keys';

interface Props {
  from: number;
  to: number;
  marks?: ReadonlyMap<number, KeyMark>;
  labels?: KeyLabels;
  // Clickable keys emitting notes on the input bus (default true).
  interactive?: boolean;
  height?: number;
}

const markClass: Record<KeyMark, { white: string; black: string }> = {
  target: { white: 'bg-sky-200', black: 'bg-sky-500' },
  hint: { white: 'bg-amber-100', black: 'bg-amber-500' },
  correct: { white: 'bg-emerald-200', black: 'bg-emerald-500' },
  wrong: { white: 'bg-red-200', black: 'bg-red-500' },
};


export function PianoKeyboard({ from, to, marks, labels = 'none', interactive = true, height = 150 }: Props) {
  const layout = useMemo(() => keyLayout(from, to), [from, to]);
  const held = useHeldNotes();
  const settings = useObservable(inputSettings);
  useNoteInput(undefined, interactive);
  const pointerNote = useRef(new Map<number, number>()); // pointerId -> midi

  const keys = [...layout.entries()];
  const keyLabels = useMemo(() => (labels === 'keys' ? keyLabelsForOctave() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [labels, settings.keyboard]);

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
      case 'keys': return keyLabels?.get(midi) ?? null;
      default: return null;
    }
  };

  const pct = (v: number) => `${v * 100}%`;
  return (
    <div
      className="relative w-full select-none touch-none"
      style={{ height }}
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
            className={`absolute top-0 bottom-0 flex items-end justify-center rounded-b-md border border-neutral-300 pb-2 text-[11px] font-medium text-neutral-500 transition-colors ${
              mark ? markClass[mark].white : down ? 'bg-neutral-200' : 'bg-white'
            } ${interactive ? 'cursor-pointer' : ''}`}
            style={{ left: pct(k.x), width: pct(k.width) }}
            title={noteName(m)}
          >
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
            className={`absolute top-0 z-10 flex items-end justify-center rounded-b-md pb-1.5 text-[10px] font-medium text-white transition-colors ${
              mark ? markClass[mark].black : down ? 'bg-neutral-600' : 'bg-neutral-900'
            } ${interactive ? 'cursor-pointer' : ''}`}
            style={{ left: pct(k.x), width: pct(k.width), height: '62%' }}
            title={noteName(m)}
          >
            {label(m)}
          </div>
        );
      })}
    </div>
  );
}
