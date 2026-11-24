import { readJson, writeJson } from './storage';
import { Observable } from './store';

// How the app looks on this device: light or night, and the colours of the two
// hands, which each theme has its own of. The theme itself is in index.css and
// dark.css; the hands' shades are worked out here, as the canvas needs them too.

export type Theme = 'light' | 'dark';
export interface HandColors { left: string; right: string }
export interface Appearance {
  // Auto: as the device.
  theme: Theme | 'auto';
  hands: Record<Theme, HandColors>;
}

export const DEFAULT_HANDS: Record<Theme, HandColors> = {
  light: { left: '#ef4444', right: '#3b82f6' },
  dark: { left: '#ff7b7b', right: '#6ea8ff' },
};
const KEY = 'learn.appearance.v1';
const isColor = (c: unknown): c is string => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

// What is kept on the device may be old or wrong.
export function cleaned(saved: Partial<Appearance>): Appearance {
  const hands = (t: Theme): HandColors => {
    const own = saved.hands?.[t];
    return { left: isColor(own?.left) ? own.left : DEFAULT_HANDS[t].left, right: isColor(own?.right) ? own.right : DEFAULT_HANDS[t].right };
  };
  return { theme: saved.theme === 'light' || saved.theme === 'dark' ? saved.theme : 'auto', hands: { light: hands('light'), dark: hands('dark') } };
}

// --- Shades ---------------------------------------------------------------------------

export interface Shades {
  strong: string;
  // Written on it.
  on: string;
  soft: string;
  pale: string;
  // Over black keys.
  deep: string;
  // Text of that colour on the page.
  ink: string;
  // A white key, text on one, text on a black one: the keyboard does not
  // change with the theme.
  key: string;
  keyInk: string;
  bright: string;
}

const PAPER: Record<Theme, string> = { light: '#ffffff', dark: '#1c1c1c' };
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
// So much of `a` in `b`.
export const mix = (a: string, b: string, share: number): string => {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v * share + y[i] * (1 - share)).toString(16).padStart(2, '0')).join('')}`;
};
// 0 to 1, as the eye sees it.
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function shadesOf(color: string, theme: Theme): Shades {
  const paper = PAPER[theme];
  const dark = theme === 'dark';
  return {
    strong: color,
    on: luminance(color) > 0.35 ? '#171717' : '#ffffff',
    soft: mix(color, paper, dark ? 0.16 : 0.1),
    pale: mix(color, paper, dark ? 0.42 : 0.3),
    deep: mix(color, paper, dark ? 0.6 : 0.5),
    ink: dark ? mix(color, '#ffffff', 0.5) : mix(color, '#000000', 0.62),
    key: mix(color, '#ffffff', 0.4),
    keyInk: mix(color, '#000000', 0.62),
    bright: mix(color, '#ffffff', 0.6),
  };
}

// --- On the page ------------------------------------------------------------------------

export interface Look { theme: Theme; left: Shades; right: Shades }

const system = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);
export const lookOf = (a: Appearance, dark: boolean): Look => {
  const theme = a.theme === 'auto' ? (dark ? 'dark' : 'light') : a.theme;
  return { theme, left: shadesOf(a.hands[theme].left, theme), right: shadesOf(a.hands[theme].right, theme) };
};

export const appearance = new Observable<Appearance>(cleaned(readJson<Partial<Appearance>>(KEY, {})));
export const look = new Observable<Look>(lookOf(appearance.get(), system()?.matches ?? false));

// A page that is only seen in the dark, whatever the theme.
let night = false;
export function forceNight(on: boolean) {
  if (night === on) return;
  night = on;
  apply();
}

const VARIABLES: Record<keyof Shades, string> = {
  strong: '', on: '-on', soft: '-soft', pale: '-pale', deep: '-deep', ink: '-ink', key: '-key', keyInk: '-key-ink', bright: '-bright',
};

function apply() {
  const chosen = appearance.get();
  const next = lookOf(night ? { ...chosen, theme: 'dark' } : chosen, system()?.matches ?? false);
  const root = document.documentElement;
  root.dataset.theme = next.theme;
  for (const hand of ['left', 'right'] as const) {
    for (const [shade, name] of Object.entries(VARIABLES)) root.style.setProperty(`--color-hand-${hand[0]}${name}`, next[hand][shade as keyof Shades]);
  }
  look.set(next);
}

// Before anything is drawn.
export function initAppearance() {
  apply();
  appearance.subscribe(() => {
    writeJson(KEY, appearance.get());
    apply();
  });
  system()?.addEventListener('change', apply);
}

export const setTheme = (theme: Appearance['theme']) => appearance.set((a) => ({ ...a, theme }));
export const setHand = (theme: Theme, hand: 'left' | 'right', color: string) => {
  if (isColor(color)) appearance.set((a) => ({ ...a, hands: { ...a.hands, [theme]: { ...a.hands[theme], [hand]: color } } }));
};
export const resetHands = (theme: Theme) => appearance.set((a) => ({ ...a, hands: { ...a.hands, [theme]: DEFAULT_HANDS[theme] } }));
