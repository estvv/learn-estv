import type { ReviewEvent } from '@learn/shared';
import { useMemo } from 'react';
import type { SubjectModel } from '../content/subject';
import { getModule } from '../modules/registry';
import type { ActivityResult } from '../modules/types';
import { Empty } from '../modules/ui';

// Validates a step config against its module and mounts the module's player.
export function ActivityRunner({ subject, module: moduleId, config, stepId, onReview, onComplete, onFinish }: {
  subject: SubjectModel;
  module: string;
  config: unknown;
  stepId?: string;
  onReview(e: ReviewEvent): void;
  onComplete?(r: ActivityResult): void;
  onFinish(r: ActivityResult): void;
}) {
  const mod = getModule(moduleId);
  const parsed = useMemo(() => mod?.configSchema.safeParse(config), [mod, config]);
  if (!mod) return <Empty>Module inconnu : {moduleId}</Empty>;
  if (!parsed?.success) {
    return <Empty>Configuration invalide pour « {mod.label} » : {parsed?.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(', ')}</Empty>;
  }
  return <mod.Player subject={subject} config={parsed.data} stepId={stepId} onReview={onReview} onComplete={onComplete} onFinish={onFinish} />;
}
