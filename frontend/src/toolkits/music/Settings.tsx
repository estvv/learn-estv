import { noteLabel, noteName } from '@learn/shared';
import { useEffect, useState } from 'react';
import { Section, Toggle } from '../../components/settings';
import { Segmented } from '../../components/Segmented';
import { useObservable } from '../../lib/store';
import { Button } from '../../modules/ui';
import { audioState, playNotes } from './audio';
import { sourceLabels, type SourceId } from './input/bus';
import { useHeldNotes, useNoteInput } from './input/hooks';
import { detectedLayout, keyLabel, pauseKeyboardSource } from './input/keyboard';
import { disableMic, enableMic, micState } from './input/mic';
import { disableMidi, enableMidi, midiState } from './input/midi';
import { DEFAULT_MAPPING, inputSettings, updateSettings, type KeyboardLayout } from './input/settings';
import { PianoKeyboard } from './PianoKeyboard';

const statusText = { off: 'désactivé', pending: 'autorisation…', on: 'actif', denied: 'refusé par le navigateur' } as const;

export function MusicSettings() {
  const settings = useObservable(inputSettings);
  const audio = useObservable(audioState);
  const midi = useObservable(midiState);
  const mic = useObservable(micState);
  const held = useHeldNotes();
  const [lastSource, setLastSource] = useState<SourceId | null>(null);
  useNoteInput((e) => e.type === 'on' && setLastSource(e.source));

  const base = (settings.keyboard.baseOctave + 1) * 12;
  const heldList = [...held].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <Section title="Tester les entrées">
        <div className="mb-3 text-sm text-neutral-500">
          {heldList.length ? heldList.map((m) => noteLabel(m, true)).join(' + ') : 'Joue une note avec n’importe quelle entrée.'}
          {lastSource && <span className="ml-2 text-neutral-400">via {sourceLabels[lastSource]}</span>}
        </div>
        <PianoKeyboard from={base - 12} to={base + 23} labels="keys" height={140} />
      </Section>

      <Section title="Son" description="Piano échantillonné (Salamander Grand Piano).">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-3 text-sm">
            Volume
            <input
              type="range" min={0} max={1} step={0.05} value={settings.volume}
              onChange={(e) => updateSettings((s) => ({ ...s, volume: Number(e.target.value) }))}
              className="w-40 accent-neutral-900"
            />
          </label>
          <Button variant="secondary" onClick={() => void playNotes([60, 64, 67, 72], 'melody', 0.25)}>Tester le son</Button>
          <span className="text-xs text-neutral-400">
            {audio === 'loading' ? 'Chargement des sons…' : audio === 'error' ? 'Erreur de chargement' : audio === 'ready' ? 'Sons chargés' : ''}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          {(Object.keys(sourceLabels) as SourceId[]).map((s) => (
            <Toggle
              key={s}
              label={`Son pour ${sourceLabels[s].toLowerCase()}`}
              checked={settings.monitor[s]}
              onChange={(v) => updateSettings((st) => ({ ...st, monitor: { ...st.monitor, [s]: v } }))}
            />
          ))}
        </div>
      </Section>

      <Section title="Clavier d’ordinateur" description="Les touches jouent des notes quand un clavier est affiché, sauf pendant la saisie de texte. Les notes suivent la position physique des touches : seules les lettres affichées dépendent de la disposition.">
        <div className="flex flex-wrap items-center gap-6">
          <Toggle
            label="Activé"
            checked={settings.keyboard.enabled}
            onChange={(v) => updateSettings((s) => ({ ...s, keyboard: { ...s.keyboard, enabled: v } }))}
          />
          <div className="flex items-center gap-3 text-sm text-neutral-600">
            Disposition
            <Segmented<KeyboardLayout>
              value={settings.keyboard.layout ?? 'auto'}
              onChange={(layout) => updateSettings((s) => ({ ...s, keyboard: { ...s.keyboard, layout } }))}
              options={[
                { value: 'auto', label: detectedLayout() ? `Auto (${detectedLayout()!.toUpperCase()})` : 'Auto' },
                { value: 'azerty', label: 'AZERTY' },
                { value: 'qwerty', label: 'QWERTY' },
              ]}
            />
          </div>
          <span className="text-sm text-neutral-600">
            Octave de départ : <strong>{noteName(base)}</strong> ({keyLabel(settings.keyboard.octaveDown)} / {keyLabel(settings.keyboard.octaveUp)} pour changer)
          </span>
        </div>
        <MappingEditor />
      </Section>

      <Section title="Clavier MIDI" description="Branche un clavier en USB. Fonctionne dans Chrome et Edge.">
        {!midi.supported ? (
          <p className="text-sm text-neutral-500">Ce navigateur ne gère pas le MIDI (Web MIDI). Utilise Chrome ou Edge.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {midi.status === 'on'
              ? <Button variant="secondary" onClick={disableMidi}>Désactiver</Button>
              : <Button onClick={() => void enableMidi()}>Activer le MIDI</Button>}
            <span className="text-neutral-500">
              {statusText[midi.status]}
              {midi.status === 'on' && ` · ${midi.devices.length ? midi.devices.join(', ') : 'aucun appareil branché'}`}
            </span>
          </div>
        )}
      </Section>

      <Section title="Micro" description="Pour un vrai instrument : l’app écoute et reconnaît une note à la fois (pas les accords).">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {mic.status === 'on'
            ? <Button variant="secondary" onClick={disableMic}>Couper le micro</Button>
            : <Button onClick={() => void enableMic()}>Activer le micro</Button>}
          <span className="text-neutral-500">{statusText[mic.status]}</span>
        </div>
        {mic.status === 'on' && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-24 text-neutral-500">Niveau</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full bg-neutral-900" style={{ width: `${Math.min(100, mic.level * 400)}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-24 text-neutral-500">Seuil</span>
              <input
                type="range" min={0.002} max={0.1} step={0.002} value={settings.mic.threshold}
                onChange={(e) => updateSettings((s) => ({ ...s, mic: { threshold: Number(e.target.value) } }))}
                className="flex-1 accent-neutral-900"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-24 text-neutral-500">Entendu</span>
              <span className="font-medium">
                {mic.pitch !== null ? `${noteLabel(Math.round(mic.pitch), true)} ${centsText(mic.pitch)}` : '—'}
              </span>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

function centsText(pitch: number) {
  const cents = Math.round((pitch - Math.round(pitch)) * 100);
  return cents === 0 ? '' : `(${cents > 0 ? '+' : ''}${cents} cents)`;
}

// Click a note, then press the key that should play it.
function MappingEditor() {
  const settings = useObservable(inputSettings);
  const [editing, setEditing] = useState<number | null>(null);
  const mapping = settings.keyboard.mapping;
  const base = (settings.keyboard.baseOctave + 1) * 12;

  useEffect(() => {
    if (editing === null) return;
    pauseKeyboardSource(true);
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code !== 'Escape') {
        updateSettings((s) => {
          const next = Object.fromEntries(Object.entries(s.keyboard.mapping).filter(([code, off]) => code !== e.code && off !== editing));
          next[e.code] = editing;
          return { ...s, keyboard: { ...s.keyboard, mapping: next } };
        });
      }
      setEditing(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      pauseKeyboardSource(false);
    };
  }, [editing]);

  const codeFor = (offset: number) => Object.entries(mapping).find(([, o]) => o === offset)?.[0];

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 18 }, (_, o) => {
          const code = codeFor(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => setEditing(o)}
              className={`w-14 rounded-lg border px-1 py-1.5 text-center text-xs ${
                editing === o ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <div className="text-neutral-400">{noteName(base + o)}</div>
              <div className="font-semibold">{editing === o ? '…' : code ? keyLabel(code) : '—'}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
        {editing !== null ? 'Appuie sur la touche à associer (Échap pour annuler).' : 'Clique une note pour changer sa touche.'}
        <button
          type="button"
          className="underline"
          onClick={() => updateSettings((s) => ({ ...s, keyboard: { ...s.keyboard, mapping: DEFAULT_MAPPING } }))}
        >
          Disposition par défaut
        </button>
      </div>
    </div>
  );
}
