import type { PieceNote } from '@learn/shared';
import { useMemo, useRef, type CSSProperties } from 'react';
import { Field } from '../../../components/Field';
import { Segmented } from '../../../components/Segmented';
import { Toggle } from '../../../components/settings';
import { useObservable } from '../../../lib/store';
import { FallingNotes, type NoteSource } from '../pieces/FallingNotes';
import { PianoKeyboard } from '../PianoKeyboard';
import { MOOD_IDS, MOOD_NAMES, setStage, stage, STYLE_IDS, STYLE_NAMES, type Effects, type KeyLight as KeyLightMode, type Sparks, type MoodId, type StyleId } from './settings';

// What each looks like, on a button.
const SWATCHES: Record<StyleId, CSSProperties> = {
  classic: { background: 'linear-gradient(90deg, var(--color-hand-l-pale) 50%, var(--color-hand-r-pale) 50%)' },
  glow: { background: 'linear-gradient(#7d9bff, #cfdcff)', boxShadow: '0 0 14px #6f8dffaa' },
  glass: { background: '#7d9bff3d', border: '1.5px solid #a9bdff', boxShadow: '0 0 10px #6f8dff66' },
  outline: { border: '2px solid #8ea6ff', boxShadow: '0 0 12px #6f8dffaa, inset 0 0 6px #6f8dff66' },
  comet: { background: 'linear-gradient(transparent, #7d9bff 60%, #ffffff)', borderRadius: 99, boxShadow: '0 6px 12px -2px #8ea6ffcc' },
  plain: { background: '#f5c542', borderRadius: 3 },
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
            <Segmented<MoodId> full value={s.mood} onChange={(mood) => setStage({ mood })} options={MOOD_IDS.map((id) => ({ value: id, label: MOOD_NAMES[id] }))} />
          </Field>
          {s.mood === 'custom' && (
            <div className="flex gap-4">
              <ColorInput label="Main gauche" value={s.custom.left} onChange={(left) => setStage({ custom: { ...s.custom, left } })} />
              <ColorInput label="Main droite" value={s.custom.right} onChange={(right) => setStage({ custom: { ...s.custom, right } })} />
            </div>
          )}
          <Field label="Particules">
            <Segmented<Effects> full value={s.effects} onChange={(effects) => setStage({ effects })} options={[{ value: 'off', label: 'Aucune' }, { value: 'soft', label: 'Douces' }, { value: 'max', label: 'Max' }]} />
          </Field>
          {s.effects !== 'off' && (
            <Field label="Genre de particules">
              <Segmented<Sparks> full value={s.sparks} onChange={(sparks) => setStage({ sparks })} options={[{ value: 'cloud', label: 'Nuées' }, { value: 'embers', label: 'Braises' }]} />
            </Field>
          )}
          <Field label="Touches jouées">
            <Segmented<KeyLightMode> full value={s.keys} onChange={(keys) => setStage({ keys })} options={[{ value: 'glow', label: 'Éclairées' }, { value: 'solid', label: 'Pleines' }, { value: 'off', label: 'Normales' }]} />
          </Field>
          {s.keys !== 'off' && <OwnColor label="Couleur des touches" value={s.keyColor} onChange={(keyColor) => setStage({ keyColor })} />}
          <div className="space-y-2">
            <Toggle checked={s.led} onChange={(led) => setStage({ led })} label="Ligne de LED au-dessus du clavier" />
            {s.led && <OwnColor label="Couleur des LED" value={s.ledColor} onChange={(ledColor) => setStage({ ledColor })} />}
          </div>
        </>
      )}
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange(v: string): void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-700">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
      {label}
    </label>
  );
}

// That of the notes, or one chosen ('' or a colour).
function OwnColor({ label, value, onChange }: { label: string; value: string; onChange(v: string): void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <Segmented<'notes' | 'own'> value={value ? 'own' : 'notes'} onChange={(v) => onChange(v === 'own' ? value || '#ff7a1a' : '')} options={[{ value: 'notes', label: 'Des notes' }, { value: 'own', label: 'Choisie' }]} />
        {value && <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />}
      </div>
    </Field>
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
  if (style === 'classic' || keys === 'off') return null;
  return <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full mix-blend-multiply" />;
}
