import { inputBus } from './input/bus';
import { inputSettings } from './input/settings';
import { noteName } from '@learn/shared';
import { Observable } from '../../lib/store';

// Sampled piano (Salamander Grand Piano, CC-BY 3.0), loaded lazily: Tone.js
// and the samples are only fetched on the first sound.

type ToneModule = typeof import('tone');
type Sampler = import('tone').Sampler;

const SAMPLE_NOTES = ['A0', 'C1', 'D#1', 'F#1', 'A1', 'C2', 'D#2', 'F#2', 'A2', 'C3', 'D#3', 'F#3', 'A3', 'C4', 'D#4', 'F#4', 'A4',
  'C5', 'D#5', 'F#5', 'A5', 'C6', 'D#6', 'F#6', 'A6', 'C7', 'D#7', 'F#7', 'A7', 'C8'];

export const audioState = new Observable<'idle' | 'loading' | 'ready' | 'error'>('idle');

let tone: ToneModule | null = null;
let sampler: Sampler | null = null;
let loading: Promise<void> | null = null;

function volumeDb(v: number) {
  return v <= 0 ? -Infinity : 20 * Math.log10(v);
}

// Must be called from a user gesture the first time (browser autoplay rules).
export function ensureAudio(): Promise<void> {
  if (loading) {
    // Resume a context suspended by the browser.
    if (tone && tone.getContext().state !== 'running') void tone.start();
    return loading;
  }
  audioState.set('loading');
  loading = (async () => {
    tone = await import('tone');
    await tone.start();
    sampler = new tone.Sampler({
      urls: Object.fromEntries(SAMPLE_NOTES.map((n) => [n, `${n.replace('#', 's')}.mp3`])),
      baseUrl: '/samples/piano/',
      release: 1.2,
    }).toDestination();
    sampler.volume.value = volumeDb(inputSettings.get().volume);
    await tone.loaded();
    audioState.set('ready');
  })().catch((e) => {
    console.error('Audio init failed', e);
    audioState.set('error');
    loading = null;
    throw e;
  });
  return loading;
}

inputSettings.subscribe(() => {
  if (sampler) sampler.volume.value = volumeDb(inputSettings.get().volume);
});

export function attack(midi: number, velocity = 0.8) {
  if (sampler && audioState.get() === 'ready') sampler.triggerAttack(noteName(midi), undefined, velocity);
}

export function release(midi: number) {
  if (sampler && audioState.get() === 'ready') sampler.triggerRelease(noteName(midi));
}

// One note for a given time, starting now (piece playback).
export function playNote(midi: number, durationSeconds: number, velocity = 0.8) {
  if (sampler && audioState.get() === 'ready') sampler.triggerAttackRelease(noteName(midi), durationSeconds, undefined, velocity);
}

export function releaseAll() {
  sampler?.releaseAll();
}

// Plays notes as a chord or one after the other. Resolves when done.
export async function playNotes(midis: number[], mode: 'melody' | 'chord' = 'melody', beat = 0.5, duration = 0.9) {
  await ensureAudio();
  if (!tone || !sampler) return;
  const start = tone.now() + 0.05;
  midis.forEach((m, i) => {
    const t = mode === 'chord' ? start : start + i * beat;
    sampler!.triggerAttackRelease(noteName(m), mode === 'chord' ? duration * 2 : duration, t);
  });
  const total = (mode === 'chord' ? duration * 2 : (midis.length - 1) * beat + duration) * 1000;
  await new Promise((r) => setTimeout(r, total));
}

export function initAudio() {
  // Sound for played notes, per source (a MIDI piano makes its own sound, the
  // microphone would feed back).
  inputBus.subscribe((e) => {
    if (!inputSettings.get().monitor[e.source]) return;
    if (e.type === 'on') {
      if (audioState.get() === 'idle') void ensureAudio().then(() => attack(e.midi, e.velocity)).catch(() => {});
      else attack(e.midi, e.velocity);
    } else {
      release(e.midi);
    }
  });

  // Browsers only start audio from a user gesture. While some component shows
  // a playable instrument, the next click or key press loads the piano, so the
  // first note is not lost. Other subjects never load Tone.js or the samples.
  const unlock = () => {
    void ensureAudio().catch(() => {});
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  inputBus.demand.subscribe(() => {
    if (inputBus.demand.get() > 0 && audioState.get() === 'idle') {
      window.addEventListener('pointerdown', unlock);
      window.addEventListener('keydown', unlock);
    }
  });
}
