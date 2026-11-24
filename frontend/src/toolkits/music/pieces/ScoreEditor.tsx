import { renderScore, scoreSchema, type Hand, type PieceDifficulty, type Score } from '@learn/shared';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Field, inputClass } from '../../../components/Field';
import { PlusIcon } from '../../../components/icons';
import { ConfirmModal, Modal } from '../../../components/Modal';
import { Popover } from '../../../components/Popover';
import { Segmented } from '../../../components/Segmented';
import { ErrorText, primaryButton, secondaryButton } from '../../../components/ui';
import { readJson, writeJson } from '../../../lib/storage';
import { PHONE, TOUCH, useMedia } from '../../../lib/useMedia';
import { useNoteInput } from '../input/hooks';
import { PianoKeyboard, type Sticker } from '../PianoKeyboard';
import { foldersApi, piecesApi } from './api';
import { CellPad } from './CellPad';
import { commit, redo, startHistory, undo, type History } from './edit';
import { EditGrid, type Cell } from './EditGrid';
import { ImportModal } from './ImportModal';
import { LabelInput, Small } from './Numbers';
import { handName, stepText } from './numbers';
import { DifficultyPicker, FolderSelect } from './pieceFields';
import { SlidersIcon } from './PlayerControls';
import { RunPanel } from './RunPanel';
import {
  addPart, addToOrder, assignKey, cellMidis, emptyScore, HANDS, MAX_BEATS, midiOf, moveInOrder, parseRun, partOf, placeRun, placeTaps,
  removeFromOrder, removePart, renamePart, runText, scoreGrid, setBeats, setCell, setDivision, shiftHand, unknownNumbers,
} from './score';
import type { PieceFolder, StoredPiece } from './types';
import { usePreview } from './usePreview';

// Writes a piece by hand, in numbers: its parts on a grid, then their order.
// What is not saved yet is kept on this device.

const draftKey = (id: number | null) => `learn.score.${id ?? 'new'}`;
const DIVISIONS: { value: Score['division']; label: string }[] = [
  { value: 2, label: '½ temps' }, { value: 3, label: '⅓ temps' }, { value: 4, label: '¼ temps' },
];

// Numbers waiting for their key to be clicked.
interface Placing {
  hand: Hand;
  numbers: number[];
  // What was being written.
  then: { kind: 'cell'; step: number; text: string } | { kind: 'run'; text: string } | null;
  // Numbers read on a picture: the same key in every part, then the other hand's.
  everywhere?: { later: { hand: Hand; numbers: number[] }[] };
}

// A score to start from, with numbers whose keys are not known yet.
export interface ScoreDraft {
  title: string;
  score: Score;
  toPlace: { hand: Hand; numbers: number[] }[];
}

const placingOf = ([first, ...later]: ScoreDraft['toPlace'] = []): Placing | null =>
  (first ? { ...first, then: null, everywhere: { later } } : null);

