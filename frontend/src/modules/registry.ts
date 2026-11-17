import { flashcardsModule } from './flashcards';
import { lessonModule } from './lesson';
import { quizModule } from './quiz';
import type { ActivityModule } from './types';

// Every activity module, by id. Pack steps reference these ids.
const modules: ActivityModule<any>[] = [lessonModule, flashcardsModule, quizModule];

export const registry = new Map<string, ActivityModule<any>>(modules.map((m) => [m.id, m]));

export function getModule(id: string): ActivityModule<any> | undefined {
  return registry.get(id);
}
