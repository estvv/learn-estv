import type { Hand, PieceNote } from '@learn/shared';
import { Observable } from '../../../lib/store';
import { ensureAudio, playNote, releaseAll } from '../audio';
import { inputBus, type NoteEvent } from '../input/bus';

export type PlayMode = 'listen' | 'wait';

// Notes starting within this window are played together (a chord).
const CHORD_WINDOW = 0.04;

interface Group {
  time: number;
  notes: PieceNote[];
}

export interface PlayerState {
  playing: boolean;
  // Wait mode: the notes the player must play before the piece goes on.
  expected: { midi: number; hand: Hand | null }[];
  // Notes of the expected chord already played.
  played: number[];
  // Last wrong note, cleared shortly after.
  wrong: number | null;
  finished: boolean;
}

// Plays a piece in sync with the screen. `position` is read every animation
// frame (falling notes) so it lives outside React; coarse state is observable.
export class PiecePlayer {
  readonly notes: PieceNote[];
  readonly duration: number;
  readonly state = new Observable<PlayerState>({ playing: false, expected: [], played: [], wrong: null, finished: false });
  position = 0;
  rate = 1;
  mode: PlayMode = 'listen';

  private groups: Group[];
  private nextNote = 0; // listen mode: index of the next note to sound
  private nextGroup = 0; // wait mode: index of the next chord to wait for
  private waiting = false;
  private raf = 0;
  private lastFrame = 0;
  private wrongTimer: ReturnType<typeof setTimeout> | undefined;
  private unsubscribe: () => void;

  constructor(notes: PieceNote[]) {
    this.notes = [...notes].sort((a, b) => a.time - b.time);
    this.duration = this.notes.reduce((end, n) => Math.max(end, n.time + n.duration), 0);
    this.groups = [];
    for (const n of this.notes) {
      const last = this.groups[this.groups.length - 1];
      if (last && n.time - last.time <= CHORD_WINDOW) last.notes.push(n);
      else this.groups.push({ time: n.time, notes: [n] });
    }
    this.unsubscribe = inputBus.subscribe((e) => this.onInput(e));
  }

  dispose() {
    this.pause();
    this.unsubscribe();
    clearTimeout(this.wrongTimer);
  }

  async play() {
    await ensureAudio().catch(() => {});
    if (this.state.get().finished) this.seek(0);
    this.lastFrame = performance.now();
    this.state.set((s) => ({ ...s, playing: true }));
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.tick);
  }

  pause() {
    cancelAnimationFrame(this.raf);
    releaseAll();
    this.state.set((s) => ({ ...s, playing: false }));
  }

  toggle() {
    if (this.state.get().playing) this.pause();
    else void this.play();
  }

  seek(seconds: number) {
    releaseAll();
    this.position = Math.max(0, Math.min(this.duration, seconds));
    this.nextNote = this.notes.findIndex((n) => n.time >= this.position);
    if (this.nextNote < 0) this.nextNote = this.notes.length;
    this.nextGroup = this.groups.findIndex((g) => g.time >= this.position - 1e-6);
    if (this.nextGroup < 0) this.nextGroup = this.groups.length;
    this.waiting = false;
    this.state.set((s) => ({ ...s, expected: [], played: [], finished: false }));
  }

  setMode(mode: PlayMode) {
    this.mode = mode;
    this.seek(this.position);
  }

  // Notes sounding at the current position (listen mode highlight).
  sounding(): PieceNote[] {
    const out: PieceNote[] = [];
    for (let i = Math.max(0, this.nextNote - 64); i < this.nextNote && i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.time <= this.position && n.time + n.duration > this.position) out.push(n);
    }
    return out;
  }

  private tick = (now: number) => {
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (!this.waiting) {
      const next = this.position + dt * this.rate;
      if (this.mode === 'wait') this.advanceWaiting(next);
      else this.advanceListening(next);
    }
    if (this.position >= this.duration + 0.5) {
      this.pause();
      this.state.set((s) => ({ ...s, finished: true }));
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private advanceListening(next: number) {
    while (this.nextNote < this.notes.length && this.notes[this.nextNote].time < next) {
      const n = this.notes[this.nextNote++];
      playNote(n.midi, n.duration / this.rate, n.velocity);
    }
    this.position = next;
  }

  private advanceWaiting(next: number) {
    const group = this.groups[this.nextGroup];
    if (group && group.time <= next) {
      // Stop on the chord until the player plays it.
      this.position = group.time;
      this.waiting = true;
      this.state.set((s) => ({ ...s, expected: unique(group.notes), played: [] }));
      return;
    }
    this.position = next;
  }

  private onInput(e: NoteEvent) {
    if (e.type !== 'on' || this.mode !== 'wait' || !this.waiting) return;
    const { expected, played } = this.state.get();
    if (!expected.some((n) => n.midi === e.midi)) {
      clearTimeout(this.wrongTimer);
      this.state.set((s) => ({ ...s, wrong: e.midi }));
      this.wrongTimer = setTimeout(() => this.state.set((s) => ({ ...s, wrong: null })), 400);
      return;
    }
    const nowPlayed = played.includes(e.midi) ? played : [...played, e.midi];
    if (nowPlayed.length >= expected.length) {
      // Chord complete: go on.
      this.nextGroup++;
      this.waiting = false;
      this.state.set((s) => ({ ...s, expected: [], played: [] }));
    } else {
      this.state.set((s) => ({ ...s, played: nowPlayed }));
    }
  }
}

function unique(notes: PieceNote[]): { midi: number; hand: Hand | null }[] {
  const seen = new Map<number, Hand | null>();
  for (const n of notes) if (!seen.has(n.midi)) seen.set(n.midi, n.hand);
  return [...seen].map(([midi, hand]) => ({ midi, hand }));
}

// Keyboard range that fits the piece, whole octaves, at least two.
export function pieceRange(notes: PieceNote[]): [number, number] {
  let lo = 127;
  let hi = 0;
  for (const n of notes) {
    lo = Math.min(lo, n.midi);
    hi = Math.max(hi, n.midi);
  }
  let from = Math.max(21, Math.floor(lo / 12) * 12);
  let to = Math.min(108, Math.ceil((hi + 1) / 12) * 12 - 1);
  while (to - from < 23) {
    if (from > 21) from -= 12;
    else to += 12;
  }
  return [Math.max(21, from), Math.min(108, to)];
}
