import { z } from 'zod';
import { moduleConfigSchemas } from './modules/index.ts';

// Local identifiers inside a pack. Full identifiers are `<subject>/<slug>`.
export const slug = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/i, 'identifiant invalide (lettres, chiffres, . _ -)').max(64);

export const facetSchema = z.object({
  id: slug,
  label: z.string().min(1),
  description: z.string().optional(),
  // Element kinds this facet applies to (all kinds when omitted).
  kinds: z.array(z.string()).optional(),
  // How a due review of this facet is presented: a module + its config. The
  // config's `select` is replaced by the due elements at review time.
  review: z.object({ module: z.string(), config: z.record(z.string(), z.unknown()) }).optional(),
});

export const accents = ['neutral', 'emerald', 'teal', 'blue', 'violet', 'rose', 'amber'] as const;
export type Accent = (typeof accents)[number];

export const subjectSchema = z.object({
  id: slug,
  name: z.string().min(1),
  description: z.string().default(''),
  // Colour of the subject everywhere it appears (tile, badges, bars).
  accent: z.enum(accents).default('neutral'),
  // Toolkit whose full-screen playground is this subject's "Pratique" page.
  practice: z.string().optional(),
  // BCP 47 language of the subject's content (text-to-speech, fonts).
  lang: z.string().optional(),
  facets: z.array(facetSchema).default([]),
});

export const skillSchema = z.object({
  id: slug,
  name: z.string().min(1),
  parent: slug.optional(),
});

export const elementSchema = z.object({
  id: slug,
  kind: z.string().min(1),
  skills: z.array(slug).default([]),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const lessonSchema = z.object({
  id: slug,
  title: z.string().min(1),
  markdown: z.string(),
  skills: z.array(slug).default([]),
});

export const stepSchema = z.object({
  id: slug,
  title: z.string().min(1),
  module: z.string().min(1),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const unitSchema = z.object({
  id: slug,
  name: z.string().min(1),
  description: z.string().default(''),
  steps: z.array(stepSchema).default([]),
});

export const pathSchema = z.object({
  id: slug,
  name: z.string().min(1),
  description: z.string().default(''),
  units: z.array(unitSchema).default([]),
});

const packShape = z.object({
  format: z.literal(1),
  subject: subjectSchema,
  skills: z.array(skillSchema).default([]),
  elements: z.array(elementSchema).default([]),
  lessons: z.array(lessonSchema).default([]),
  paths: z.array(pathSchema).default([]),
});

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  return [...new Set(ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false))))];
}

// Structural schema + cross-references (skills, lessons, module configs).
export const packSchema = packShape.superRefine((pack, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });

  for (const [key, list] of [['skills', pack.skills], ['elements', pack.elements], ['lessons', pack.lessons], ['paths', pack.paths]] as const) {
    for (const d of duplicates(list.map((x) => x.id))) issue([key], `identifiant en double : ${d}`);
  }
  for (const d of duplicates(pack.subject.facets.map((f) => f.id))) issue(['subject', 'facets'], `facette en double : ${d}`);

  const skills = new Set(pack.skills.map((s) => s.id));
  pack.skills.forEach((s, i) => {
    if (s.parent && !skills.has(s.parent)) issue(['skills', i, 'parent'], `compétence inconnue : ${s.parent}`);
  });
  pack.elements.forEach((e, i) => e.skills.forEach((s) => {
    if (!skills.has(s)) issue(['elements', i, 'skills'], `compétence inconnue : ${s}`);
  }));

  const lessons = new Set(pack.lessons.map((l) => l.id));
  const checkModule = (path: (string | number)[], module: string, config: unknown) => {
    const schema = moduleConfigSchemas[module];
    if (!schema) return issue([...path, 'module'], `module inconnu : ${module}`);
    const parsed = schema.safeParse(config);
    if (!parsed.success) {
      for (const err of parsed.error.issues) issue([...path, 'config', ...err.path.map(String)], err.message);
    } else if (module === 'lesson' && !lessons.has((parsed.data as { lesson: string }).lesson)) {
      issue([...path, 'config', 'lesson'], `leçon inconnue : ${(parsed.data as { lesson: string }).lesson}`);
    }
  };

  pack.subject.facets.forEach((f, i) => {
    if (f.review) checkModule(['subject', 'facets', i, 'review'], f.review.module, f.review.config);
  });
  pack.paths.forEach((p, pi) => {
    for (const d of duplicates(p.units.map((u) => u.id))) issue(['paths', pi, 'units'], `unité en double : ${d}`);
    p.units.forEach((u, ui) => {
      for (const d of duplicates(u.steps.map((s) => s.id))) issue(['paths', pi, 'units', ui, 'steps'], `étape en double : ${d}`);
      u.steps.forEach((s, si) => checkModule(['paths', pi, 'units', ui, 'steps', si], s.module, s.config));
    });
  });
});

export type Pack = z.infer<typeof packShape>;
export type PackInput = z.input<typeof packShape>;
export type Facet = z.infer<typeof facetSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Element = z.infer<typeof elementSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Unit = z.infer<typeof unitSchema>;
export type Path = z.infer<typeof pathSchema>;

export function fullId(subject: string, local: string): string {
  return `${subject}/${local}`;
}

export function stepFullId(subject: string, path: string, unit: string, step: string): string {
  return `${subject}/${path}/${unit}/${step}`;
}
