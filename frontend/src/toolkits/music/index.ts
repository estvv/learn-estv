import { registerBlock } from '../../components/blocks';
import type { Toolkit } from '../types';
import { initAudio } from './audio';
import { KeyboardBlock, PlayBlock } from './blocks';
import { initKeyboardSource } from './input/keyboard';
import { initMidi } from './input/midi';
import { MusicPractice } from './Practice';
import { MusicSettings } from './Settings';

export const musicToolkit: Toolkit = {
  id: 'music',
  label: 'Musique',
  description: 'Son du piano et entrées de notes : clavier à l’écran, clavier d’ordinateur, MIDI, micro.',
  Settings: MusicSettings,
  Practice: MusicPractice,
  init() {
    registerBlock('keyboard', KeyboardBlock);
    registerBlock('play', PlayBlock);
    initAudio();
    initKeyboardSource();
    initMidi();
  },
};
