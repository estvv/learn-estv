import type { PieceNote } from '@learn/shared';
import { useMemo, useRef } from 'react';
import { Field } from '../../../components/Field';
import { Segmented } from '../../../components/Segmented';
import { Toggle } from '../../../components/settings';
import { useObservable } from '../../../lib/store';
import { FallingNotes, type NoteSource } from '../pieces/FallingNotes';
import { PianoKeyboard } from '../PianoKeyboard';
import { setStage, stage, STYLE_IDS, STYLE_NAMES, type Effects, type StageColors, type StyleId } from './settings';

const SWATCHES: Record<StyleId, string> = {
  classic: 'linear-gradient(90deg, var(--color-hand-l-pale) 50%, var(--color-hand-r-pale) 50%)',
  neon: 'radial-gradient(circle at 30% 60%, #ff2d95, transparent 45%), radial-gradient(circle at 72% 40%, #22e5ff, transparent 45%), #05050a',
  crystal: 'linear-gradient(115deg, #000 20%, #ff1f45 38%, #f4d9ff 47%, #a855f7 56%, #000 80%)',
  fire: 'linear-gradient(0deg, #ffe9a8, #ffb300 25%, #ff3d00 55%, #120402 95%)',
  liquid: 'radial-gradient(circle at 35% 35%, #ffffff 0 5%, #ff5fa2 12% 30%, transparent 32%), radial-gradient(circle at 70% 62%, #ffffff 0 4%, #2dd4ff 10% 26%, transparent 28%), #04162a',
  galaxy: 'radial-gradient(circle at 30% 40%, #5b2bd6aa, transparent 50%), radial-gradient(circle at 75% 60%, #0e8fceaa, transparent 45%), #03030c',
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
              <span className="block h-9" style={{ background: SWATCHES[id] }} />
              <span className="block py-1.5">{STYLE_NAMES[id]}</span>
            </button>
          ))}
        </div>
      </Field>
      {!plain && (
        <>
          <Field label="Couleurs des notes">
            <Segmented<StageColors> full value={s.colors} onChange={(colors) => setStage({ colors })} options={[{ value: 'hands', label: 'Mains' }, { value: 'style', label: 'Du style' }, { value: 'rainbow', label: 'Arc-en-ciel' }]} />
          </Field>
          <Field label="Particules">
            <Segmented<Effects> full value={s.effects} onChange={(effects) => setStage({ effects })} options={[{ value: 'off', label: 'Aucune' }, { value: 'soft', label: 'Douces' }, { value: 'max', label: 'Max' }]} />
          </Field>
          <div className="space-y-2">
            <Toggle checked={s.led} onChange={(led) => setStage({ led })} label="Barre de LED au-dessus du clavier" />
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