export function ScoreEditor({ subject, piece, from: given, onSaved, onClose }: {
  subject: string;
  // Null: a new piece.
  piece: StoredPiece | null;
  from?: ScoreDraft;
  onSaved(id: number): void;
  onClose(): void;
}) {
  const key = draftKey(piece?.id ?? null);
  const [draft] = useState(() => (given ? null : readJson<{ score: Score | null }>(key, { score: null }).score));
  const [history, setHistory] = useState<History<Score>>(() => {
    const saved = piece?.score ?? emptyScore();
    if (given) return { ...startHistory(saved), past: [saved], present: given.score };
    return draft?.parts?.length ? { ...startHistory(saved), past: [saved], present: draft } : startHistory(saved);
  });
  const score = history.present;
  const changed = history.past.length > 0;
  useEffect(() => {
    if (changed) writeJson(key, { score });
  }, [key, score, changed]);

  const [label, setLabel] = useState(score.parts[0].label);
  const part = partOf(score, label);
  const grid = useMemo(() => scoreGrid(score, part.label), [score, part.label]);
  const [cell, setCellPicked] = useState<Cell | null>({ hand: 'right', step: 0 });
  const [chord, setChord] = useState(false);
  const [placing, setPlacing] = useState<Placing | null>(() => placingOf(given?.toPlace));
  // From a file instead: what it is read into may come here, or be a piece by itself.
  const [importing, setImporting] = useState(false);
  const [title, setTitle] = useState(given?.title ?? '');
  const [folders, setFolders] = useState<PieceFolder[]>([]);
  useEffect(() => {
    if (importing) foldersApi.list(subject).then(setFolders, () => {});
  }, [importing, subject]);
  const [writing, setWriting] = useState<{ hand: Hand; text?: string } | null>(null);
  const [orderAt, setOrderAt] = useState<number | null>(null);
  const [dialog, setDialog] = useState<'save' | 'leave' | 'remove' | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const phone = useMedia(PHONE);
  const touch = useMedia(TOUCH);

  const edit = (change: (s: Score) => Score) => {
    setError('');
    setHistory((h) => commit(h, change(h.present)));
  };

  // --- Listening ---------------------------------------------------------------------
  const rendered = useMemo(() => renderScore(score), [score]);
  const preview = usePreview(rendered.notes, rendered.duration);
  const beat = 60 / score.bpm;
  // Where the part shown is played: the first time, in the piece.
  const partStart = rendered.sections.find((s) => s.label === part.label)?.start ?? null;
  const partEnd = partStart === null ? 0 : partStart + part.beats * beat;
  const playingColumn = useMemo(() => {
    if (!preview.playing) return -1;
    for (const s of rendered.sections) {
      const p = partOf(score, s.label);
      const at = preview.position - s.start;
      if (at >= -0.03 && at < p.beats * beat - 0.03) return p.label === part.label ? Math.floor((at / beat) * score.division + 0.2) : -1;
    }
    return -1;
  }, [preview.playing, preview.position, rendered, score, part.label, beat]);

  // --- Cells ----------------------------------------------------------------------------
  const pick = (c: Cell) => {
    setCellPicked(c);
    setPlacing(null);
  };
  const move = (to: 'previous' | 'next' | 'hand') => {
    if (!cell) return;
    if (to === 'hand') return setCellPicked({ ...cell, hand: cell.hand === 'left' ? 'right' : 'left' });
    const step = Math.max(0, cell.step + (to === 'next' ? 1 : -1));
    // Past the end, the part gets one more bar.
    if (step >= grid.columns) {
      if (part.beats + 4 > MAX_BEATS) return;
      edit((s) => setBeats(s, part.label, partOf(s, part.label).beats + 4));
    }
    setCellPicked({ ...cell, step });
  };
  const writeCell = (hand: Hand, step: number, text: string): boolean => {
    const run = parseRun(text.replace(/\s+/g, '+'));
    if (!run || run.length > 1) return setError('Une case : un numéro, ou plusieurs avec + (1+3).'), false;
    const missing = unknownNumbers(part, hand, run);
    if (missing.length) {
      setPlacing({ hand, numbers: missing, then: { kind: 'cell', step, text } });
      return false;
    }
    edit((s) => setCell(s, part.label, hand, step, (run[0] ?? []).map((n) => midiOf(partOf(s, part.label), hand, n)!)));
    return true;
  };

  // A key played: the one a number waits for, or what the cell holds.
  // A number typed and not entered yet, then a key: that is its key.
  const typed = useRef('');
  const typedPlacing = (): Placing | null => {
    const run = parseRun(typed.current.trim().replace(/\s+/g, '+'));
    if (!cell || run?.length !== 1) return null;
    const numbers = unknownNumbers(part, cell.hand, run);
    return numbers.length ? { hand: cell.hand, numbers, then: { kind: 'cell', step: cell.step, text: typed.current.trim() } } : null;
  };
  const onKey = useRef<(midi: number) => void>(() => {});
  onKey.current = (midi) => {
    if (writing || dialog || importing || preview.playing) return;
    const asked = placing ?? typedPlacing();
    typed.current = '';
    if (asked) {
      const [number, ...rest] = asked.numbers;
      const { hand, then } = asked;
      const next = asked.everywhere
        ? score.parts.reduce((s, p) => assignKey(s, p.label, hand, number, midi), score)
        : assignKey(score, part.label, hand, number, midi);
      if (rest.length) {
        edit(() => next);
        return setPlacing({ ...asked, numbers: rest });
      }
      const [following, ...later] = asked.everywhere?.later ?? [];
      setPlacing(following ? { ...following, then: null, everywhere: { later } } : null);
      if (then?.kind === 'cell') {
        const p = partOf(next, part.label);
        const midis = (parseRun(then.text.replace(/\s+/g, '+'))?.[0] ?? []).map((n) => midiOf(p, hand, n)!);
        edit(() => setCell(next, part.label, hand, then.step, midis));
        setCellPicked({ hand, step: Math.min(grid.columns - 1, then.step + 1) });
      } else {
        edit(() => next);
        if (then?.kind === 'run') setWriting({ hand, text: then.text });
      }
      return;
    }
    if (!cell || cell.step >= grid.columns) return;
    const now = cellMidis(part, cell.hand, cell.step);
    const midis = !chord ? [midi] : now.includes(midi) ? now.filter((m) => m !== midi) : [...now, midi];
    edit((s) => setCell(s, part.label, cell.hand, cell.step, midis));
    if (!chord) move('next');
  };
  // Not the microphone: it would hear the preview.
  useNoteInput((e) => e.type === 'on' && e.source !== 'mic' && onKey.current(e.midi));

  // --- Keyboard ---------------------------------------------------------------------------
  const [octave, setOctave] = useState(3);
  const low = phone ? (octave + 1) * 12 : octave * 12;
  const [from, to] = phone ? [low, low + 23] : [low, Math.min(108, low + 59)];
  const stickers = useMemo(() => {
    const out = new Map<number, Sticker[]>();
    for (const k of part.keys) out.set(k.midi, [...(out.get(k.midi) ?? []), k]);
    return out;
  }, [part.keys]);

  const showPart = (l: string) => {
    preview.stop();
    setLabel(l);
    setPlacing(null);
    setCellPicked((c) => (c ? { ...c, step: 0 } : c));
  };

  // --- Saving ----------------------------------------------------------------------------
  const problem = () => {
    const r = scoreSchema.safeParse(score);
    return r.success ? null : r.error.issues[0].message;
  };
  const done = (id: number) => {
    writeJson(key, { score: null });
    onSaved(id);
  };
  const save = async () => {
    const wrong = problem();
    if (wrong) return setError(wrong === 'Aucune note' ? 'Il faut au moins une note dans l’ordre du morceau.' : wrong);
    if (!piece) return setDialog('save');
    setSaving(true);
    try {
      await piecesApi.saveScore(piece.id, score);
      done(piece.id);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const current = cell && cell.step < grid.columns ? cell : null;
  const currentStep = current && grid.rows.find((r) => r.hand === current.hand)?.steps.find((s) => s.step === current.step);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-17 shrink-0 items-center gap-1 pl-16 pr-3 phone:h-15 phone:pl-14 sm:pr-5">
        <div className="min-w-0 flex-1 truncate font-semibold text-neutral-900">{piece ? piece.title : 'Nouveau morceau'}</div>
        <Small onClick={() => setHistory(undo)} title="Annuler le dernier changement">↶</Small>
        <Small onClick={() => setHistory(redo)} title="Rétablir">↷</Small>
        <Popover label={<SlidersIcon className="h-4 w-4" />} title="Tempo et grille" className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100">
          <div className="space-y-4">
            <NumberField label="Tempo" unit="bpm" value={score.bpm} min={20} max={300} onChange={(bpm) => edit((s) => ({ ...s, bpm }))} />
            <Field label="Une case vaut">
              <Segmented<Score['division']> full value={score.division} onChange={(d) => edit((s) => setDivision(s, d))} options={DIVISIONS} />
            </Field>
          </div>
        </Popover>
        {!piece && <Small onClick={() => { preview.stop(); setImporting(true); }} title="Image, partition PDF, vidéo ou son">Partir d’un fichier</Small>}
        <Small onClick={() => (changed ? setDialog('leave') : onClose())}>Quitter</Small>
        <button type="button" onClick={() => void save()} disabled={saving} className={`${primaryButton} ml-1`}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-neutral-200 bg-white px-3 py-4 sm:px-6">
        {!piece && !part.notes.length && !placing && score.parts.length === 1 && (
          <button
            type="button"
            onClick={() => setImporting(true)}
            className="mb-5 w-full rounded-xl border-2 border-dashed border-neutral-200 px-4 py-5 text-center text-sm text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-900"
          >
            <span className="block font-medium text-neutral-900">Partir d’un fichier</span>
            <span className="mt-1 block text-xs text-neutral-400">Image de numéros ou de partition (lue par l’IA) · partition PDF · vidéo · son. Ou remplis la grille à la main.</span>
          </button>
        )}
        {draft && changed && (
          <p className="mb-3 text-xs text-neutral-500">
            Brouillon repris sur cet appareil.
            <button
              type="button"
              className="ml-2 font-medium text-neutral-900 underline"
              onClick={() => {
                edit(() => piece?.score ?? emptyScore());
                setLabel((piece?.score ?? emptyScore()).parts[0].label);
              }}
            >
              {piece ? 'Version enregistrée' : 'Repartir de zéro'}
            </button>
          </p>
        )}

        {/* The part being written. */}
        <div className="mb-5 flex flex-wrap items-center gap-1">
          {score.parts.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => showPart(p.label)}
              aria-current={p.label === part.label}
              className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition-colors ${p.label === part.label ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            title="Nouvelle partie"
            aria-label="Nouvelle partie"
            onClick={() => {
              const added = addPart(score, part.label, false);
              edit(() => added.score);
              showPart(added.label);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
          <span className="flex-1" />
          <Small
            active={preview.playing}
            onClick={() => {
              if (preview.playing) preview.stop();
              else if (partStart === null) setError(`Ajoute ${part.label} à l’ordre du morceau pour l’écouter.`);
              else preview.play(partStart, { start: partStart, end: partEnd });
            }}
          >
            {preview.playing ? 'Arrêter' : 'Écouter'}
          </Small>
          <Small onClick={() => { preview.stop(); setWriting({ hand: current?.hand ?? 'right' }); }} title="Taper toute une suite de numéros, puis son rythme">Écrire la suite</Small>
          <Popover label="•••" title={`Partie ${part.label}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-xs text-neutral-600 hover:bg-neutral-100">
            {(close) => (
              <div className="space-y-4">
                <Field label="Nom">
                  <LabelInput
                    key={part.label}
                    label={part.label}
                    onRename={(to) => {
                      const next = renamePart(score, part.label, to);
                      if (next === score) return setError('Une autre partie a déjà ce nom.');
                      edit(() => next);
                      setLabel(to.trim().slice(0, 12));
                    }}
                  />
                </Field>
                <NumberField label="Durée" unit="temps" value={part.beats} min={1} max={MAX_BEATS} onChange={(b) => edit((s) => setBeats(s, part.label, b))} />
                <div>
                  <div className="mb-1.5 text-sm font-semibold text-neutral-900">Décaler une main</div>
                  {HANDS.map((h) => (
                    <div key={h} className="flex items-center text-sm text-neutral-600">
                      <span className="flex-1">{handName(h)}</span>
                      <Small onClick={() => edit((s) => shiftHand(s, part.label, h, -1))} title="Une case plus tôt">←</Small>
                      <Small onClick={() => edit((s) => shiftHand(s, part.label, h, 1))} title="Une case plus tard">→</Small>
                    </div>
                  ))}
                </div>
                <div className="-mx-2 flex flex-col items-start">
                  <Small
                    onClick={() => {
                      const added = addPart(score, part.label, true);
                      edit(() => added.score);
                      showPart(added.label);
                      close();
                    }}
                  >
                    Dupliquer la partie
                  </Small>
                  {score.parts.length > 1 && <Small onClick={() => { close(); setDialog('remove'); }}>Supprimer la partie</Small>}
                </div>
              </div>
            )}
          </Popover>
        </div>

        <EditGrid part={grid} selected={current} column={playingColumn} small={phone} onSelect={pick} />
        <ErrorText>{error}</ErrorText>

        {/* Order the parts are played in. */}
        <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-neutral-100 pt-4">
          <span className="mr-2 text-xs text-neutral-500">Ordre du morceau</span>
          {score.order.map((l, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setOrderAt(orderAt === i ? null : i)}
              aria-pressed={orderAt === i}
              className={`h-8 min-w-8 rounded-lg px-2 text-sm font-semibold ${orderAt === i ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
            >
              {l}
            </button>
          ))}
          {orderAt !== null && orderAt < score.order.length ? (
            <>
              <Small onClick={() => { edit((s) => moveInOrder(s, orderAt, -1)); setOrderAt(Math.max(0, orderAt - 1)); }} title="Plus tôt">←</Small>
              <Small onClick={() => { edit((s) => moveInOrder(s, orderAt, 1)); setOrderAt(Math.min(score.order.length - 1, orderAt + 1)); }} title="Plus tard">→</Small>
              <Small onClick={() => { edit((s) => removeFromOrder(s, orderAt)); setOrderAt(null); }}>Retirer</Small>
            </>
          ) : (
            <>
              <Small onClick={() => edit((s) => addToOrder(s, part.label))} title={`Jouer ${part.label} à la fin`}>+ {part.label}</Small>
              <span className="flex-1" />
              <Small onClick={() => (preview.playing ? preview.stop() : preview.play(0))}>{preview.playing ? 'Arrêter' : 'Écouter tout'}</Small>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-neutral-200 bg-white px-3 pb-3 pt-2 sm:px-5">
        {placing ? (
          <div className="mb-2 flex min-h-9 flex-wrap items-center gap-3 text-sm text-neutral-900">
            <span>Où est le <b className="text-lg tabular-nums">{placing.numbers[0]}</b> de la main {placing.hand === 'left' ? 'gauche' : 'droite'} ? Clique sa touche.{placing.everywhere && <span className="text-xs text-neutral-500"> Encore {placing.numbers.length + placing.everywhere.later.reduce((n, l) => n + l.numbers.length, 0)}.</span>}</span>
            <button type="button" onClick={() => setPlacing(null)} className="text-xs text-neutral-500 underline">{placing.everywhere ? 'Plus tard' : 'Annuler'}</button>
          </div>
        ) : (
          <div className="mb-2 min-h-9">
            {current ? (
              <CellPad
                id={`${part.label}-${current.hand}-${current.step}`}
                hand={current.hand}
                text={currentStep ? stepText(currentStep) : ''}
                keys={part.keys.filter((k) => k.hand === current.hand)}
                chord={chord}
                focus={!touch && !writing && !dialog && !importing}
                onChord={setChord}
                onTyping={(text) => { typed.current = text; }}
                onText={(text) => writeCell(current.hand, current.step, text)}
                onMove={move}
                onMoveKey={(number) => setPlacing({ hand: current.hand, numbers: [number], then: null })}
              />
            ) : (
              <span className="text-xs text-neutral-400">Choisis une case de la grille.</span>
            )}
          </div>
        )}
        <div className="flex items-stretch gap-1">
          <OctaveButton label="Octave plus grave" onClick={() => setOctave((o) => Math.max(2, o - 1))}>‹</OctaveButton>
          <div className="min-w-0 flex-1">
            <PianoKeyboard from={from} to={to} labels="names" stickers={stickers} height="clamp(80px, 18dvh, 170px)" />
          </div>
          <OctaveButton label="Octave plus aiguë" onClick={() => setOctave((o) => Math.min(phone ? 6 : 4, o + 1))}>›</OctaveButton>
        </div>
      </div>

      {writing && (
        <RunPanel
          key={`${part.label}${writing.text ?? ''}`}
          hand={writing.hand}
          textOf={(h) => (writing.text !== undefined && h === writing.hand ? writing.text : runText(part, h))}
          unknown={(h, run) => unknownNumbers(part, h, run)}
          midiOf={(h, n) => midiOf(part, h, n)}
          onPlaceKeys={(h, numbers, text) => {
            setWriting(null);
            setPlacing({ hand: h, numbers, then: { kind: 'run', text } });
          }}
          onPlace={(h, run, taps) => {
            edit((s) => (taps ? placeTaps(s, part.label, h, run, taps) : placeRun(s, part.label, h, run, run.map((_, i) => i))));
            setWriting(null);
          }}
          onClose={() => setWriting(null)}
        />
      )}
      {importing && (
        <ImportModal
          subject={subject}
          folders={folders}
          onClose={() => setImporting(false)}
          onSaved={onSaved}
          onNumbers={(read) => {
            setImporting(false);
            edit(() => read.score);
            setLabel(read.score.parts[0].label);
            setTitle(read.title);
            setCellPicked({ hand: 'right', step: 0 });
            setPlacing(placingOf(read.toPlace));
          }}
        />
      )}
      {dialog === 'remove' && (
        <ConfirmModal
          title={`Supprimer la partie ${part.label} ?`}
          message="Elle disparaît aussi de l’ordre du morceau. ↶ pour revenir en arrière."
          confirmLabel="Supprimer"
          danger
          onConfirm={() => {
            const next = removePart(score, part.label);
            edit(() => next);
            showPart(next.parts[0].label);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'leave' && (
        <ConfirmModal
          title="Abandonner les changements ?"
          message="Ce qui n’est pas enregistré sera perdu."
          confirmLabel="Abandonner"
          danger
          onConfirm={() => {
            writeJson(key, { score: null });
            onClose();
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'save' && <SaveModal subject={subject} title={title} score={score} onClose={() => setDialog(null)} onSaved={done} />}
    </div>
  );
}

export function OctaveButton({ label, onClick, children }: { label: string; onClick(): void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="w-8 shrink-0 rounded-lg text-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900">{children}</button>
  );
}

// A number typed freely, taken when it makes sense.
function NumberField({ label, unit, value, min, max, onChange }: { label: string; unit: string; value: number; min: number; max: number; onChange(v: number): void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const save = () => {
    const n = Math.round(Number(text));
    if (!text.trim() || !Number.isFinite(n)) return setText(String(value));
    const ok = Math.min(max, Math.max(min, n));
    setText(String(ok));
    if (ok !== value) onChange(ok);
  };
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-600">
      <span className="flex-1 font-semibold text-neutral-900">{label}</span>
      <input
        value={text}
        inputMode="numeric"
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="w-16 rounded-lg border border-neutral-200 px-2 py-1.5 text-center tabular-nums focus:border-neutral-500 focus:outline-none"
      />
      {unit}
    </label>
  );
}

function SaveModal({ subject, title: named, score, onClose, onSaved }: { subject: string; title: string; score: Score; onClose(): void; onSaved(id: number): void }) {
  const [title, setTitle] = useState(named);
  const [artist, setArtist] = useState('');
  const [folder, setFolder] = useState<number | null>(null);
  const [folders, setFolders] = useState<PieceFolder[]>([]);
  const [difficulty, setDifficulty] = useState<PieceDifficulty | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    foldersApi.list(subject).then(setFolders, () => {});
  }, [subject]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const { id } = await piecesApi.createScore(subject, { title: title.trim(), artist: artist.trim() || null }, score, { folder_id: folder, difficulty });
      onSaved(id);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <Modal title="Enregistrer le morceau" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label="Titre"><input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className={inputClass} autoFocus /></Field>
        <Field label="Artiste"><input value={artist} maxLength={120} placeholder="Facultatif" onChange={(e) => setArtist(e.target.value)} className={inputClass} /></Field>
        {folders.length > 0 && <Field label="Dossier"><FolderSelect folders={folders} value={folder} onChange={setFolder} /></Field>}
        <Field label="Difficulté"><DifficultyPicker value={difficulty} onChange={setDifficulty} /></Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Annuler</button>
          <button type="submit" disabled={!title.trim() || saving} className={primaryButton}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </Modal>
  );
}
