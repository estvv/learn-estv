import { useEffect, useMemo, useRef, useState } from 'react';
import { RepeatIcon } from '../../../components/icons';
import { Segmented } from '../../../components/Segmented';
import { useObservable } from '../../../lib/store';
import { useNoteInput } from '../input/hooks';
import { PianoKeyboard, type KeyLabels, type KeyMark } from '../PianoKeyboard';
import { FallingNotes } from './FallingNotes';
import { PiecePlayer, pieceRange, type PlayMode } from './player';
import { Cover } from './pieceFields';
import { detectSections, type Section } from './sections';
import type { StoredPiece } from './types';

const RATES = [0.5, 0.75, 1, 1.25];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// A piece with falling notes above the keyboard: listen to it, or let it wait
// for the right notes.
export function PlayAlong({ piece, labels, keyboardHeight }: { piece: StoredPiece; labels: KeyLabels; keyboardHeight: number }) {
  const player = useMemo(() => new PiecePlayer(piece.notes), [piece.notes]);
  useEffect(() => () => player.dispose(), [player]);
  const state = useObservable(player.state);
  const [mode, setMode] = useState<PlayMode>('listen');
  const [rate, setRate] = useState(1);
  const [, setFrame] = useState(0);
  const [from, to] = useMemo(() => pieceRange(piece.notes), [piece.notes]);
  const sections = useMemo(() => detectSections(piece.notes, piece.bpm), [piece.notes, piece.bpm]);
  // Looped sections, first and last index (inclusive).
  const [loop, setLoop] = useState<[number, number] | null>(null);

  const applyLoop = (next: [number, number] | null) => {
    setLoop(next);
    player.setLoop(next ? { start: sections[next[0]].start, end: sections[next[1]].end } : null);
    setFrame((f) => f + 1);
  };
  useNoteInput();

  // Coarse UI refresh (time, sounding keys) ~20 times a second while playing.
  useEffect(() => {
    if (!state.playing) return;
    const id = setInterval(() => setFrame((f) => f + 1), 50);
    return () => clearInterval(id);
  }, [state.playing]);

  // Space bar: play / pause. Escape: stop looping.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        player.toggle();
      } else if (e.key === 'Escape' && player.loop) {
        setLoop(null);
        player.setLoop(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player]);

  const marks = new Map<number, KeyMark>();
  if (mode === 'listen') {
    for (const n of player.sounding()) marks.set(n.midi, n.hand === 'left' ? 'hint' : 'target');
  } else {
    for (const n of state.expected) marks.set(n.midi, state.played.includes(n.midi) ? 'correct' : n.hand === 'left' ? 'hint' : 'target');
  }
  if (state.wrong !== null) marks.set(state.wrong, 'wrong');

  // Seeking out of the loop ends it.
  const seek = (t: number) => {
    if (loop && (t < sections[loop[0]].start - 0.05 || t >= sections[loop[1]].end)) applyLoop(null);
    player.seek(t);
    setFrame((f) => f + 1);
  };
  const sectionAt = (t: number) => {
    let i = 0;
    while (i + 1 < sections.length && sections[i + 1].start <= t + 0.05) i++;
    return i;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Right padding: room for the page's "Morceaux" button, drawn over this bar. */}
      <div className="flex items-center gap-4 py-3 pl-16 pr-44 text-sm text-neutral-600">
        <div className="flex w-56 min-w-0 shrink-0 items-center gap-2.5" title={piece.artist ? `${piece.title} — ${piece.artist}` : piece.title}>
          <Cover key={piece.cover} src={piece.cover} size="sm" />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-semibold text-neutral-900">{piece.title}</div>
            {piece.artist && <div className="truncate text-xs text-neutral-500">{piece.artist}</div>}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => player.toggle()}
            title={state.playing ? 'Pause (Espace)' : 'Lecture (Espace)'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
          >
            {state.playing
              ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              : <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>}
          </button>
          {sections.length > 1 && (
            <button
              type="button"
              onClick={() => (loop ? applyLoop(null) : applyLoop([sectionAt(player.position), sectionAt(player.position)]))}
              aria-pressed={!!loop}
              title={loop ? 'Arrêter la boucle (Échap)' : 'Boucler la partie en cours\nAstuce : double-clic sur une partie pour la boucler, Maj+clic pour étendre la boucle'}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${loop ? 'bg-sky-100 text-sky-700' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
            >
              <RepeatIcon className="h-4 w-4" />
            </button>
          )}
          <Timeline
            sections={sections}
            duration={player.duration}
            position={player.position}
            loop={loop}
            onSeek={seek}
            onLoop={(i, extend) => applyLoop(extend && loop ? [Math.min(loop[0], i), Math.max(loop[1], i)] : [i, i])}
            sectionAt={sectionAt}
          />
          <span className="w-[5.5rem] shrink-0 text-xs tabular-nums text-neutral-400">{clock(player.position)} / {clock(player.duration)}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Segmented<PlayMode>
            value={mode}
            onChange={(m) => { setMode(m); player.setMode(m); }}
            options={[{ value: 'listen', label: 'Écouter' }, { value: 'wait', label: 'Attente' }]}
          />
          <select
            value={rate}
            onChange={(e) => { const r = Number(e.target.value); setRate(r); player.rate = r; }}
            title="Vitesse"
            className="rounded-lg border border-neutral-200 bg-white py-1.5 pl-2 pr-1 text-sm text-neutral-700 hover:border-neutral-300 focus:outline-none"
          >
            {RATES.map((r) => <option key={r} value={r}>{Math.round(r * 100)} %</option>)}
          </select>
        </div>
      </div>

      {mode === 'wait' && state.expected.length > 0 && (
        <div className="pb-2 text-center text-xs text-neutral-500">Joue {state.expected.length > 1 ? 'les notes en surbrillance' : 'la note en surbrillance'} pour continuer</div>
      )}
      {state.finished && <div className="pb-2 text-center text-sm font-medium text-emerald-700">Terminé ! Espace pour rejouer.</div>}

      <div className="relative min-h-0 flex-1 border-t border-neutral-200 bg-white px-2 sm:px-4">
        <FallingNotes player={player} from={from} to={to} />
      </div>
      <div className="bg-white px-2 pb-3 sm:px-4">
        <PianoKeyboard from={from} to={to} labels={labels} marks={marks} height={keyboardHeight} />
      </div>
    </div>
  );
}

