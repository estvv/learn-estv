import { readJson, writeJson } from './storage';
import { Observable } from './store';

// How the app looks on this device: light or night. The theme itself is in
// index.css and dark.css.

export type Theme = 'light' | 'dark';
export interface Appearance {
  // Auto: as the device.
  theme: Theme | 'auto';
}

// Also kept the hands' colours when the piano was here: only the theme is read.
const KEY = 'learn.appearance.v1';

// What is kept on the device may be old or wrong.
export const cleaned = (saved: Partial<Appearance>): Appearance => ({ theme: saved.theme === 'light' || saved.theme === 'dark' ? saved.theme : 'auto' });

const system = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);
export const themeOf = (a: Appearance, dark: boolean): Theme => (a.theme === 'auto' ? (dark ? 'dark' : 'light') : a.theme);

export const appearance = new Observable<Appearance>(cleaned(readJson<Partial<Appearance>>(KEY, {})));

function apply() {
  document.documentElement.dataset.theme = themeOf(appearance.get(), system()?.matches ?? false);
}

// Before anything is drawn.
export function initAppearance() {
  apply();
  appearance.subscribe(() => {
    writeJson(KEY, { theme: appearance.get().theme });
    apply();
  });
  system()?.addEventListener('change', apply);
}

export const setTheme = (theme: Appearance['theme']) => appearance.set((a) => ({ ...a, theme }));
