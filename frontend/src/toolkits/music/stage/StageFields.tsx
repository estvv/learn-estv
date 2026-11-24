import type { PieceNote } from '@learn/shared';
import { useMemo, useRef, type CSSProperties } from 'react';
import { Field } from '../../../components/Field';
import { Segmented } from '../../../components/Segmented';
import { Toggle } from '../../../components/settings';
import { useObservable } from '../../../lib/store';
import { FallingNotes, type NoteSource } from '../pieces/FallingNotes';
import { PianoKeyboard } from '../PianoKeyboard';
import { MOODS } from './colors';
import { MOOD_IDS, MOOD_NAMES, setStage, stage, STYLE_IDS, STYLE_NAMES, type Effects, type MoodId, type StyleId } from './settings';

// What each looks like, on a button.
const SWATCHES: Record<StyleId, CSSProperties> = {
  classic: { background: 'linear-gradient(90deg, var(--color-hand-l-pale) 50%, var(--color-hand-r-pale) 50%)' },
  glow: { background: 'linear-gradient(#7d9bff, #cfdcff)', boxShadow: '0 0 14px #6f8dffaa' },
  glass: { background: '#7d9bff3d', border: '1.5px solid #a9bdff', boxShadow: '0 0 10px #6f8dff66' },
  outline: { border: '2px solid #8ea6ff', boxShadow: '0 0 12px #6f8dffaa, inset 0 0 6px #6f8dff66' },
  comet: { background: 'linear-gradient(transparent, #7d9bff 60%, #ffffff)', borderRadius: 99, boxShadow: '0 6px 12px -2px #8ea6ffcc' },
};
const MOOD_SWATCH: Record<MoodId, string> = {
  hands: 'linear-gradient(90deg, var(--color-hand-l) 50%, var(--color-hand-r) 50%)',
  rainbow: 'linear-gradient(90deg, #ff4d4d, #ffd24d, #4dff88, #4dc3ff, #a64dff)',
  ...(Object.fromEntries(Object.entries(MOODS).map(([id, [far, near]]) => [id, `linear-gradient(${far}, ${near})`])) as Record<keyof typeof MOODS, string>),
};

export function StageFields() {
  const s = useObservable(stage);
  const plain = s.style === 'classic';
  return (
    <div className="space-y-4">
      <Field label="Style des notes" hint={plain ? undefined : 'Se joue dans le noir, avec les couleurs de nuit.'}>
        <div className="grid grid-cols-3 gap-2">
          {STYLE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setStage({ style: id })}
              aria-pressed={s.style === id}
              className={`overflow-hidden rounded-lg border text-center text-xs font-medium transition-colors ${s.style === id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'}`}
            >
              <span className={`flex h-11 items-center justify-center ${id === 'classic' ? '' : 'bg-black'}`}>
                {id === 'classic' ? <span className="h-full w-full" style={SWATCHES.classic} /> : <span className="h-7 w-3.5 rounded" style={SWATCHES[id]} />}
              </span>
              <span className="block py-1.5">{STYLE_NAMES[id]}</span>
            </button>
          ))}
        </div>
      </Field>
      {!plain && (
        <>
          <Field label="Couleurs">
            <div className="grid grid-cols-4 gap-2">
              {MOOD_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStage({ mood: id })}
                  aria-pressed={s.mood === id}
                  className={`overflow-hidden rounded-lg border text-center text-[11px] font-medium transition-colors ${s.mood === id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'}`}
                >
                  <span className="block h-5" style={{ background: MOOD_SWATCH[id] }} />
                  <span className="block truncate px-0.5 py-1">{MOOD_NAMES[id]}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Particules">
            <Segmented<Effects> full value={s.effects} onChange={(effects) => setStage({ effects })} options={[{ value: 'off', label: 'Aucune' }, { value: 'soft', label: 'Douces' }, { value: 'max', label: 'Max' }]} />
          </Field>
          <div className="space-y-2">
            <Toggle checked={s.led} onChange={(led) => setStage({ led })} label="Ligne de LED au-dessus du clavier" />
            <Toggle checked={s.keys} onChange={(keys) => setStage({ keys })} label="Les notes éclairent les touches" />
          </div>
        </>
      )}
    </div>
  );
}

// A tune over and over, without a sound.
const LOOP = 8; // seconds
const TUNE: PieceNote[] = [
  ...[0, 2, 4, 6].flatMap((time, i) => [[48, 52], [45, 55], [53, 57], [50, 55]][i].map((midi) => ({ midi, time, duration: 1.7, velocity: 0.7, hand: 'left' as const }))),
  ...[72, 76, 79, 76, 74, 77, 81, 77, 72, 74, 76, 79, 83, 79, 77, 74].map((midi, i) => ({ midi, time: i * 0.5, duration: i % 3 ? 0.3 : 0.45, velocity: 0.7, hand: 'right' as const })),
].sort((a, b) => a.time - b.time);

export function StagePreview() {
  const s = useObservable(stage);
  const keys = useRef<HTMLCanvasElement>(null);
  const source = useMemo((): NoteSource => {
    // Twice, so that the second time is seen coming during the first.
    const notes = [...TUNE, ...TUNE.map((n) => ({ ...n, time: n.time + LOOP }))];
    const start = performance.now();
    const state = { expected: [], playing: true };
    return { notes, rate: 1, state: { get: () => state }, get position() { return ((performance.now() - start) / 1000) % LOOP; } };
  }, []);
  return (
    <div className={`overflow-hidden rounded-lg border border-neutral-200 ${s.style === 'classic' ? 'bg-white' : 'bg-black'}`} aria-hidden>
      <div className="h-56"><FallingNotes player={source} from={48} to={83} keyLight={keys} /></div>
      <div className="pointer-events-none relative">
        <PianoKeyboard from={48} to={83} interactive={false} height={84} />
        <KeyLight canvas={keys} />
      </div>
    </div>
  );
}

// Over the keys: see Scene.drawKeys.
export function KeyLight({ canvas }: { canvas: React.RefObject<HTMLCanvasElement | null> }) {
  const { style, keys } = useObservable(stage);
  if (style === 'classic' || !keys) return null;
  return <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full mix-blend-multiply" />;
}
