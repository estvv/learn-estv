import { MIDI_MAX, MIDI_MIN } from '@learn/shared';
import { inputBus } from './bus';
import { inputSettings, updateSettings } from './settings';

// Computer keyboard as a piano. Listens only while a component asks for note
// input, never while typing in a field.

const held = new Map<string, number>(); // code -> midi actually played

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

// A component capturing keys (e.g. the mapping editor) can pause the source.
let paused = false;
export function pauseKeyboardSource(p: boolean) {
  paused = p;
  if (p) releaseAll();
}

function releaseAll() {
  for (const [code, midi] of held) {
    held.delete(code);
    inputBus.noteOff(midi, 'keyboard');
  }
}

function onKeyDown(e: KeyboardEvent) {
  const s = inputSettings.get().keyboard;
  if (paused || !s.enabled || inputBus.demand.get() <= 0 || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === s.octaveDown || e.code === s.octaveUp) {
    e.preventDefault();
    if (e.repeat) return;
    const next = Math.min(7, Math.max(1, s.baseOctave + (e.code === s.octaveUp ? 1 : -1)));
    updateSettings((st) => ({ ...st, keyboard: { ...st.keyboard, baseOctave: next } }));
    return;
  }
  const offset = s.mapping[e.code];
  if (offset === undefined) return;
  e.preventDefault();
  if (e.repeat || held.has(e.code)) return;
  const midi = (s.baseOctave + 1) * 12 + offset;
  if (midi < MIDI_MIN || midi > MIDI_MAX) return;
  held.set(e.code, midi);
  inputBus.noteOn(midi, 'keyboard');
}

function onKeyUp(e: KeyboardEvent) {
  const midi = held.get(e.code);
  if (midi === undefined) return;
  held.delete(e.code);
  inputBus.noteOff(midi, 'keyboard');
}

// Labels for the user's actual layout (Chrome/Edge); falls back to a QWERTY guess.
let layoutMap: Map<string, string> | null = null;
type KeyboardWithLayout = { getLayoutMap?: () => Promise<Map<string, string>> };

export function initKeyboardSource() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', releaseAll);
  inputBus.demand.subscribe(() => {
    if (inputBus.demand.get() <= 0) releaseAll();
  });
  void (navigator as unknown as { keyboard?: KeyboardWithLayout }).keyboard?.getLayoutMap?.()
    .then((m) => { layoutMap = new Map(m); })
    .catch(() => {});
}

const QWERTY_PUNCTUATION: Record<string, string> = {
  Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Comma: ',', Period: '.', Slash: '/',
};
// French AZERTY differences from the physical (QWERTY-named) codes.
const AZERTY: Record<string, string> = {
  KeyQ: 'A', KeyA: 'Q', KeyW: 'Z', KeyZ: 'W', KeyM: ',', Semicolon: 'M', Quote: 'Ù',
  BracketLeft: '^', BracketRight: '$', Comma: ';', Period: ':', Slash: '!',
};

function qwertyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return QWERTY_PUNCTUATION[code] ?? code;
}

export function keyLabel(code: string): string {
  const layout = inputSettings.get().keyboard.layout ?? 'auto';
  if (layout === 'qwerty') return qwertyLabel(code);
  if (layout === 'azerty') return AZERTY[code] ?? qwertyLabel(code);
  // Auto: the layout the system reports (Chrome/Edge), else QWERTY.
  const fromLayout = layoutMap?.get(code);
  return fromLayout ? fromLayout.toUpperCase() : qwertyLabel(code);
}

// Layout reported by the system, for the "Automatique" option's hint.
export function detectedLayout(): 'azerty' | 'qwerty' | null {
  if (!layoutMap) return null;
  return layoutMap.get('KeyQ') === 'a' ? 'azerty' : layoutMap.get('KeyQ') === 'q' ? 'qwerty' : null;
}

// midi -> key label, for showing the mapping on the on-screen keyboard.
export function keyLabelsForOctave(): Map<number, string> {
  const s = inputSettings.get().keyboard;
  const out = new Map<number, string>();
  for (const [code, offset] of Object.entries(s.mapping)) out.set((s.baseOctave + 1) * 12 + offset, keyLabel(code));
  return out;
}