// Progress bar cut into the piece's sections (A B A C…): click or drag to
// move, double-click a section to loop it, Shift+click to extend the loop.
function Timeline({ sections, duration, position, loop, onSeek, onLoop, sectionAt }: {
  sections: Section[];
  duration: number;
  position: number;
  loop: [number, number] | null;
  onSeek(t: number): void;
  onLoop(index: number, extend: boolean): void;
  sectionAt(t: number): number;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const segments = sections.length > 1 ? sections : [{ start: 0, end: duration, label: '' }];
  const at = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * duration;
  };
  const progress = duration ? (position / duration) * 100 : 0;

  return (
    <div
      ref={bar}
      className="relative flex h-6 min-w-0 max-w-2xl flex-1 cursor-pointer touch-none select-none gap-0.5"
      onPointerDown={(e) => {
        if (e.shiftKey && sections.length > 1) return onLoop(sectionAt(at(e.clientX)), true);
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        onSeek(at(e.clientX));
      }}
      onPointerMove={(e) => dragging.current && onSeek(at(e.clientX))}
      onPointerUp={() => (dragging.current = false)}
      onDoubleClick={(e) => sections.length > 1 && onLoop(sectionAt(at(e.clientX)), false)}
    >
      {segments.map((s, i) => {
        const looped = loop !== null && i >= loop[0] && i <= loop[1];
        return (
          <div
            key={i}
            title={s.label ? `Partie ${s.label} · ${clock(s.start)} – ${clock(s.end)}` : undefined}
            style={{ flexGrow: s.end - s.start, flexBasis: 0 }}
            className={`flex min-w-0 items-center justify-center overflow-hidden rounded text-[10px] font-semibold ${
              looped ? 'bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-300' : 'bg-neutral-100 text-neutral-400'
            }`}
          >
            {s.label}
          </div>
        );
      })}
      {/* Played part, then the playhead. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 rounded-l bg-neutral-900/10" style={{ width: `${progress}%` }} />
      <div className="pointer-events-none absolute -inset-y-0.5 w-0.5 -translate-x-1/2 rounded bg-neutral-900" style={{ left: `${progress}%` }} />
    </div>
  );
}
