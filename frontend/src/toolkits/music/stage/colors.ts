import type { Hand } from '@learn/shared';
import { mix } from '../../../lib/appearance';
import type { StageColors } from './settings';

// A colour and what is made of it, kept: they are asked for at every picture.
export interface Tone {
  main: string;
  // Towards white, towards black.
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
      hot: mix(main, '#ffffff', 0.22),
      dark: mix(main, '#000000', 0.4),
      rgb: [1, 3, 5].map((i) => parseInt(main.slice(i, i + 2), 16)).join(', '),
    };
    // Colours being picked go through many.
    if (tones.size > 400) tones.clear();
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

// From the lowest key to the highest, once around.
const rainbow = (midi: number) => hex((((midi - 21) / 87) * 320 + 350) % 360, 0.95, 0.6);

export function noteColor(mode: StageColors, hand: Hand | null, midi: number, hands: Record<Hand, string>, palette: Record<Hand, string>): string {
  if (mode === 'rainbow') return rainbow(midi);
  return (mode === 'style' ? palette : hands)[hand ?? (midi >= 60 ? 'right' : 'left')];
}
