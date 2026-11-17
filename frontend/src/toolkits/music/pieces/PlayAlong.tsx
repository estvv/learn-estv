import { useEffect, useMemo, useState } from 'react';
import { Segmented } from '../../../components/Segmented';
import { useObservable } from '../../../lib/store';
import { useNoteInput } from '../input/hooks';
import { PianoKeyboard, type KeyLabels, type KeyMark } from '../PianoKeyboard';
import { FallingNotes } from './FallingNotes';
import { PiecePlayer, pieceRange, type PlayMode } from './player';
import type { StoredPiece } from './types';

const RATES = [0.5, 0.75, 1, 1.25];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// A piece with falling notes above the keyboard: listen to it, or let it wait
// for the right notes.
export function PlayAlong({ piece, labels, keyboardHeight }: { piece: StoredPiece; labels: KeyLabels; keyboardHeight: number }) {
  const player = useMemo(() => new PiecePlayer(piece.notes), [piece]);
  useEffect(() => () => player.dispose(), [player]);
  const state = useObservable(player.state);
  const [mode, setMode] = useState<PlayMode>('listen');
  const [rate, setRate] = useState(1);
  const [, setFrame] = useState(0);
  const [from, to] = useMemo(() => pieceRange(piece.notes), [piece]);
  useNoteInput();

  // Coarse UI refresh (time, sounding keys) ~20 times a second while playing.
  useEffect(() => {
    if (!state.playing) return;
    const id = setInterval(() => setFrame((f) => f + 1), 50);
    return () => clearInterval(id);
  }, [state.playing]);

  // Space bar: play / pause.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || (e.target as HTMLElement).tagName === 'INPUT') return;
      e.preventDefault();
      player.toggle();
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-center gap-3 px-16 pb-3 pt-4 text-sm text-neutral-600">
        <span className="max-w-[16rem] truncate font-semibold text-neutral-900" title={piece.title}>{piece.title}</span>
        <button
          type="button"
          onClick={() => player.toggle()}
          title={state.playing ? 'Pause (Espace)' : 'Lecture (Espace)'}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
        >
          {state.playing
            ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            : <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>}
        </button>
        <button type="button" onClick={() => player.seek(0)} title="Revenir au début" className="rounded-lg px-2 py-1.5 hover:bg-neutral-100">⟲</button>
        <input
          type="range" min={0} max={player.duration} step={0.1} value={player.position}
          onChange={(e) => { player.seek(Number(e.target.value)); setFrame((f) => f + 1); }}
          className="w-48 accent-neutral-900"
        />
        <span className="w-20 tabular-nums text-neutral-400">{clock(player.position)} / {clock(player.duration)}</span>
        <Segmented<PlayMode>
          value={mode}
          onChange={(m) => { setMode(m); player.setMode(m); }}
          options={[{ value: 'listen', label: 'Écouter' }, { value: 'wait', label: 'Attente' }]}
        />
        <Segmented<number>
          value={rate}
          onChange={(r) => { setRate(r); player.rate = r; }}
          options={RATES.map((r) => ({ value: r, label: `${Math.round(r * 100)} %` }))}
        />
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
