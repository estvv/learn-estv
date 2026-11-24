import { isBlack, pieceDuration, renderScore, type Hand, type PieceLevel, type PieceNote, type PieceSection } from '@learn/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PencilIcon, RepeatIcon, ShuffleIcon } from '../../../components/icons';
import { ConfirmModal } from '../../../components/Modal';
import { Segmented } from '../../../components/Segmented';
import { readJson, writeJson } from '../../../lib/storage';
import { useObservable } from '../../../lib/store';
import { COMPACT, PHONE, SHORT, TOUCH, useMedia } from '../../../lib/useMedia';
import { useWakeLock } from '../../../lib/useWakeLock';
import { useNoteInput } from '../input/hooks';
import { PianoKeyboard, type KeyLabels, type KeyMark, type Sticker } from '../PianoKeyboard';
import { piecesApi } from './api';
import {
  commit, cutAfter, cutBefore, redo, removeNotes, startHistory, switchHand, transpose, undo, withIds, withoutIds,
  type EditNote, type History,
} from './edit';
import { FallingNotes } from './FallingNotes';
import { BeatGrid, beatGrid } from './grid';
import { FINGER_KEY, scrollToKeys } from './keyScroll';
import { givenByScore, handName, numberPiece, partAt } from './numbers';
import { Numbers } from './Numbers';
import { cutAt, fromSaved, joinPrevious, moveStart, rename, shiftParts, toSaved } from './parts';
import { Cover } from './pieceFields';
import { PieceOptions, RATES, type HandChoice } from './PieceOptions';
import { PiecePlayer, pieceRange, type PlayMode } from './player';
import { clock, ControlButton, controlIcon, PlayButton, SkipButton, SlidersIcon, Timeline, TracksMenu, type ControlSize } from './PlayerControls';
import { detectSections, type Section } from './sections';
import { handOf, simplify } from './simplify';
import type { StoredPiece } from './types';

// Shuffled listening: the pieces follow one another (see shuffle.ts).
export interface Listening {
  next(): void;
  previous(): void;
  stop(): void;
}

// Before that, "previous" goes to the piece before; after, back to the start.
const RESTART_AFTER = 3;

// Keys thinner than this have no room for a name.
const NAMED_KEY = 18;

// Numbers on or off: kept on this device.
const NUMBERS_KEY = 'learn.numbers.v1';
const HANDS: Hand[] = ['left', 'right'];

