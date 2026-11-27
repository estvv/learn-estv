import { codeToolkit } from './code';
import type { Toolkit } from './types';

export const toolkits: Toolkit[] = [codeToolkit];

export function initToolkits() {
  for (const t of toolkits) t.init();
}
