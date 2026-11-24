import { pieceDuration, type Hand, type PieceNote } from '@learn/shared';
import { useMemo, useRef, useState } from 'react';
import { ConfirmModal } from '../../../components/Modal';
import { ErrorText, primaryButton } from '../../../components/ui';
import { PHONE, TOUCH, useMedia } from '../../../lib/useMedia';
import { useNoteInput } from '../input/hooks';
import { PianoKeyboard, type Sticker } from '../PianoKeyboard';
import { piecesApi } from './api';
import { CellPad } from './CellPad';
import { commit, redo, startHistory, undo, type History } from './edit';
import { EditGrid, type Cell } from './EditGrid';
import { changeOf, editable, layoutOf, levelNames, levelNotes, levelOf, numbersOf, untouched, visible } from './derive';
import { setStep } from './numberEdit';
import { Small } from './Numbers';
import { partAt, stepText, type Key, type Part } from './numbers';
import { pieceRange } from './player';
import { parseRun } from './score';
import { OctaveButton } from './ScoreEditor';
import type { StoredPiece } from './types';
import { usePreview } from './usePreview';

// Changes an imported piece through its numbers, at its level: what each hand
// plays in each column of a part.
export function NotesEditor({ piece, onSaved, onClose }: { piece: StoredPiece; onSaved(id: number): void; onClose(): void }) {
  const [history, setHistory] = useState<History<PieceNote[]>>(() => startHistory(editable(piece)));
  const notes = history.present;
  const changed = history.past.length > 0;
  const level = levelOf(piece);
  const heard = useMemo(() => visible(piece, notes), [piece, notes]);

  // Beats and parts stay put; numbers follow every change.
  const layout = useMemo(() => layoutOf(piece), [piece]);
  const [division, setDivision] = useState(() => {
    const { parts } = numbersOf(levelNotes(piece), layout);
    return parts.some((p) => p.division >= 4 && p.division % 3) ? 4 : parts.some((p) => p.division % 3 === 0) ? 3 : 2;
  });
  const parts = useMemo(() => numbersOf(heard, layout, division).parts, [heard, layout, division]);
  const [index, setIndex] = useState(0);
  const part: Part = parts[index] ?? parts[0];
  const [cell, setCell] = useState<Cell | null>(null);
  const [chord, setChord] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const phone = useMedia(PHONE);
  const touch = useMedia(TOUCH);

  const duration = useMemo(() => Math.max(layout.duration, pieceDuration(notes)), [layout, notes]);
  const preview = usePreview(heard, duration);
  const playingPart = partAt(parts, preview.position);
  const column = preview.playing && playingPart === index
    ? Math.floor((layout.grid.toBeats(preview.position) - part.beat) * part.division + 0.3)
    : -1;

  // The numbers of the whole letter, not only those this part plays.
  const keys = useMemo(() => {
    const list: Key[] = [];
    for (const p of parts) {
      if (p.label !== part.label) continue;
      for (const k of p.keys) if (!list.some((o) => o.hand === k.hand && o.midi === k.midi)) list.push(k);
    }
    return list.sort((a, b) => a.number - b.number);
  }, [parts, part.label]);
  const stickers = useMemo(() => {
    const out = new Map<number, Sticker[]>();
    for (const k of keys) out.set(k.midi, [...(out.get(k.midi) ?? []), k]);
    return out;
  }, [keys]);

  const current = cell && cell.step < part.columns ? cell : null;
  const stepAt = (c: Cell) => part.rows.find((r) => r.hand === c.hand)?.steps.find((s) => s.step === c.step);
  const currentStep = current ? stepAt(current) : undefined;

  const put = (c: Cell, midis: number[]) => {
    setError('');
    const track = piece.tracks ? Math.max(0, piece.tracks.findIndex((t) => t.enabled)) : undefined;
    setHistory((h) => commit(h, setStep(h.present, part, layout.grid, c.hand, c.step, midis, track)));
  };
  const move = (to: 'previous' | 'next' | 'hand') => setCell((c) => {
    if (!c) return c;
    if (to === 'hand') return { ...c, hand: c.hand === 'left' ? 'right' : 'left' };
    return { ...c, step: Math.min(part.columns - 1, Math.max(0, c.step + (to === 'next' ? 1 : -1))) };
  });
  const write = (c: Cell, text: string): boolean => {
    const run = parseRun(text.replace(/\s+/g, '+'));
    if (!run || run.length > 1) return setError('Une case : un numéro, ou plusieurs avec + (1+3).'), false;
    const midis: number[] = [];
    for (const n of run[0] ?? []) {
      const key = keys.find((k) => k.hand === c.hand && k.number === n);
      if (!key) return setError(`Pas de touche n° ${n} ici : joue une touche du clavier pour en ajouter une.`), false;
      midis.push(key.midi);
    }
    put(c, midis);
    return true;
  };

  const onKey = useRef<(midi: number) => void>(() => {});
  onKey.current = (midi) => {
    if (leaving || preview.playing || !current) return;
    const now = stepAt(current)?.notes.map((n) => n.midi) ?? [];
    put(current, !chord ? [midi] : now.includes(midi) ? now.filter((m) => m !== midi) : [...now, midi]);
    if (!chord) move('next');
  };
  useNoteInput((e) => e.type === 'on' && e.source !== 'mic' && onKey.current(e.midi));

  const [low, high] = useMemo(() => pieceRange(piece.notes), [piece.notes]);
  const [octave, setOctave] = useState(4);
  const from = phone ? (octave + 1) * 12 : low;
  const to = phone ? from + 23 : high;

  const save = async () => {
    if (!notes.length) return setError('Il faut garder au moins une note.');
    setSaving(true);
    setError('');
    try {
      await piecesApi.saveChange(piece.id, changeOf(piece, notes));
      onSaved(piece.id);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-17 shrink-0 items-center gap-1 pl-16 pr-3 phone:h-15 phone:pl-14 sm:pr-5">
        <div className="min-w-0 flex-1 truncate font-semibold text-neutral-900">{piece.title}</div>
        <Small onClick={() => setHistory(undo)} title="Annuler le dernier changement">↶</Small>
        <Small onClick={() => setHistory(redo)} title="Rétablir">↷</Small>
        <Small
          active={preview.playing}
          onClick={() => (preview.playing ? preview.stop() : preview.play(part.start, { start: part.start, end: part.end }))}
        >
          {preview.playing ? 'Arrêter' : 'Écouter'}
        </Small>
        <Small onClick={() => (changed ? setLeaving(true) : onClose())}>Quitter</Small>
        <button type="button" onClick={() => void save()} disabled={saving || !changed} className={`${primaryButton} ml-1`}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-neutral-200 bg-white px-3 py-4 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center gap-1">
          {parts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                preview.stop();
                setIndex(i);
                setCell(null);
              }}
              aria-current={i === index}
              className={`h-9 min-w-9 rounded-lg px-2.5 text-sm font-semibold ${i === index ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
            >
              {p.label}
            </button>
          ))}
          <span className="flex-1" />
          <span className="px-2 text-xs text-neutral-400">Niveau {levelNames[level]}</span>
          {level !== 'original' && piece.edits?.[level] && (
            <Small onClick={() => setHistory((h) => commit(h, untouched(piece)))} title="Oublier les changements faits à ce niveau">Version automatique</Small>
          )}
          <select
            value={division}
            title="Durée d’une case"
            aria-label="Durée d’une case"
            onChange={(e) => {
              setDivision(Number(e.target.value));
              setCell(null);
            }}
            className="rounded-lg bg-transparent py-1.5 text-xs text-neutral-600 focus:outline-none"
          >
            <option value={1}>Case = 1 temps</option>
            <option value={2}>Case = ½ temps</option>
            <option value={3}>Case = ⅓ temps</option>
            <option value={4}>Case = ¼ temps</option>
          </select>
        </div>
        <EditGrid part={part} selected={current} column={column} small={phone} onSelect={setCell} />
        <ErrorText>{error}</ErrorText>
      </div>

      <div className="shrink-0 border-t border-neutral-200 bg-white px-3 pb-3 pt-2 sm:px-5">
        <div className="mb-2 min-h-9">
          {current ? (
            <CellPad
              id={`${index}-${current.hand}-${current.step}`}
              hand={current.hand}
              text={currentStep ? stepText(currentStep) : ''}
              keys={keys.filter((k) => k.hand === (current.hand as Hand))}
              chord={chord}
              focus={!touch && !leaving}
              onChord={setChord}
              onText={(text) => write(current, text)}
              onMove={move}
            />
          ) : (
            <span className="text-xs text-neutral-400">Choisis une case, vide ou non.</span>
          )}
        </div>
        <div className="flex items-stretch gap-1">
          {phone && <OctaveButton label="Octave plus grave" onClick={() => setOctave((o) => Math.max(1, o - 1))}>‹</OctaveButton>}
          <div className="min-w-0 flex-1">
            <PianoKeyboard from={from} to={to} labels="names" stickers={stickers} height="clamp(80px, 18dvh, 170px)" />
          </div>
          {phone && <OctaveButton label="Octave plus aiguë" onClick={() => setOctave((o) => Math.min(6, o + 1))}>›</OctaveButton>}
        </div>
      </div>

      {leaving && (
        <ConfirmModal
          title="Abandonner les changements ?"
          message="Ce qui n’est pas enregistré sera perdu."
          confirmLabel="Abandonner"
          danger
          onConfirm={onClose}
          onClose={() => setLeaving(false)}
        />
      )}
    </div>
  );
}
