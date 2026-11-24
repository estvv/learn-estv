import type { Hand, Score, ScorePart } from '@learn/shared';
import { freeNumber, type Part, type Step } from './numbers';
import { newLabel } from './parts';

// Writing a piece by hand (shared/src/score.ts). Every function returns a new
// score and leaves its input untouched.

export const HANDS: Hand[] = ['left', 'right'];
const BAR = 4;
export const MAX_BEATS = 256;

export const emptyScore = (): Score => ({
  bpm: 100, division: 2, parts: [{ label: 'A', beats: 2 * BAR, keys: [], notes: [] }], order: ['A'],
});

export const partOf = (score: Score, label: string): ScorePart => score.parts.find((p) => p.label === label) ?? score.parts[0];
const change = (score: Score, label: string, with_: (p: ScorePart) => ScorePart): Score =>
  ({ ...score, parts: score.parts.map((p) => (p.label === label ? with_(p) : p)) });

const numberOf = (p: ScorePart, hand: Hand, midi: number) => p.keys.find((k) => k.hand === hand && k.midi === midi)?.number;
export const midiOf = (p: ScorePart, hand: Hand, number: number) => p.keys.find((k) => k.hand === hand && k.number === number)?.midi;

// Keys played without a number yet get the next one.
function withKeys(p: ScorePart, hand: Hand, midis: number[]): ScorePart {
  const keys = [...p.keys];
  for (const midi of midis) {
    if (keys.some((k) => k.hand === hand && k.midi === midi)) continue;
    keys.push({ hand, midi, number: freeNumber(keys.filter((k) => k.hand === hand).map((k) => k.number)) });
  }
  return { ...p, keys };
}

export function cellMidis(p: ScorePart, hand: Hand, step: number): number[] {
  return p.notes.filter((n) => n.hand === hand && n.step === step).map((n) => n.midi).sort((a, b) => a - b);
}

// What one hand plays in one column; nothing: a silence.
export function setCell(score: Score, label: string, hand: Hand, step: number, midis: number[]): Score {
  const unique = [...new Set(midis)];
  return change(score, label, (p) => withKeys({
    ...p,
    notes: [...p.notes.filter((n) => n.hand !== hand || n.step !== step), ...unique.map((midi) => ({ step, midi, hand }))],
  }, hand, unique));
}

// Puts a number on a key. Notes already written with that number follow it.
export function assignKey(score: Score, label: string, hand: Hand, number: number, midi: number): Score {
  return change(score, label, (p) => {
    const old = midiOf(p, hand, number);
    const notes = old === undefined ? p.notes : p.notes.map((n) => (n.hand === hand && n.midi === old ? { ...n, midi } : n));
    // Two notes of a chord may now be the same key.
    const seen = new Set<string>();
    return {
      ...p,
      notes: notes.filter((n) => {
        const id = `${n.hand}${n.step}:${n.midi}`;
        return !seen.has(id) && !!seen.add(id);
      }),
      keys: [...p.keys.filter((k) => k.hand !== hand || (k.number !== number && k.midi !== midi)), { hand, number, midi }]
        .sort((a, b) => a.number - b.number),
    };
  });
}

// --- A run of numbers -------------------------------------------------------------

// "4-4 6-2-5-3": chords one after the other, "1+3" together. Null: not numbers.
export function parseRun(text: string): number[][] | null {
  const tokens = text.split(/[\s,;|/–—-]+/).filter(Boolean);
  const out = tokens.map((t) => t.split('+').map((n) => (/^\d{1,2}$/.test(n) ? Number(n) : NaN)));
  return out.some((c) => c.some(Number.isNaN)) ? null : out;
}

export function runText(p: ScorePart, hand: Hand): string {
  const steps = [...new Set(p.notes.filter((n) => n.hand === hand).map((n) => n.step))].sort((a, b) => a - b);
  return steps.map((s) => cellMidis(p, hand, s).map((m) => numberOf(p, hand, m) ?? '?').join('+')).join(' ');
}

export const unknownNumbers = (p: ScorePart, hand: Hand, run: number[][]): number[] =>
  [...new Set(run.flat())].filter((n) => midiOf(p, hand, n) === undefined);

// Writes a hand's run over what that hand had; the part grows if needed.
export function placeRun(score: Score, label: string, hand: Hand, run: number[][], steps: number[]): Score {
  return change(score, label, (p) => {
    const placed = run.flatMap((chord, i) => [...new Set(chord)].flatMap((number) => {
      const midi = midiOf(p, hand, number);
      return midi === undefined || steps[i] === undefined ? [] : [{ step: steps[i], midi, hand }];
    }));
    const columns = Math.max(0, ...placed.map((n) => n.step)) + 1;
    const beats = Math.min(MAX_BEATS, Math.max(p.beats, Math.ceil(columns / (BAR * score.division)) * BAR));
    return { ...p, beats, notes: [...p.notes.filter((n) => n.hand !== hand), ...placed.filter((n) => n.step < beats * score.division)] };
  });
}

// A hand earlier (-) or later (+), by columns; it never starts before the part.
export function shiftHand(score: Score, label: string, hand: Hand, by: number): Score {
  return change(score, label, (p) => {
    const own = p.notes.filter((n) => n.hand === hand).map((n) => ({ ...n, step: n.step + by }));
    if (!own.length || own.some((n) => n.step < 0)) return p;
    const columns = Math.max(...own.map((n) => n.step)) + 1;
    const beats = Math.max(p.beats, Math.ceil(columns / (BAR * score.division)) * BAR);
    return beats > MAX_BEATS ? p : { ...p, beats, notes: [...p.notes.filter((n) => n.hand !== hand), ...own] };
  });
}

// --- Tapped rhythm ---------------------------------------------------------------

