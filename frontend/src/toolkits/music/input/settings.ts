import { readJson, writeJson } from '../../../lib/storage';
import { Observable } from '../../../lib/store';
import type { SourceId } from './bus';

// Per-device settings: they depend on this machine (keyboard layout, MIDI
// device, microphone), so they live in localStorage, not in the account.

// Physical key (KeyboardEvent.code) -> semitones above the base C. Using codes
// makes the layout position-based: the same keys work in AZERTY and QWERTY.
export type KeyMapping = Record<string, number>;

export const DEFAULT_MAPPING: KeyMapping = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11,
  KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
};

// Which letters to print on keys. Notes always follow the physical position;
// only the labels depend on the layout.
export type KeyboardLayout = 'auto' | 'azerty' | 'qwerty';

export interface InputSettings {
  keyboard: { enabled: boolean; layout?: KeyboardLayout; baseOctave: number; mapping: KeyMapping; octaveDown: string; octaveUp: string };
  midi: { enabled: boolean };
  mic: { threshold: number };
  // Play the piano sound for notes from this source.
  monitor: Record<SourceId, boolean>;
  volume: number; // 0..1
}

const KEY = 'learn.input.v1';

const defaults: InputSettings = {
  keyboard: { enabled: true, layout: 'auto', baseOctave: 4, mapping: DEFAULT_MAPPING, octaveDown: 'KeyZ', octaveUp: 'KeyX' },
  midi: { enabled: false },
  mic: { threshold: 0.01 },
  monitor: { virtual: true, keyboard: true, midi: true, mic: false },
  volume: 0.8,
};

export const inputSettings = new Observable<InputSettings>(readJson(KEY, defaults));
inputSettings.subscribe(() => writeJson(KEY, inputSettings.get()));

export function updateSettings(patch: (s: InputSettings) => InputSettings) {
  inputSettings.set(patch);
}
