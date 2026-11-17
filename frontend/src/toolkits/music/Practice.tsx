import { frenchName, MIDI_MAX, MIDI_MIN, noteName } from '@learn/shared';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Segmented } from '../../components/Segmented';
import { useObservable } from '../../lib/store';
import { NoteText } from './Accidentals';
import { audioState } from './audio';
import { sourceLabels, type SourceId } from './input/bus';
import { useHeldNotes, useNoteInput } from './input/hooks';
import { keyLabel } from './input/keyboard';
import { inputSettings, updateSettings } from './input/settings';
import { PianoKeyboard, type KeyLabels } from './PianoKeyboard';
import { piecesApi } from './pieces/api';
import { PiecesPanel } from './pieces/PiecesPanel';
import { PlayAlong } from './pieces/PlayAlong';
import type { StoredPiece } from './pieces/types';

type Span = '2' | '4' | 'full';

const keyboardHeight = (share: number) => Math.round(Math.min(320, Math.max(140, window.innerHeight * share)));

// Practice page of music subjects: free play, or one of the account's
// imported pieces (?morceau=<id>) with falling notes.
export function MusicPractice({ subject }: { subject: string }) {
  const [params, setParams] = useSearchParams();
  const pieceId = Number(params.get('morceau')) || null;
  const [piece, setPiece] = useState<StoredPiece | null>(null);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState(false);
  const [labels, setLabels] = useState<KeyLabels>('keys');

  useEffect(() => {
    setPiece(null);
    setError('');
    if (pieceId) piecesApi.get(pieceId).then(setPiece, (e: Error) => setError(e.message));
  }, [pieceId]);

  return (
    <div className="h-full">
      <button
        type="button"
        onClick={() => setPanel(true)}
        className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:text-neutral-900"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <path d="M9 18V5.5l11-2V16" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" />
        </svg>
        Morceaux
      </button>

      {pieceId ? (
        piece ? (
          <PlayAlong key={piece.id} piece={piece} labels={labels} keyboardHeight={keyboardHeight(0.24)} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">{error || 'Chargement du morceau…'}</div>
        )
      ) : (
        <FreePlay labels={labels} setLabels={setLabels} />
      )}

      {panel && (
        <PiecesPanel
          subject={subject}
          current={pieceId}
          onPick={(id) => {
            setPanel(false);
            setParams(id ? { morceau: String(id) } : {});
          }}
          onUpdated={(id, meta) => setPiece((p) => (p && p.id === id ? { ...p, ...meta } : p))}
          onClose={() => setPanel(false)}
        />
      )}
    </div>
  );
}

// Free play: every input source, nothing graded.
function FreePlay({ labels, setLabels }: { labels: KeyLabels; setLabels(l: KeyLabels): void }) {
  const settings = useObservable(inputSettings);
  const audio = useObservable(audioState);
  const held = useHeldNotes();
  const [span, setSpan] = useState<Span>('4');
  const [lastSource, setLastSource] = useState<SourceId | null>(null);
  useNoteInput((e) => e.type === 'on' && setLastSource(e.source));

  const base = (settings.keyboard.baseOctave + 1) * 12;
  const [from, to] = span === 'full' ? [MIDI_MIN, MIDI_MAX] : span === '2' ? [base, base + 23] : [base - 12, base + 35];
  const heldList = [...held].sort((a, b) => a - b);
  const shiftOctave = (d: number) => updateSettings((s) => ({
    ...s, keyboard: { ...s.keyboard, baseOctave: Math.min(7, Math.max(1, s.keyboard.baseOctave + d)) },
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="flex min-h-[12rem] flex-wrap items-center justify-center gap-4">
          {heldList.length === 0 && <span className="text-3xl font-semibold text-neutral-300 md:text-4xl">Joue une note</span>}
          {heldList.map((m) => <NoteCard key={m} midi={m} />)}
        </div>
        <div className="mt-3 h-5 text-sm text-neutral-400">
          {audio === 'loading' ? 'Chargement des sons…' : lastSource ? `via ${sourceLabels[lastSource]}` : ''}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 px-4 pb-4 text-sm text-neutral-600">
        <Segmented<Span> value={span} onChange={setSpan} options={[{ value: '2', label: '2 octaves' }, { value: '4', label: '4 octaves' }, { value: 'full', label: '88 touches' }]} />
        <Segmented<KeyLabels> value={labels} onChange={setLabels} options={[{ value: 'keys', label: 'Touches' }, { value: 'names', label: 'Notes' }, { value: 'scientific', label: 'C D E' }, { value: 'none', label: 'Aucun' }]} />
        <div className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-0.5">
          <button type="button" onClick={() => shiftOctave(-1)} className="rounded-md px-2.5 py-1.5 font-medium hover:bg-neutral-50" title="Octave plus grave">−</button>
          <span className="px-1 tabular-nums">Octave {settings.keyboard.baseOctave}</span>
          <button type="button" onClick={() => shiftOctave(1)} className="rounded-md px-2.5 py-1.5 font-medium hover:bg-neutral-50" title="Octave plus aiguë">+</button>
        </div>
        <span className="text-xs text-neutral-400">
          {keyLabel(settings.keyboard.octaveDown)} / {keyLabel(settings.keyboard.octaveUp)} pour changer d’octave au clavier
        </span>
      </div>

      <div className="border-t border-neutral-200 bg-white px-2 pb-3 pt-3 sm:px-4">
        <PianoKeyboard from={from} to={to} labels={labels} height={keyboardHeight(0.38)} />
      </div>
    </div>
  );
}

const english = (midi: number, flat = false) => noteName(midi, flat).replace('#', '♯').replace(/^([A-G])b/, '$1♭');

// One card per held note, always the same size.
function NoteCard({ midi }: { midi: number }) {
  return (
    <div className="w-28 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-center shadow-sm">
      <div className="text-3xl font-bold text-neutral-900"><NoteText text={frenchName(midi)} /></div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-neutral-500"><NoteText text={english(midi)} /></div>
    </div>
  );
}
