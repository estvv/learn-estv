import { readJson, writeJson } from '../../../lib/storage';
import { Observable } from '../../../lib/store';

// How the falling notes look, on this device. All but the classic ones are played
// in the dark, with the same light and the same sparks: only the notes change.

export const STYLE_IDS = ['classic', 'glow', 'glass', 'outline', 'comet'] as const;
export type StyleId = (typeof STYLE_IDS)[number];
// Of the notes, and of the light: the hands' own, one for the whole stage, or a
// rainbow along the keyboard.
export const MOOD_IDS = ['hands', 'white', 'emerald', 'ruby', 'sapphire', 'amethyst', 'gold', 'rainbow'] as const;
export type MoodId = (typeof MOOD_IDS)[number];
export type Effects = 'off' | 'soft' | 'max';

export interface StageSettings {
  style: StyleId;
  mood: MoodId;
  effects: Effects;
  // The line of light over the keyboard.
  led: boolean;
  // Notes light the keys up.
  keys: boolean;
}

export const STYLE_NAMES: Record<StyleId, string> = { classic: 'Classique', glow: 'Lueur', glass: 'Verre', outline: 'Contour', comet: 'Traînée' };
export const MOOD_NAMES: Record<MoodId, string> = {
  hands: 'Mains', white: 'Blanc', emerald: 'Émeraude', ruby: 'Rubis', sapphire: 'Saphir', amethyst: 'Améthyste', gold: 'Or', rainbow: 'Arc-en-ciel',
};

const KEY = 'learn.stage.v1';
const DEFAULTS: StageSettings = { style: 'classic', mood: 'hands', effects: 'max', led: true, keys: true };
// Styles there used to be.
const OLD = ['neon', 'crystal', 'fire', 'liquid', 'galaxy'];

const one = <T extends string>(value: unknown, of: readonly T[], otherwise: T): T => (of.includes(value as T) ? (value as T) : otherwise);

export function cleanedStage(s: Partial<StageSettings>): StageSettings {
  return {
    style: one(s.style, STYLE_IDS, OLD.includes(s.style as string) ? 'glow' : DEFAULTS.style),
    mood: one(s.mood, MOOD_IDS, DEFAULTS.mood),
    effects: one(s.effects, ['off', 'soft', 'max'], DEFAULTS.effects),
    led: typeof s.led === 'boolean' ? s.led : DEFAULTS.led,
    keys: typeof s.keys === 'boolean' ? s.keys : DEFAULTS.keys,
  };
}

export const stage = new Observable<StageSettings>(cleanedStage(readJson<Partial<StageSettings>>(KEY, {})));
stage.subscribe(() => writeJson(KEY, stage.get()));
export const setStage = (patch: Partial<StageSettings>) => stage.set((s) => ({ ...s, ...patch }));
