import { facetsFor, fullId, mastery, selectElements, stepFullId, type Element, type Facet, type Mastery, type Pack, type Selector, type Step } from '@learn/shared';
import type { SubjectProgress } from '../progress/store';

// Helpers over a pack that modules and pages share.
export class SubjectModel {
  constructor(readonly pack: Pack) {}

  get id() {
    return this.pack.subject.id;
  }

  elementId(local: string) {
    return fullId(this.id, local);
  }

  element(local: string): Element | undefined {
    return this.pack.elements.find((e) => e.id === local);
  }

  facet(id: string): Facet | undefined {
    return this.pack.subject.facets.find((f) => f.id === id);
  }

  skillDescendants = (skill: string): Set<string> => {
    const out = new Set([skill]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const s of this.pack.skills) {
        if (s.parent && out.has(s.parent) && !out.has(s.id)) {
          out.add(s.id);
          grew = true;
        }
      }
    }
    return out;
  };

  select(selector: Selector): Element[] {
    return selectElements(this.pack.elements, selector, this.skillDescendants);
  }

  // Steps in path order with their full ids.
  steps(): { pathId: string; unitId: string; step: Step; fullId: string }[] {
    return this.pack.paths.flatMap((p) => p.units.flatMap((u) => u.steps.map((step) => ({
      pathId: p.id, unitId: u.id, step, fullId: stepFullId(this.id, p.id, u.id, step.id),
    }))));
  }

  facetsFor(element: Element): Facet[] {
    return facetsFor(this.pack, element);
  }

  mastery(skill: string, progress: SubjectProgress, now = new Date()): Mastery {
    const skills = this.skillDescendants(skill);
    const elements = this.pack.elements.filter((e) => e.skills.some((s) => skills.has(s)));
    return mastery(this.pack, elements, (key) => progress.srs.get(key)?.card, now);
  }
}
