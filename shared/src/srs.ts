import { z } from 'zod';
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type CardInput } from 'ts-fsrs';

export const grades = ['again', 'hard', 'good', 'easy'] as const;
export type Grade = (typeof grades)[number];

// What every activity emits; the platform alone turns it into progress.
export const reviewEventSchema = z.object({
  element: z.string().min(1).max(200), // full id `<subject>/<slug>`
  facet: z.string().min(1).max(64),
  grade: z.enum(grades),
  correct: z.boolean(),
  responseMs: z.number().int().min(0).max(3_600_000).optional(),
});
export type ReviewEvent = z.infer<typeof reviewEventSchema>;

// A card as stored (JSON): dates are ISO strings.
export type StoredCard = Omit<Card, 'due' | 'last_review'> & { due: string; last_review?: string };

export interface SrsEntry {
  element: string;
  facet: string;
  card: StoredCard;
}

export function srsKey(element: string, facet: string): string {
  return `${element}#${facet}`;
}

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));
const rating: Record<Grade, Rating.Again | Rating.Hard | Rating.Good | Rating.Easy> = {
  again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy,
};

function store(card: Card): StoredCard {
  return { ...card, due: card.due.toISOString(), last_review: card.last_review?.toISOString() };
}

export function reviewCard(previous: StoredCard | undefined, grade: Grade, now = new Date()): StoredCard {
  const card: CardInput | Card = previous ?? createEmptyCard(now);
  return store(scheduler.next(card, now, rating[grade]).card);
}

// Probability of recalling right now, 0 for a never reviewed card.
export function retrievability(card: StoredCard | undefined, now = new Date()): number {
  if (!card || card.state === State.New) return 0;
  return scheduler.get_retrievability(card, now, false);
}

export function isDue(card: StoredCard, now = new Date()): boolean {
  return new Date(card.due).getTime() <= now.getTime();
}

// Grade from correctness and speed: a fast right answer is "easy", a slow one "hard".
export function gradeFromAnswer(correct: boolean, responseMs?: number, fastMs = 3000, slowMs = 12000): Grade {
  if (!correct) return 'again';
  if (responseMs === undefined) return 'good';
  if (responseMs <= fastMs) return 'easy';
  if (responseMs >= slowMs) return 'hard';
  return 'good';
}
