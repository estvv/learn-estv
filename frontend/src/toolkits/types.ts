import type { ComponentType } from 'react';

// A toolkit brings what a family of subjects needs beyond the core platform:
// input sources, sound, Markdown blocks, device settings. Music today;
// languages (speech), code (runner)… later. Activity modules declare the
// toolkits they rely on.
export interface Toolkit {
  id: string;
  label: string;
  description: string;
  // Device settings panel shown in Réglages.
  Settings?: ComponentType;
  // Full-screen free play: the "Pratique" page of subjects using this toolkit
  // (`practice` in the pack).
  Practice?: ComponentType<{ subject: string }>;
  // Registers blocks and global listeners; called once at startup.
  init(): void;
}
