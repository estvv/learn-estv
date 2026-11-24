import type { Hand } from '@learn/shared';
import { mix } from '../../../lib/appearance';
import type { MoodId } from './settings';

// A colour and what is made of it, kept: they are asked for at every picture.
export interface Tone {
  main: string;
  // Towards white, nearly white, towards black.
  light: string;
  hot: string;
  dark: string;
  // "r, g, b", for the see-through ones.
  rgb: string;
}

const tones = new Map<string, Tone>();
export function tone(main: string): Tone {
  let t = tones.get(main);
  if (!t) {
    t = {
      main,
      light: mix(main, '#ffffff', 0.6),
      hot: mix(main, '#ffffff', 0.18),
      dark: mix(main, '#000000', 0.4),
      rgb: [1, 3, 5].map((i) => parseInt(main.slice(i, i + 2), 16)).join(', '),
    };
    // Colours being picked go through many.
    if (tones.size > 600) tones.clear();
    tones.set(main, t);
  }
  return t;
}
export const alpha = (t: Tone, a: number) => `rgba(${t.rgb}, ${a})`;

export function hex(hue: number, saturation: number, lightness: number): string {
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    return Math.round(255 * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

// Far from the keyboard, then on it: notes warm up as they come.
type Pair = readonly [far: string, near: string];
export const MOODS: Record<Exclude<MoodId, 'hands' | 'rainbow'>, Pair> = {
  white: ['#aab4d0', '#ffffff'],
  emerald: ['#0fbf84', '#d6f56b'],
  ruby: ['#c2185b', '#ff4b3e'],
  sapphire: ['#3555ff', '#4fd8ff'],
  amethyst: ['#6d3bff', '#ff7ad9'],
  gold: ['#ff8a1f', '#ffe08a'],
};

// From the lowest key to the highest, once around.
const rainbow = (midi: number): Pair => {
  const hue = (((midi - 21) / 87) * 320 + 350) % 360;
  return [hex(hue, 0.9, 0.54), hex((hue + 14) % 360, 1, 0.66)];
};

export function pairOf(mood: MoodId, hand: Hand | null, midi: number, hands: Record<Hand, string>): Pair {
  if (mood === 'rainbow') return rainbow(midi);
  if (mood !== 'hands') return MOODS[mood];
  const own = hands[hand ?? (midi >= 60 ? 'right' : 'left')];
  return [own, mix(own, '#ffffff', 0.82)];
}

// By steps: a few colours, kept, rather than one for each pixel of the way.
const STEPS = 10;
const between = new Map<string, string>();
// `near`: 0 far away, 1 on the keyboard.
export function warm([far, close]: Pair, near: number): string {
  const step = Math.round(Math.max(0, Math.min(1, near)) ** 1.4 * STEPS);
  const key = far + close + step;
  let c = between.get(key);
  if (!c) {
    c = mix(close, far, step / STEPS);
    if (between.size > 600) between.clear();
    between.set(key, c);
  }
  return c;
}