// A piece with falling notes above the keyboard: listen to it, or let it wait
// for the right notes, with the piece as numbers above (see numbers.ts).
// "Corriger" turns the notes into an editor for small
// fixes (see edit.ts).
//
// One toolbar on a computer. On a phone or a tablet: the title on top, the
// player under the keyboard, the rest in a sheet; on a phone on its side,
// one thin bar.
export function PlayAlong({ piece, labels, listening, onEditNumbers, onNotesSaved }: {
  piece: StoredPiece;
  labels: KeyLabels;
  listening?: Listening;
  // The piece is changed on a page of its own.
  onEditNumbers(): void;
  onNotesSaved(notes: PieceNote[]): void;
}) {
  // Editing: the notes being corrected, with undo; null when not editing.
  const [history, setHistory] = useState<History | null>(null);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [leaving, setLeaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const source: PieceNote[] = history ? history.present : piece.notes;

  // Multi-track files: the notes of the tracks turned on. The player stays the
  // same when tracks change, so does the place in the piece.
  const [enabled, setEnabled] = useState<boolean[]>(() => piece.tracks?.map((t) => t.enabled) ?? []);
  const trackNotes = useMemo(
    () => (piece.tracks ? source.filter((n) => n.track === undefined || enabled[n.track]) : source),
    [source, piece.tracks, enabled],
  );
  // Level: the whole piece, or an easier version (see simplify.ts). The
  // editor always works on the real notes.
  const [level, setLevel] = useState<PieceLevel>(piece.level ?? 'original');
  const isEditing = history !== null;
  const notes = useMemo(() => (isEditing ? trackNotes : simplify(trackNotes, level)), [trackNotes, level, isEditing]);
  // Written by hand: its tempo, parts and numbers are known, silences included.
  const score = piece.score ?? null;
  const written = useMemo(() => score && renderScore(score), [score]);
  const duration = useMemo(() => written?.duration ?? pieceDuration(source), [written, source]);
  const player = useMemo(() => new PiecePlayer(piece.notes, pieceDuration(piece.notes)), [piece.notes]);
  useEffect(() => () => player.dispose(), [player]);
  // One hand at a time: the other is neither heard nor shown.
  const [handChoice, setHand] = useState<HandChoice>('both');
  const bothHands = useMemo(() => notes.some((n) => handOf(n) === 'left') && notes.some((n) => handOf(n) === 'right'), [notes]);
  const hand = bothHands && !isEditing ? handChoice : 'both';
  const heard = useMemo(() => (hand === 'both' ? notes : notes.filter((n) => handOf(n) === hand)), [notes, hand]);
  useEffect(() => player.setNotes(heard, duration), [player, heard, duration]);
  const state = useObservable(player.state);
  const [mode, setMode] = useState<PlayMode>('listen');
  const [rate, setRate] = useState(1);
  const [, setFrame] = useState(0);
  const compact = useMedia(COMPACT);
  const phone = useMedia(PHONE);
  const short = useMedia(SHORT);
  const touch = useMedia(TOUCH);
  const [options, setOptions] = useState(false);
  useWakeLock(state.playing);
  // The keyboard keeps the original range while editing (no jumping when a note moves).
  const [from, to] = useMemo(() => pieceRange(notes.length && !history ? notes : piece.notes), [notes, piece.notes, history]);
  // The piece cut into sections (A B A C…) that can be looped: the owner's,
  // else found from the notes. The same at every level.
  const [ownParts, setOwnParts] = useState<PieceSection[] | null>(piece.sections ?? null);
  const [partsError, setPartsError] = useState('');
  const grid = useMemo(() => (isEditing ? null : score ? BeatGrid.regular(0, 60 / score.bpm) : beatGrid(trackNotes, piece.bpm)), [trackNotes, piece.bpm, score, isEditing]);
  const sections = useMemo((): Section[] => {
    if (isEditing) return [];
    if (written) return fromSaved(written.sections, duration);
    if (ownParts) return fromSaved(ownParts, duration);
    const found = detectSections(trackNotes, piece.bpm, grid);
    return found.length ? found : [{ start: 0, end: duration, label: 'A' }];
  }, [isEditing, written, ownParts, duration, trackNotes, piece.bpm, grid]);

  const [numbersOn, setNumbersOn] = useState(() => readJson(NUMBERS_KEY, { on: true }).on);
  const [bigNumbers, setBigNumbers] = useState(false);
  const showNumbers = numbersOn && !isEditing;
  const big = showNumbers && bigNumbers;
  const numbered = useMemo(() => (showNumbers ? numberPiece(notes, sections, grid, score ? givenByScore(score) : {}) : null), [showNumbers, notes, sections, grid, score]);
  const shownParts = useMemo(() => {
    const own = <T extends { hand: Hand }>(list: T[]) => (hand === 'both' ? list : list.filter((x) => x.hand === hand));
    return numbered?.parts.map((p) => ({ ...p, rows: own(p.rows), keys: own(p.keys) })) ?? [];
  }, [numbered, hand]);
  // Looped sections, first and last index (inclusive).
  const [loop, setLoop] = useState<[number, number] | null>(null);

  const applyLoop = (next: [number, number] | null) => {
    setLoop(next);
    player.setLoop(next ? { start: sections[next[0]].start, end: sections[next[1]].end } : null);
    setFrame((f) => f + 1);
  };
  useNoteInput();

  // --- Editing ---------------------------------------------------------------------
  const editing = history !== null;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const leavingRef = useRef(leaving);
  leavingRef.current = leaving;

  const apply = (change: (notes: EditNote[], ids: Set<number>) => EditNote[]) =>
    setHistory((h) => h && commit(h, change(h.present, selectedRef.current)));
  const startEditing = () => {
    player.pause();
    setMode('listen');
    player.setMode('listen');
    applyLoop(null);
    setSelected(new Set());
    setEditError('');
    setHistory(startHistory(withIds(piece.notes)));
  };
  const stopEditing = () => {
    setHistory(null);
    setSelected(new Set());
    setLeaving(false);
  };
  const saveEdits = async () => {
    if (!history) return;
    if (!history.present.length) return setEditError('Il faut garder au moins une note.');
    setSaving(true);
    setEditError('');
    try {
      const corrected = withoutIds(history.present);
      // Cutting the start moved every note, so the parts follow.
      const kept = history.present[0];
      const moved = ownParts && shiftParts(ownParts, piece.notes[kept.id].time - kept.time);
      await piecesApi.saveNotes(piece.id, corrected, moved ?? undefined);
      setOwnParts(moved);
      stopEditing();
      onNotesSaved(corrected);
    } catch (e) {
      setEditError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Editor shortcuts, caught before the player's own (Escape).
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (leavingRef.current || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') setHistory((h) => h && (e.shiftKey ? redo(h) : undo(h)));
      else if (mod && key === 'y') setHistory((h) => h && redo(h));
      else if (mod) return;
      else if (e.key === 'Delete' || e.key === 'Backspace') apply(removeNotes);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') apply((n, ids) => transpose(n, ids, (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 12 : 1)));
      else if (e.code === 'KeyH') apply(switchHand);
      else if (e.key === 'Escape') setSelected(new Set());
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [editing]);

  // Shuffled listening: starts by itself, then goes to the next piece.
  const auto = !!listening;
  const listeningRef = useRef(listening);
  listeningRef.current = listening;
  useEffect(() => {
    if (auto && !player.state.get().playing) void player.play();
  }, [auto, player]);
  useEffect(() => {
    if (state.finished && !editing) listeningRef.current?.next();
  }, [state.finished, editing]);

  // Notes picked and still there (a deleted note is not "selected").
  const selectedCount = history ? history.present.filter((n) => selected.has(n.id)).length : 0;

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

  const current = partAt(shownParts, player.position);
  const part = shownParts[current];
  const column = part ? Math.floor(((grid?.toBeats(player.position) ?? 0) - part.beat) * part.division + 0.3) : 0;
  const stickers = useMemo(() => {
    const out = new Map<number, Sticker[]>();
    for (const k of part?.keys ?? []) out.set(k.midi, [...(out.get(k.midi) ?? []), k]);
    return out;
  }, [part]);

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

  // Waiting for notes played on the screen: keys as wide as a finger, on a
  // keyboard that follows the notes.
  const [bigKeys, setBigKeys] = useState(true);
  const fingers = touch && mode === 'wait' && bigKeys;
  const whites = useMemo(() => {
    let n = 0;
    for (let m = from; m <= to; m++) if (!isBlack(m)) n++;
    return n;
  }, [from, to]);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!fingers || !el) return;
    const left = state.expected.map((n) => n.midi).filter((m) => !state.played.includes(m));
    const coming = player.notes.find((n) => n.time > player.position + 0.05);
    const target = scrollToKeys(left.length ? left : coming ? [coming.midi] : [], from, to, el);
    if (target !== null) el.scrollTo({ left: target, behavior: 'smooth' });
  }, [fingers, state.expected, state.played, from, to, player]);
  const named = fingers || !compact || window.innerWidth / whites >= NAMED_KEY;
  const keyboardHeight = !compact ? 'clamp(140px, 24dvh, 320px)' : fingers ? 'clamp(110px, 26dvh, 260px)' : 'clamp(80px, 17dvh, 200px)';

  const pickMode = (m: PlayMode) => {
    setMode(m);
    player.setMode(m);
  };
  const pickRate = (r: number) => {
    setRate(r);
    player.rate = r;
  };
  // Other notes, other sections: a running loop would no longer fit.
  const pickLevel = (next: PieceLevel) => {
    applyLoop(null);
    setLevel(next);
    void piecesApi.update(piece.id, { level: next }).catch(() => {});
  };
  const pickTracks = (next: boolean[]) => {
    applyLoop(null);
    setSelected(new Set());
    setEnabled(next);
    void piecesApi.update(piece.id, { tracks_enabled: next }).catch(() => {});
  };
  const toggleNumbers = (on: boolean) => {
    setNumbersOn(on);
    writeJson(NUMBERS_KEY, { on });
  };
  const saveParts = (next: PieceSection[] | null) => {
    applyLoop(null);
    setOwnParts(next);
    setPartsError('');
    piecesApi.update(piece.id, { sections: next }).catch((e: Error) => setPartsError(`Parties non enregistrées : ${e.message}`));
  };
  const beatTime = (beat: number) => grid?.toTime(beat) ?? 0;
  const changeParts = (change: (parts: PieceSection[]) => PieceSection[]) => {
    const before = toSaved(sections);
    const after = change(before);
    if (after !== before) saveParts(after);
  };

  // --- Toolbar parts ----------------------------------------------------------------
  const heading = (
    <div className="flex min-w-0 items-center gap-2.5" title={[piece.title, piece.artist, piece.description].filter(Boolean).join(' — ')}>
      {!short && <Cover key={piece.cover} src={piece.cover} size="sm" />}
      <div className="min-w-0 leading-tight">
        <div className="truncate font-semibold text-neutral-900">{piece.title}</div>
        {(piece.artist || piece.description) && (
          <div className="truncate text-xs text-neutral-500">
            {piece.artist}
            {piece.description && <span className="text-neutral-400">{piece.artist ? ' · ' : ''}{piece.description}</span>}
          </div>
        )}
      </div>
    </div>
  );
  const shuffleButton = (size: ControlSize) => listening && (
    <ControlButton active pressed size={size} title="Lecture aléatoire en boucle : cliquer pour rester sur ce morceau" onClick={listening.stop}>
      <ShuffleIcon className={controlIcon(size)} />
    </ControlButton>
  );
  const transport = (size: ControlSize) => (
    <>
      {listening && <SkipButton size={size} title="Morceau précédent" flip onClick={() => (player.position > RESTART_AFTER ? seek(0) : listening.previous())} />}
      <PlayButton size={size} playing={state.playing} onClick={() => player.toggle()} />
      {listening && <SkipButton size={size} title="Morceau suivant" onClick={listening.next} />}
    </>
  );
  const loopButton = (size: ControlSize) => sections.length > 0 && (
    <ControlButton
      active={!!loop}
      pressed={!!loop}
      size={size}
      title={loop ? 'Arrêter la boucle (Échap)' : 'Répéter la partie en cours\nAstuce : double-clic sur une partie pour la boucler, Maj+clic pour étendre la boucle'}
      onClick={() => (loop ? applyLoop(null) : applyLoop([sectionAt(player.position), sectionAt(player.position)]))}
    >
      <RepeatIcon className={controlIcon(size)} />
    </ControlButton>
  );
  const optionsButton = (size: ControlSize) => (
    <ControlButton title="Réglages du morceau" size={size} onClick={() => setOptions(true)}>
      <SlidersIcon className={controlIcon(size)} />
    </ControlButton>
  );
  const timeline = (
    <Timeline
      sections={sections}
      duration={player.duration}
      position={player.position}
      loop={loop}
      onSeek={seek}
      onLoop={(i, extend) => applyLoop(extend && loop ? [Math.min(loop[0], i), Math.max(loop[1], i)] : [i, i])}
      sectionAt={sectionAt}
    />
  );
  const time = <span className="w-[5.5rem] shrink-0 text-xs tabular-nums text-neutral-400">{clock(player.position)} / {clock(player.duration)}</span>;

  // Left and right padding of the top bars: room for the page's "back" and
  // "Morceaux" buttons, drawn over them.
  return (
    <div className="flex h-full flex-col">
      {short ? (
        <div className="flex h-14 shrink-0 items-center gap-2 px-14 text-sm text-neutral-600">
          <div className="w-28 shrink-0 md:w-44">{heading}</div>
          {transport('md')}
          {timeline}
          {time}
          {loopButton('md')}
          {shuffleButton('md')}
          {optionsButton('md')}
        </div>
      ) : compact ? (
        <div className="flex h-15 shrink-0 items-center pl-15 pr-15 text-sm md:h-18 md:pl-18 md:pr-44">{heading}</div>
      ) : (
        <div className="flex items-center gap-4 py-3 pl-16 pr-44 text-sm text-neutral-600">
          <div className="w-48 shrink-0">{heading}</div>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            {shuffleButton('md')}
            {transport('md')}
            {loopButton('md')}
            {timeline}
            {time}
            {!editing && (
              <button
                type="button"
                onClick={() => toggleNumbers(!numbersOn)}
                aria-pressed={numbersOn}
                title={numbersOn ? 'Cacher les chiffres' : 'Voir le morceau en chiffres'}
                className={`h-8 shrink-0 rounded-lg px-2 text-xs font-bold tabular-nums transition-colors ${numbersOn ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
              >
                123
              </button>
            )}
            {bothHands && !editing && <HandButtons value={hand} onChange={setHand} />}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {piece.tracks && piece.tracks.length > 1 && (
              <TracksMenu tracks={piece.tracks} notes={piece.notes} enabled={enabled} onChange={pickTracks} />
            )}
            {!editing && (
              <>
                <button
                  type="button"
                  onClick={score ? onEditNumbers : startEditing}
                  title={score ? 'Modifier le morceau, en chiffres' : 'Corriger les notes : supprimer, transposer, changer de main, couper le début ou la fin'}
                  className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <PencilIcon className="h-4 w-4" />{score ? 'Modifier' : 'Corriger'}
                </button>
                <select
                  value={level}
                  onChange={(e) => pickLevel(e.target.value as PieceLevel)}
                  title="Niveau : le morceau complet, la mélodie sur la basse, ou la mélodie seule"
                  className="rounded-lg border border-neutral-200 bg-white py-1.5 pl-2 pr-1 text-sm text-neutral-700 hover:border-neutral-300 focus:outline-none"
                >
                  <option value="original">Original</option>
                  <option value="simplified">Simplifié</option>
                  <option value="melody">Mélodie seule</option>
                </select>
                <Segmented<PlayMode>
                  value={mode}
                  onChange={pickMode}
                  options={[{ value: 'listen', label: 'Écouter' }, { value: 'wait', label: 'Attente' }]}
                />
              </>
            )}
            <select
              value={rate}
              onChange={(e) => pickRate(Number(e.target.value))}
              title="Vitesse"
              className="rounded-lg border border-neutral-200 bg-white py-1.5 pl-2 pr-1 text-sm text-neutral-700 hover:border-neutral-300 focus:outline-none"
            >
              {RATES.map((r) => <option key={r} value={r}>{Math.round(r * 100)} %</option>)}
            </select>
          </div>
        </div>
      )}

      {compact && options && (
        <PieceOptions
          mode={editing ? null : mode}
          level={level}
          rate={rate}
          hand={bothHands && !editing ? hand : null}
          numbered={editing ? null : numbersOn}
          tracks={piece.tracks ?? []}
          notes={piece.notes}
          enabled={enabled}
          bigKeys={touch ? bigKeys : null}
          onMode={pickMode}
          onLevel={pickLevel}
          onRate={pickRate}
          onHand={setHand}
          onNumbered={toggleNumbers}
          onTracks={pickTracks}
          onBigKeys={setBigKeys}
          onEdit={editing || phone || score ? undefined : startEditing}
          onEditNumbers={editing ? undefined : onEditNumbers}
          onClose={() => setOptions(false)}
        />
      )}

      {history && (
        <EditBar
          count={selectedCount}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          saving={saving}
          touch={touch}
          error={editError}
          onRemove={() => apply(removeNotes)}
          onTranspose={(by) => apply((n, ids) => transpose(n, ids, by))}
          onHand={() => apply(switchHand)}
          onCutBefore={() => apply((n) => cutBefore(n, player.position))}
          onCutAfter={() => apply((n) => cutAfter(n, player.position))}
          onUndo={() => setHistory((h) => h && undo(h))}
          onRedo={() => setHistory((h) => h && redo(h))}
          onCancel={() => (history.past.length ? setLeaving(true) : stopEditing())}
          onSave={() => void saveEdits()}
        />
      )}
      {leaving && (
        <ConfirmModal
          title="Abandonner les corrections ?"
          message="Les changements faits depuis « Corriger » seront perdus."
          confirmLabel="Abandonner"
          danger
          onConfirm={stopEditing}
          onClose={() => setLeaving(false)}
        />
      )}

      {mode === 'wait' && state.expected.length > 0 && (
        <div className="pb-2 text-center text-xs text-neutral-500">Joue {state.expected.length > 1 ? 'les notes en surbrillance' : 'la note en surbrillance'} pour continuer</div>
      )}
      {state.finished && !listening && <div className="pb-2 text-center text-sm font-medium text-emerald-700">{touch ? 'Terminé !' : 'Terminé ! Espace pour rejouer.'}</div>}

      {numbered && part && (
        <Numbers
          title={piece.title}
          parts={shownParts}
          part={current}
          column={column}
          position={player.position}
          loop={loop}
          big={big}
          compact={compact}
          short={short}
          onEdit={onEditNumbers}
          editing={score ? null : {
            onCut: (i, beat) => changeParts((p) => cutAt(p, beatTime(shownParts[i].beat + beat))),
            onMove: (i, by) => changeParts((p) => moveStart(p, i, beatTime(shownParts[i].beat + by))),
            onJoin: (i) => changeParts((p) => joinPrevious(p, i)),
            onRename: (i, label) => changeParts((p) => rename(p, i, label)),
            onReset: ownParts ? () => saveParts(null) : null,
            error: partsError,
          }}
          onSeek={seek}
          onLoop={(i) => applyLoop(i === null ? null : [i, i])}
          onBig={setBigNumbers}
        />
      )}

      <div ref={scroller} className={`${big ? 'shrink-0' : 'min-h-0 flex-1'} overflow-x-auto overflow-y-hidden overscroll-contain border-t border-neutral-200 bg-white`}>
        <div className="flex h-full flex-col" style={{ minWidth: fingers ? whites * FINGER_KEY : undefined }}>
          {!big && <div className="relative min-h-0 flex-1 px-2 sm:px-4">
            <FallingNotes
              player={player}
              from={from}
              to={to}
              numbers={numbered?.numbers}
              parts={numbered ? sections : undefined}
              edit={editing ? {
                selected,
                onPick: (ids, add) => setSelected((prev) => {
                  if (!add) return new Set(ids);
                  const next = new Set(prev);
                  // Shift+click toggles one note; Shift+box adds them all.
                  if (ids.length === 1 && next.has(ids[0])) next.delete(ids[0]);
                  else ids.forEach((id) => next.add(id));
                  return next;
                }),
                onScroll: () => setFrame((f) => f + 1),
              } : undefined}
            />
          </div>}
          <div className={`px-2 sm:px-4 ${big ? 'pt-2' : ''} ${compact && !short ? '' : 'pb-3'}`}>
            <PianoKeyboard from={from} to={to} labels={named ? labels : 'none'} marks={marks} stickers={numbered ? stickers : undefined} height={keyboardHeight} />
          </div>
        </div>
      </div>

      {compact && !short && (
        <div className="shrink-0 border-t border-neutral-200 bg-white px-3 pb-3 pt-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="w-9 shrink-0 text-xs tabular-nums text-neutral-500">{clock(player.position)}</span>
            {timeline}
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-neutral-400">{clock(player.duration)}</span>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center">
            <div className="flex">{optionsButton('lg')}</div>
            <div className="flex items-center gap-2 sm:gap-4">{transport('lg')}</div>
            <div className="flex justify-end">
              {loopButton('lg')}
              {shuffleButton('lg')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Left, right: each hand on or off, at least one on.
function HandButtons({ value, onChange }: { value: HandChoice; onChange(hand: HandChoice): void }) {
  return (
    <div className="flex shrink-0 gap-0.5">
      {HANDS.map((h) => {
        const other: Hand = h === 'left' ? 'right' : 'left';
        const on = value === 'both' || value === h;
        const title = `Main ${handName(h).toLowerCase()} : ${on ? 'la retirer' : 'la remettre'}`;
        return (
          <button
            key={h}
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={on}
            onClick={() => onChange(value === 'both' ? other : 'both')}
            className={`h-8 w-7 rounded-lg text-xs font-bold transition-colors ${
              !on ? 'text-neutral-300 hover:bg-neutral-100' : h === 'left' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
            }`}
          >
            {h === 'left' ? 'G' : 'D'}
          </button>
        );
      })}
    </div>
  );
}

// The editor's toolbar, under the player's bar.
function EditBar({ count, canUndo, canRedo, saving, touch, error, onRemove, onTranspose, onHand, onCutBefore, onCutAfter, onUndo, onRedo, onCancel, onSave }: {
  count: number;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  touch: boolean;
  error: string;
  onRemove(): void;
  onTranspose(by: number): void;
  onHand(): void;
  onCutBefore(): void;
  onCutAfter(): void;
  onUndo(): void;
  onRedo(): void;
  onCancel(): void;
  onSave(): void;
}) {
  const none = count === 0;
  const tool = 'flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-white hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-35';
  return (
    <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 md:px-16">
      <div className="flex flex-wrap items-center justify-center gap-1">
        <span className="mr-2 text-xs font-semibold text-amber-900">
          Correction · {none ? 'aucune note choisie' : `${count} note${count > 1 ? 's' : ''} choisie${count > 1 ? 's' : ''}`}
        </span>
        <button type="button" className={tool} disabled={none} onClick={onRemove} title="Supprimer (Suppr)">Supprimer</button>
        <button type="button" className={tool} disabled={none} onClick={() => onTranspose(-1)} title="Un demi-ton plus bas (↓) · une octave : Maj+↓">↓ ½ ton</button>
        <button type="button" className={tool} disabled={none} onClick={() => onTranspose(1)} title="Un demi-ton plus haut (↑) · une octave : Maj+↑">↑ ½ ton</button>
        <button type="button" className={tool} disabled={none} onClick={onHand} title="Changer de main (H)">Main G/D</button>
        <span className="mx-1 h-5 w-px bg-amber-200" />
        <button type="button" className={tool} onClick={onCutBefore} title="Supprimer tout ce qui commence avant la position actuelle">Couper avant</button>
        <button type="button" className={tool} onClick={onCutAfter} title="Supprimer tout ce qui commence après la position actuelle">Couper après</button>
        <span className="mx-1 h-5 w-px bg-amber-200" />
        <button type="button" className={tool} disabled={!canUndo} onClick={onUndo} title="Annuler (Ctrl+Z)">↶</button>
        <button type="button" className={tool} disabled={!canRedo} onClick={onRedo} title="Rétablir (Ctrl+Maj+Z)">↷</button>
        <span className="mx-1 h-5 w-px bg-amber-200" />
        <button type="button" onClick={onCancel} className="h-8 rounded-lg px-3 text-xs font-medium text-neutral-600 hover:bg-white hover:text-neutral-900">Annuler</button>
        <button type="button" onClick={onSave} disabled={saving} className="h-8 rounded-lg bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
      <p className="mt-1 text-center text-[11px] text-amber-800/80">
        {error || (touch ? 'Touche une note pour la choisir, ou glisse pour choisir une zone. Avance avec la barre de lecture.' : 'Clic : choisir une note · Maj+clic : en ajouter · glisser : choisir une zone · molette : avancer / reculer · Suppr · ↑ ↓ (Maj : octave) · H : main')}
      </p>
    </div>
  );
}
