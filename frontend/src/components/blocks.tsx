import type { ComponentType } from 'react';

// Interactive blocks usable in any Markdown (lessons, cards, questions): a
// fenced block whose language is a registered name, with `key: value` lines.
//
// ```keyboard
// range: C3-C5
// highlight: C4 E4
// ```
//
// Toolkits register their blocks here (code: js-run, ts-run…).

// `source` is the raw text, for blocks that are not `key: value` lines (code).
export type BlockProps = { params: Record<string, string>; source: string };
export const blocks: Record<string, ComponentType<BlockProps>> = {};

export function registerBlock(name: string, component: ComponentType<BlockProps>) {
  blocks[name] = component;
}

export function parseBlock(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of source.split('\n')) {
    const m = /^\s*([\w-]+)\s*:\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
