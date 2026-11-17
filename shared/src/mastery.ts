import type { Element, Facet, Pack } from './pack.ts';
import { fullId } from './pack.ts';
import { retrievability, srsKey, type StoredCard } from './srs.ts';

export function facetsFor(pack: Pack, element: Element): Facet[] {
  return pack.subject.facets.filter((f) => !f.kinds || f.kinds.includes(element.kind));
}

export interface Mastery {
  value: number; // mean recall probability, 0..1
  seen: number; // (element, facet) pairs reviewed at least once
  total: number; // (element, facet) pairs that exist
}

// Mean recall probability over every (element, facet) pair of the given
// elements; never reviewed counts as 0.
export function mastery(pack: Pack, elements: Element[], card: (key: string) => StoredCard | undefined, now = new Date()): Mastery {
  let sum = 0;
  let total = 0;
  let seen = 0;
  for (const e of elements) {
    for (const f of facetsFor(pack, e)) {
      const c = card(srsKey(fullId(pack.subject.id, e.id), f.id));
      total++;
      if (c) seen++;
      sum += retrievability(c, now);
    }
  }
  return { value: total ? sum / total : 0, seen, total };
}
