import { readJson, writeJson } from '../../../lib/storage';
import { Observable } from '../../../lib/store';

// How the falling notes look, on this device. All but the classic one are played
// in the dark.

export const STYLE_IDS = ['classic', 'neon', 'crystal', 'fire', 'liquid', 'galaxy'] as const;
export type StyleId = (typeof STYLE_IDS)[number];
export type StageColors = 'hands' | 'style' | 'rainbow';
export type Effects = 'off' | 'soft' | 'max';

export interface StageSettings {
  style: StyleId;
  colors: StageColors;
  // Sparks, drops, stars…
  effects: Effects;
  // The bar of light over the keyboard.
  led: boolean;
  // Notes light the keys up.
  keys: boolean;
}

export const STYLE_NAMES: Record<StyleId, string> = {
  classic: 'Classique', neon: 'Néon', crystal: 'Cristal', fire: 'Braise', liquid: 'Liquide', galaxy: 'Galaxie',
};

const KEY = 'learn.stage.v1';
const DEFAULTS: StageSettings = { style: 'classic', colors: 'hands', effects: 'max', led: true, keys: true };

const one = <T extends string>(value: unknown, of: readonly T[], otherwise: T): T => (of.includes(value as T) ? (value as T) : otherwise);

export function cleanedStage(s: Partial<StageSettings>): StageSettings {
  return {
    style: one(s.style, STYLE_IDS, DEFAULTS.style),
    colors: one(s.colors, ['hands', 'style', 'rainbow'], DEFAULTS.colors),
    effects: one(s.effects, ['off', 'soft', 'max'], DEFAULTS.effects),
    led: typeof s.led === 'boolean' ? s.led : DEFAULTS.led,
    keys: typeof s.keys === 'boolean' ? s.keys : DEFAULTS.keys,
  };
}

export const stage = new Observable<StageSettings>(cleanedStage(readJson<Partial<StageSettings>>(KEY, {})));
stage.subscribe(() => writeJson(KEY, stage.get()));
export const setStage = (patch: Partial<StageSettings>) => stage.set((s) => ({ ...s, ...patch }));
