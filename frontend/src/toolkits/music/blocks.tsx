import { parseNote, parseRange } from '@learn/shared';
import { useState } from 'react';
import type { BlockProps } from '../../components/blocks';
import { playNotes } from './audio';
import { PianoKeyboard, type KeyLabels, type KeyMark } from './PianoKeyboard';

// ```keyboard              ```play
// range: C3-C5             notes: C4 E4 G4
// highlight: C4 E4         mode: chord | melody
// labels: names            label: Écouter
// ```                      ```

function parseNotes(list: string | undefined): number[] {
  return (list ?? '').split(/[\s,]+/).map((n) => parseNote(n)).filter((n): n is number => n !== undefined);
}

export function KeyboardBlock({ params }: BlockProps) {
  const highlight = parseNotes(params.highlight);
  let range = params.range ? parseRange(params.range) : undefined;
  if (!range) {
    const lo = highlight.length ? Math.min(...highlight) : 60;
    const hi = highlight.length ? Math.max(...highlight) : 71;
    const start = Math.floor(lo / 12) * 12;
    range = [start, Math.max(start + 11, Math.ceil((hi + 1) / 12) * 12 - 1)];
  }
  const marks = new Map<number, KeyMark>(highlight.map((m) => [m, 'target']));
  return (
    <div className="my-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <PianoKeyboard from={range[0]} to={range[1]} marks={marks} labels={(params.labels as KeyLabels) ?? 'none'} height={Number(params.height) || 130} />
    </div>
  );
}

export function PlayBlock({ params }: BlockProps) {
  const [playing, setPlaying] = useState(false);
  const notes = parseNotes(params.notes);
  const mode = params.mode === 'chord' ? 'chord' : 'melody';
  return (
    <button
      type="button"
      disabled={playing || notes.length === 0}
      onClick={async () => {
        setPlaying(true);
        try {
          await playNotes(notes, mode, Number(params.beat) || 0.5);
        } finally {
          setPlaying(false);
        }
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
    >
      <span aria-hidden>{playing ? '♪' : '▶'}</span>
      {params.label || 'Écouter'}
    </button>
  );
}
