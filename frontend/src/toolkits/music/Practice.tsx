import { frenchName, MIDI_MAX, MIDI_MIN, noteName } from '@learn/shared';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Segmented } from '../../components/Segmented';
import { useObservable } from '../../lib/store';
import { PHONE, useMedia } from '../../lib/useMedia';
import { NoteText } from './Accidentals';
import { audioState, ensureAudio } from './audio';
import { sourceLabels, type SourceId } from './input/bus';
import { useHeldNotes, useNoteInput } from './input/hooks';
import { PianoKeyboard, type KeyLabels } from './PianoKeyboard';
import { piecesApi } from './pieces/api';
import { NotesEditor } from './pieces/NotesEditor';
import { PiecesPanel } from './pieces/PiecesPanel';
import { PlayAlong } from './pieces/PlayAlong';
import { ScoreEditor } from './pieces/ScoreEditor';
import { currentOf, drop, next, previous, startQueue, type Queue } from './pieces/shuffle';
import type { StoredPiece } from './pieces/types';

type Span = '1' | '2' | '4' | 'full';

// Practice page of music subjects: free play, or one of the account's
// imported pieces (?morceau=<id>) with falling notes, or all of them one after
// the other in a random order.
export function MusicPractice({ subject }: { subject: string }) {
  const [params, setParams] = useSearchParams();
  const [queue, setQueue] = useState<Queue | null>(null);
  const pieceId = queue ? currentOf(queue) : Number(params.get('morceau')) || null;
  // Kept when the listening stops, so that the piece goes on.
  const turn = useRef(0);
  if (queue) turn.current = queue.turn;
  const [piece, setPiece] = useState<StoredPiece | null>(null);
  // Writing a piece: a new one (?nouveau) or this one (?modifier).
  const creating = params.has('nouveau');
  const changing = !!pieceId && !queue && params.has('modifier');
  // Read again once changed.
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState(false);
  const [labels, setLabels] = useState<KeyLabels>('names');

  useEffect(() => {
    setPiece(null);
    setError('');
    if (!pieceId) return;
    let stale = false;
    piecesApi.get(pieceId).then((p) => !stale && setPiece(p), (e: Error) => {
      if (stale) return;
      setError(e.message);
      setQueue((q) => q && drop(q, pieceId));
    });
    return () => {
      stale = true;
    };
  }, [pieceId, version]);

  // Listening: the address follows the piece being played.
  const queued = queue && pieceId;
  useEffect(() => {
    if (queued) setParams({ morceau: String(queued) }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queued]);

  if (creating) {
    return <ScoreEditor subject={subject} piece={null} onSaved={(id) => setParams({ morceau: String(id) }, { replace: true })} onClose={() => setParams({}, { replace: true })} />;
  }
  if (changing && piece && piece.id === pieceId) {
    const back = () => setParams({ morceau: String(pieceId) }, { replace: true });
    const saved = () => {
      setVersion((v) => v + 1);
      back();
    };
    return piece.score
      ? <ScoreEditor key={piece.id} subject={subject} piece={piece} onSaved={saved} onClose={back} />
      : <NotesEditor key={piece.id} piece={piece} onSaved={saved} onClose={back} />;
  }

  return (
    <div className="h-full">
      <button
        type="button"
        onClick={() => setPanel(true)}
        aria-label="Morceaux"
        className="absolute right-4 top-4 z-10 phone:right-2.5 phone:top-2.5 phone:p-2.5 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-neutral-700 ring-1 ring-neutral-200 transition-colors hover:text-neutral-900"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <path d="M9 18V5.5l11-2V16" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" />
        </svg>
        <span className="phone:hidden">Morceaux</span>
      </button>

      {pieceId ? (
        piece && piece.id === pieceId ? (
          <PlayAlong
            key={`${piece.id}-${turn.current}`}
            piece={piece}
            labels={labels}
            listening={queue ? {
              next: () => setQueue((q) => q && next(q)),
              previous: () => setQueue((q) => q && previous(q)),
              stop: () => setQueue(null),
            } : undefined}
            onEditNumbers={() => {
              setQueue(null);
              setParams({ morceau: String(pieceId), modifier: '1' });
            }}
            onChange={(change) => setPiece((p) => (p && p.id === piece.id ? { ...p, ...change } : p))}
          />
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
          listening={queue !== null}
          onShuffle={(ids) => {
            // Browsers only start the sound from a click.
            void ensureAudio().catch(() => {});
            setPanel(false);
            const started = startQueue(ids);
            setQueue(started && { ...started, turn: turn.current + 1 });
          }}
          onCreate={() => {
            setPanel(false);
            setQueue(null);
            setParams({ nouveau: '1' });
          }}
          onPick={(id) => {
            setPanel(false);
            setQueue(null);
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
  const audio = useObservable(audioState);
  const held = useHeldNotes();
  const phone = useMedia(PHONE);
  // Upright, four octaves leave keys too thin for fingers.
  const [span, setSpan] = useState<Span>(() => (phone && window.innerWidth < 640 ? '2' : '4'));
  const [lastSource, setLastSource] = useState<SourceId | null>(null);
  useNoteInput((e) => e.type === 'on' && setLastSource(e.source));

  const [octave, setOctave] = useState(4);
  const base = (octave + 1) * 12;
  const [from, to] = span === 'full' ? [MIDI_MIN, MIDI_MAX] : span === '2' ? [base, base + 23] : span === '1' ? [base, base + 11] : [base - 12, base + 35];
  const heldList = [...held].sort((a, b) => a - b);
  const shiftOctave = (d: number) => setOctave((o) => Math.min(6, Math.max(2, o + d)));

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 text-center">
        <div className="flex min-h-[12rem] short:min-h-0 flex-wrap items-center justify-center gap-4">
          {heldList.length === 0 && <span className="text-3xl font-semibold text-neutral-300 md:text-4xl">Joue une note</span>}
          {heldList.map((m) => <NoteCard key={m} midi={m} />)}
        </div>
        <div className="mt-3 h-5 text-sm text-neutral-400">
          {audio === 'loading' ? 'Chargement des sons…' : lastSource ? `via ${sourceLabels[lastSource]}` : ''}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 px-4 pb-4 text-sm text-neutral-600 phone:gap-2 phone:pb-3">
        <Segmented<Span> value={span} onChange={setSpan} options={[...(phone ? [{ value: '1' as const, label: '1 octave' }] : []), { value: '2', label: '2 octaves' }, { value: '4', label: '4 octaves' }, ...(phone ? [] : [{ value: 'full' as const, label: '88 touches' }])]} />
        <Segmented<KeyLabels> value={labels} onChange={setLabels} options={[{ value: 'names', label: 'Notes' }, { value: 'scientific', label: 'C D E' }, { value: 'none', label: 'Aucun' }]} />
        <div className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-0.5">
          <button type="button" onClick={() => shiftOctave(-1)} className="rounded-md px-2.5 py-1.5 font-medium hover:bg-neutral-50" title="Octave plus grave" aria-label="Octave plus grave">−</button>
          <span className="px-1 tabular-nums">Octave {octave}</span>
          <button type="button" onClick={() => shiftOctave(1)} className="rounded-md px-2.5 py-1.5 font-medium hover:bg-neutral-50" title="Octave plus aiguë" aria-label="Octave plus aiguë">+</button>
        </div>
      </div>

      <div className="border-t border-neutral-200 bg-white px-2 pb-3 pt-3 sm:px-4">
        <PianoKeyboard from={from} to={to} labels={labels} height="clamp(130px, 38dvh, 320px)" />
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
