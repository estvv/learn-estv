import { codeToolkit } from './code';
import { musicToolkit } from './music';
import type { Toolkit } from './types';

export const toolkits: Toolkit[] = [musicToolkit, codeToolkit];

export function initToolkits() {
  for (const t of toolkits) t.init();
}
