import { lessonConfig, type LessonConfig } from '@learn/shared';
import { Markdown } from '../../components/Markdown';
import { panel } from '../../components/ui';
import type { ActivityModule, PlayerProps } from '../types';
import { Button, Empty } from '../ui';

function LessonPlayer({ subject, config, onFinish }: PlayerProps<LessonConfig>) {
  const lesson = subject.pack.lessons.find((l) => l.id === config.lesson);
  if (!lesson) return <Empty>Leçon introuvable : {config.lesson}</Empty>;
  return (
    <article className={`${panel} p-6 md:p-10`}>
      <h1 className="mb-6 text-2xl font-bold md:text-3xl">{lesson.title}</h1>
      <Markdown>{lesson.markdown}</Markdown>
      <div className="mt-10 flex justify-end border-t border-neutral-100 pt-6">
        <Button onClick={() => onFinish({ passed: true })}>J’ai terminé la leçon</Button>
      </div>
    </article>
  );
}

export const lessonModule: ActivityModule<LessonConfig> = {
  id: 'lesson',
  label: 'Leçon',
  configSchema: lessonConfig,
  Player: LessonPlayer,
};
