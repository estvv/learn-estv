import type { ReviewEvent } from '@learn/shared';
import type { ComponentType } from 'react';
import type { z } from 'zod';
import type { SubjectModel } from '../content/subject';

export interface ActivityResult {
  // Share of correct answers, when the activity is scored.
  score?: number;
  // Whether the path step counts as done.
  passed: boolean;
}

export interface PlayerProps<Config> {
  subject: SubjectModel;
  config: Config;
  // Full id of the path step played, if any.
  stepId?: string;
  // Reports one answer; the platform turns it into progress.
  onReview(event: ReviewEvent): void;
  // Records the result without leaving the activity.
  onComplete?(result: ActivityResult): void;
  onFinish(result: ActivityResult): void;
}

// One way of learning. Adding a module = a folder + one line in registry.ts.
export interface ActivityModule<Config = unknown> {
  id: string;
  label: string;
  // Same schema as the backend's pack validation (@learn/shared).
  configSchema: z.ZodType<Config>;
  // Toolkits the module relies on (e.g. "music" for note input and sound).
  toolkits?: string[];
  // Uses the whole width of the page.
  wide?: boolean;
  Player: ComponentType<PlayerProps<Config>>;
  // Config used to review the given due elements (local ids) of a facet.
  reviewConfig?(config: Config, elementIds: string[]): Config;
}
