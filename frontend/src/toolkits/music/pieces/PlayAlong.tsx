import { pieceDuration, type PieceNote, type PieceTrack } from '@learn/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PencilIcon, RepeatIcon } from '../../../components/icons';
import { ConfirmModal } from '../../../components/Modal';
import { Segmented } from '../../../components/Segmented';
import { useObservable } from '../../../lib/store';
import { useNoteInput } from '../input/hooks';
import { PianoKeyboard, type KeyLabels, type KeyMark } from '../PianoKeyboard';
import { piecesApi } from './api';
import {
  commit, cutAfter, cutBefore, redo, removeNotes, startHistory, switchHand, transpose, undo, withIds, withoutIds,
  type EditNote, type History,
} from './edit';
import { FallingNotes } from './FallingNotes';
import { PiecePlayer, pieceRange, type PlayMode } from './player';
import { Cover } from './pieceFields';
import { detectSections, type Section } from './sections';
import type { StoredPiece } from './types';

const RATES = [0.5, 0.75, 1, 1.25];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// A piece with falling notes above the keyboard: listen to it, or let it wait
// for the right notes. "Corriger" turns the notes into an editor for small
// fixes (see edit.ts).
export function PlayAlong({ piece, labels, keyboardHeight, onNotesSaved }: {
  piece: StoredPiece;
  labels: KeyLabels;
  keyboardHeight: number;
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
  const notes = useMemo(
    () => (piece.tracks ? source.filter((n) => n.track === undefined || enabled[n.track]) : source),
    [source, piece.tracks, enabled],
  );
  const duration = useMemo(() => pieceDuration(source), [source]);
  const player = useMemo(() => new PiecePlayer(piece.notes, pieceDuration(piece.notes)), [piece.notes]);
  useEffect(() => () => player.dispose(), [player]);
  useEffect(() => player.setNotes(notes, duration), [player, notes, duration]);
  const state = useObservable(player.state);
  const [mode, setMode] = useState<PlayMode>('listen');
  const [rate, setRate] = useState(1);
  const [, setFrame] = useState(0);
  // The keyboard keeps the original range while editing (no jumping when a note moves).
  const [from, to] = useMemo(() => pieceRange(notes.length && !history ? notes : piece.notes), [notes, piece.notes, history]);
  // View 1: a plain timeline. View 2: the timeline cut into sections (A B A
  // C…) that can be looped; they are only worked out when asked for.
  const [byParts, setByParts] = useState(false);
  const sections = useMemo(() => (byParts ? detectSections(notes, piece.bpm) : []), [byParts, notes, piece.bpm]);
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
      await piecesApi.saveNotes(piece.id, corrected);
      stopEditing();
      onNotesSaved(corrected);
    } catch (e) {
      setEditError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Editor shortcuts. Caught before the computer-keyboard piano (capture
  // phase) so that H or the arrows do not also play a note.
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
          <button
            type="button"
            onClick={() => {
              if (byParts) applyLoop(null);
              setByParts(!byParts);
            }}
            aria-pressed={byParts}
            title={byParts ? 'Vue simple (timeline)' : 'Vue en parties : découper le morceau pour en boucler une partie'}
            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors ${byParts ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" className="h-4 w-4" aria-hidden>
              <rect x="2.5" y="8" width="5" height="8" rx="1" /><rect x="9.5" y="8" width="5" height="8" rx="1" /><rect x="16.5" y="8" width="5" height="8" rx="1" />
            </svg>
            Parties
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {piece.tracks && piece.tracks.length > 1 && (
            <TracksMenu
              tracks={piece.tracks}
              notes={piece.notes}
              enabled={enabled}
              onChange={(next) => {
                // Other notes, other sections: a running loop would no longer fit.
                applyLoop(null);
                setSelected(new Set());
                setEnabled(next);
                void piecesApi.update(piece.id, { tracks_enabled: next }).catch(() => {});
              }}
            />
          )}
          {!editing && (
            <>
              <button
                type="button"
                onClick={startEditing}
                title="Corriger les notes : supprimer, transposer, changer de main, couper le début ou la fin"
                className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <PencilIcon className="h-4 w-4" />Corriger
              </button>
              <Segmented<PlayMode>
                value={mode}
                onChange={(m) => { setMode(m); player.setMode(m); }}
                options={[{ value: 'listen', label: 'Écouter' }, { value: 'wait', label: 'Attente' }]}
              />
            </>
          )}
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

      {history && (
        <EditBar
          count={selectedCount}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          saving={saving}
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
      {state.finished && <div className="pb-2 text-center text-sm font-medium text-emerald-700">Terminé ! Espace pour rejouer.</div>}

      <div className="relative min-h-0 flex-1 border-t border-neutral-200 bg-white px-2 sm:px-4">
        <FallingNotes
          player={player}
          from={from}
          to={to}
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

// The instruments of a multi-track file, each one on or off (at least one on).
function TracksMenu({ tracks, notes, enabled, onChange }: {
  tracks: PieceTrack[];
  notes: { track?: number }[];
  enabled: boolean[];
  onChange(enabled: boolean[]): void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const counts = useMemo(() => {
    const c = tracks.map(() => 0);
    for (const n of notes) if (n.track !== undefined && n.track < c.length) c[n.track]++;
    return c;
  }, [tracks, notes]);
  const on = enabled.filter(Boolean).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title="Instruments du morceau"
        className={`flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors ${open ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="h-4 w-4" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="1.6" fill="currentColor" /><circle cx="15" cy="12" r="1.6" fill="currentColor" /><circle cx="7" cy="18" r="1.6" fill="currentColor" />
        </svg>
        Pistes <span className="tabular-nums text-neutral-400">{on}/{tracks.length}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">
          {tracks.map((t, i) => {
            const last = enabled[i] && on === 1;
            return (
              <label
                key={i}
                title={last ? 'Il faut garder au moins une piste' : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${last ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-neutral-50'}`}
              >
                <input
                  type="checkbox"
                  checked={enabled[i]}
                  disabled={last}
                  onChange={() => onChange(enabled.map((e, k) => (k === i ? !e : e)))}
                  className="h-4 w-4 accent-neutral-900"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${enabled[i] ? 'font-medium text-neutral-900' : 'text-neutral-400'}`}>{t.name}</span>
                  {t.instrument && t.instrument.toLowerCase() !== t.name.toLowerCase() && (
                    <span className="block truncate text-xs text-neutral-400">{t.instrument}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-neutral-400">{counts[i]} notes</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// The editor's toolbar, under the player's bar.
function EditBar({ count, canUndo, canRedo, saving, error, onRemove, onTranspose, onHand, onCutBefore, onCutAfter, onUndo, onRedo, onCancel, onSave }: {
  count: number;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
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
    <div className="border-t border-amber-200 bg-amber-50 px-16 py-2">
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
        {error || 'Clic : choisir une note · Maj+clic : en ajouter · glisser : choisir une zone · molette : avancer / reculer · Suppr · ↑ ↓ (Maj : octave) · H : main'}
      </p>
    </div>
  );
}