const roundSteps = (gap: number, unit: number) => Math.max(1, Math.round(gap / unit));

// Columns of taps (seconds). `unit`, the length of a column, is guessed around
// the one given, or from scratch. Each gap is rounded on its own, so a tempo
// that drifts does not add up.
export function quantizeTaps(times: number[], known: number | null): { unit: number; steps: number[] } {
  const gaps = times.slice(1).map((t, i) => t - times[i]).filter((g) => g > 0);
  if (!gaps.length) return { unit: known ?? 0.3, steps: times.map((_, i) => i) };
  const shortest = [...gaps].sort((a, b) => a - b)[0];
  const [lo, hi] = known ? [known * 0.8, known * 1.25] : [Math.max(0.08, shortest * 0.3), Math.max(0.1, shortest * 1.25)];
  let unit = known ?? lo;
  let best = Infinity;
  for (let u = lo; u <= hi; u *= 1.005) {
    const error = gaps.reduce((sum, g) => sum + Math.abs(g / u - roundSteps(g, u)), 0) / gaps.length;
    // As good a fit with longer columns is simpler to read.
    const cost = error + 0.03 * Math.log2(shortest / u + 1);
    if (cost < best) {
      best = cost;
      unit = u;
    }
  }
  const steps = [0];
  for (let i = 1; i < times.length; i++) steps.push(steps[i - 1] + roundSteps(times[i] - times[i - 1], unit));
  return { unit, steps };
}

// The tempo is the taps' own as long as nothing else is written.
export function placeTaps(score: Score, label: string, hand: Hand, run: number[][], times: number[], firstStep = 0): Score {
  const free = score.parts.every((p) => p.notes.every((n) => p.label === label && n.hand === hand));
  if (!free) {
    const { steps } = quantizeTaps(times, 60 / score.bpm / score.division);
    return placeRun(score, label, hand, run, steps.map((s) => s + firstStep));
  }
  const { unit, steps } = quantizeTaps(times, null);
  let { division } = score;
  let columns = steps;
  let bpm = 60 / (unit * division);
  if (bpm > 180 && division === 2) {
    division = 4;
    bpm /= 2;
  }
  while (bpm < 55) {
    columns = columns.map((s) => s * 2);
    bpm *= 2;
  }
  const tempo = { ...score, division, bpm: Math.min(300, Math.round(bpm)) };
  return placeRun(tempo, label, hand, run, columns.map((s) => s + firstStep));
}

// --- Parts and order ----------------------------------------------------------------

const asSections = (score: Score) => score.parts.map((p, i) => ({ start: i, label: p.label }));

// A new part, empty but for the numbers of `from`, or a copy of it.
export function addPart(score: Score, from: string, copy: boolean): { score: Score; label: string } {
  const p = partOf(score, from);
  const label = newLabel(asSections(score));
  const part = { ...p, label, notes: copy ? p.notes : [] };
  return { label, score: { ...score, parts: [...score.parts, part], order: [...score.order, label] } };
}

export function removePart(score: Score, label: string): Score {
  if (score.parts.length < 2) return score;
  const parts = score.parts.filter((p) => p.label !== label);
  const order = score.order.filter((l) => l !== label);
  return { ...score, parts, order: order.length ? order : [parts[0].label] };
}

export function renamePart(score: Score, label: string, to: string): Score {
  const clean = to.trim().slice(0, 12);
  if (!clean || score.parts.some((p) => p.label === clean)) return score;
  return { ...change(score, label, (p) => ({ ...p, label: clean })), order: score.order.map((l) => (l === label ? clean : l)) };
}

export function setBeats(score: Score, label: string, beats: number): Score {
  const b = Math.max(1, Math.min(MAX_BEATS, Math.round(beats)));
  return change(score, label, (p) => ({ ...p, beats: b, notes: p.notes.filter((n) => n.step < b * score.division) }));
}

// Notes keep their place in time, or the nearest column there is.
export function setDivision(score: Score, division: Score['division']): Score {
  return {
    ...score,
    division,
    parts: score.parts.map((p) => {
      const seen = new Set<string>();
      const notes = p.notes
        .map((n) => ({ ...n, step: Math.min(p.beats * division - 1, Math.round((n.step * division) / score.division)) }))
        .filter((n) => {
          const id = `${n.hand}${n.step}:${n.midi}`;
          return !seen.has(id) && !!seen.add(id);
        });
      return { ...p, notes };
    }),
  };
}

export const addToOrder = (score: Score, label: string): Score => ({ ...score, order: [...score.order, label] });
export const removeFromOrder = (score: Score, i: number): Score =>
  (score.order.length > 1 ? { ...score, order: score.order.filter((_, k) => k !== i) } : score);
export function moveInOrder(score: Score, i: number, by: 1 | -1): Score {
  const to = i + by;
  if (to < 0 || to >= score.order.length) return score;
  const order = [...score.order];
  [order[i], order[to]] = [order[to], order[i]];
  return { ...score, order };
}

// A part as the number grid draws it, both hands even when silent. Times are
// seconds from the start of the part.
export function scoreGrid(score: Score, label: string): Part {
  const p = partOf(score, label);
  const column = 60 / score.bpm / score.division;
  const rows = HANDS.map((hand) => {
    const steps = [...new Set(p.notes.filter((n) => n.hand === hand).map((n) => n.step))].sort((a, b) => a - b);
    return {
      hand,
      steps: steps.map((step): Step => ({
        step, time: step * column, end: (step + 1) * column, notes: [],
        chords: [cellMidis(p, hand, step).map((m) => numberOf(p, hand, m) ?? 0)],
      })),
    };
  });
  return {
    label: p.label, start: 0, end: p.beats * score.division * column, division: score.division,
    columns: p.beats * score.division, beat: 0, rows, keys: p.keys,
  };
}
