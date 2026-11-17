import { z } from 'zod';
import { selectorSchema } from '../select.ts';

// Config schemas of activity modules. They live here (not with the React
// code) so the backend validates packs with exactly the same rules.

export const lessonConfig = z.object({
  lesson: z.string(),
});

export const flashcardsConfig = z.object({
  select: selectorSchema,
  facet: z.string(),
  // Markdown templates, `{{field}}` filled from the element's data.
  front: z.string(),
  back: z.string(),
  // Cards per run; all selected elements when omitted.
  count: z.number().int().positive().optional(),
  shuffle: z.boolean().default(true),
});

const fixedQuestion = z.object({
  prompt: z.string(),
  // Multiple choice when present, typed answer otherwise.
  choices: z.array(z.string()).min(2).optional(),
  answer: z.string(),
  // Other accepted typed answers.
  accept: z.array(z.string()).default([]),
  explanation: z.string().optional(),
  // Counts as a review of this element's facet when both are set.
  element: z.string().optional(),
  facet: z.string().optional(),
});

export const quizConfig = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('fixed'),
    questions: z.array(fixedQuestion).min(1),
    shuffle: z.boolean().default(false),
    passRatio: z.number().min(0).max(1).default(0.8),
  }),
  z.object({
    mode: z.literal('generated'),
    select: selectorSchema,
    facet: z.string(),
    prompt: z.string(),
    answer: z.string(),
    // Number of choices (distractors taken from other elements' answers); 0 = typed answer.
    choices: z.number().int().min(0).max(8).default(4),
    count: z.number().int().positive().default(10),
    // Distractors are drawn from this wider pool when set (default: the selection).
    distractors: selectorSchema.optional(),
    explanation: z.string().optional(),
    passRatio: z.number().min(0).max(1).default(0.8),
  }),
]);

export type LessonConfig = z.infer<typeof lessonConfig>;
export type FlashcardsConfig = z.infer<typeof flashcardsConfig>;
export type QuizConfig = z.infer<typeof quizConfig>;
export type FixedQuestion = z.infer<typeof fixedQuestion>;

export const moduleConfigSchemas: Record<string, z.ZodType> = {
  lesson: lessonConfig,
  flashcards: flashcardsConfig,
  quiz: quizConfig,
};
