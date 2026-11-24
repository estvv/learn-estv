import { stepFullId } from '@learn/shared';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { SubjectModel } from '../content/subject';
import { useSubject } from '../content/useSubject';
import type { ActivityResult } from '../modules/types';
import { Breadcrumb, EmptyState, ErrorText, LoadingState, Page, panel } from '../components/ui';
import { getModule } from '../modules/registry';
import { Button } from '../modules/ui';
import { useSubjectProgress } from '../progress/useProgress';
import { ActivityRunner } from './ActivityRunner';
import { stepUrl } from './SubjectPage';

export function StepPage() {
  const { subject: subjectId, path, unit, step } = useParams();
  const { pack, error } = useSubject(subjectId);
  const { record, completeStep } = useSubjectProgress(subjectId);
  const navigate = useNavigate();
  const model = useMemo(() => (pack ? new SubjectModel(pack) : null), [pack]);
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<ActivityResult | null>(null);

  if (error) return <Page><ErrorText>{error}</ErrorText></Page>;
  if (!pack || !model) return <LoadingState />;

  const steps = model.steps();
  const index = steps.findIndex((s) => s.pathId === path && s.unitId === unit && s.step.id === step);
  if (index < 0) return <Page><EmptyState>Étape introuvable.</EmptyState></Page>;
  const current = steps[index];
  const next = steps.slice(index + 1).find((s) => !s.step.config.challenge) ?? steps[index + 1];
  const unitName = pack.paths.find((p) => p.id === path)?.units.find((u) => u.id === unit)?.name;

  const complete = (r: ActivityResult) => {
    if (r.passed) void completeStep(stepFullId(model.id, current.pathId, current.unitId, current.step.id), r.score);
  };
  const finish = (r: ActivityResult) => {
    complete(r);
    // A lesson or an exercise has nothing to summarise: go straight on.
    if (['lesson', 'code'].includes(current.step.module) && next) {
      navigate(stepUrl(model.id, next));
      return;
    }
    setResult(r);
  };

  return (
    <Page width={getModule(current.step.module)?.wide ? 'full' : 'md'}>
      <Breadcrumb items={[{ label: pack.subject.name, to: `/s/${model.id}` }, { label: unitName, to: `/s/${model.id}` }, { label: current.step.title }]} />

      {result ? (
        <div className={`${panel} flex flex-wrap justify-center gap-2 p-5 sm:p-8`}>
          <div className="w-full text-center text-lg font-semibold">
            {result.passed ? 'Étape terminée' : 'Pas encore validée'}
            {result.score !== undefined && <span className="ml-2 text-neutral-500">({Math.round(result.score * 100)} %)</span>}
          </div>
          <Button variant="secondary" onClick={() => { setResult(null); setRun((r) => r + 1); }}>Recommencer</Button>
          {next && <Button onClick={() => { setResult(null); navigate(stepUrl(model.id, next)); }}>Étape suivante : {next.step.title}</Button>}
          <Button variant="ghost" onClick={() => navigate(`/s/${model.id}`)}>Retour au parcours</Button>
        </div>
      ) : (
        <ActivityRunner
          key={`${current.fullId}#${run}`}
          subject={model}
          module={current.step.module}
          config={current.step.config}
          stepId={current.fullId}
          onReview={(e) => void record([e])}
          onComplete={complete}
          onFinish={finish}
        />
      )}
    </Page>
  );
}
