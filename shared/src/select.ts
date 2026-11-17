import { z } from 'zod';
import type { Element } from './pack.ts';

// Picks elements of a subject. All given criteria must match.
export const selectorSchema = z.object({
  ids: z.array(z.string()).optional(),
  kind: z.string().optional(),
  skill: z.string().optional(),
  // Equality on element data fields; an array means "one of".
  where: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number(), z.boolean()]))])).optional(),
});

export type Selector = z.infer<typeof selectorSchema>;

export function selectElements(elements: Element[], selector: Selector, skillDescendants?: (skill: string) => Set<string>): Element[] {
  const ids = selector.ids ? new Set(selector.ids) : undefined;
  const skills = selector.skill ? (skillDescendants?.(selector.skill) ?? new Set([selector.skill])) : undefined;
  const matches = elements.filter((e) => {
    if (ids && !ids.has(e.id)) return false;
    if (selector.kind && e.kind !== selector.kind) return false;
    if (skills && !e.skills.some((s) => skills.has(s))) return false;
    if (selector.where) {
      for (const [key, expected] of Object.entries(selector.where)) {
        const actual = e.data[key];
        if (Array.isArray(expected) ? !expected.includes(actual as never) : actual !== expected) return false;
      }
    }
    return true;
  });
  // Explicit ids keep the order they were given in.
  if (selector.ids) {
    const order = new Map(selector.ids.map((id, i) => [id, i]));
    matches.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }
  return matches;
}

// `{{field}}` placeholders filled from the element's data (plus `{{id}}`).
export function fillTemplate(template: string, element: Element): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    if (key === 'id') return element.id;
    const value = element.data[key];
    return value === undefined || value === null ? '' : String(value);
  });
}
