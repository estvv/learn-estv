import { isDue, type Accent, type Mastery } from '@learn/shared';
import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, PlayIcon, RepeatIcon } from '../components/icons';
import { SubjectLogo } from '../components/SubjectLogo';
import { Badge, Bar, ErrorText, LoadingState, Page, panel, primaryButton, secondaryButton, SectionTitle } from '../components/ui';
import { nextStepOf, SubjectModel } from '../content/subject';
import { useSubject } from '../content/useSubject';
import { accent } from '../lib/theme';
import { getModule } from '../modules/registry';
import { useSubjectProgress } from '../progress/useProgress';
import { toolkits } from '../toolkits';

export function SubjectPage() {
  const { subject: id } = useParams();
  const { pack, error } = useSubject(id);
  const { progress } = useSubjectProgress(id);
  const model = useMemo(() => (pack ? new SubjectModel(pack) : null), [pack]);

  const due = useMemo(() => {
    if (!progress) return 0;
    const now = new Date();
    return [...progress.srs.values()].filter((e) => isDue(e.card, now)).length;
  }, [progress]);

  if (error) return <Page width="lg"><ErrorText>{error}</ErrorText></Page>;
  if (!pack || !model) return <LoadingState />;
  if (model.practiceOnly) return <Navigate to={`/s/${model.id}/pratique`} replace />;

  const a = pack.subject.accent;
  const steps = model.steps();
  const done = progress ? steps.filter((s) => progress.steps.has(s.fullId)).length : 0;
  const nextStep = progress ? nextStepOf(steps, progress.steps) : undefined;
  const rootSkills = pack.skills.filter((s) => !s.parent);
  // A long course shows only where the user is.
  const long = pack.paths.reduce((n, path) => n + path.units.length, 0) > 8;

  return (
    <Page width="lg">
      <div className="mb-8">
        <Link to="/" className="text-sm text-neutral-500 hover:text-neutral-900">← Sujets</Link>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <SubjectLogo id={pack.subject.id} name={pack.subject.name} accent={a} className="h-14 w-14" text="text-xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl">{pack.subject.name}</h1>
            <p className="mt-1 text-neutral-500">{pack.subject.description}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {pack.subject.practice && toolkits.some((t) => t.id === pack.subject.practice && t.Practice) && (
              <Link to={`/s/${model.id}/pratique`} className={secondaryButton}>
                <PlayIcon className="h-4 w-4" />Pratique
              </Link>
            )}
            <Link to={`/s/${model.id}/revisions`} className={secondaryButton}>
              <RepeatIcon className="h-4 w-4" />
              {due > 0 ? <>Réviser <Badge accent={a}>{due}</Badge></> : 'S’entraîner'}
            </Link>
            {nextStep && (
              <Link to={stepUrl(model.id, nextStep)} className={primaryButton}>
                {done ? 'Continuer' : 'Commencer'} <ArrowRightIcon className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-8">
          {pack.paths.map((path) => {
            const pathSteps = steps.filter((s) => s.pathId === path.id);
            const pathDone = progress ? pathSteps.filter((s) => progress.steps.has(s.fullId)).length : 0;
            return (
              <section key={path.id}>
                <SectionTitle aside={<span className="text-xs tabular-nums text-neutral-400">{pathDone} / {pathSteps.length} étapes</span>}>
                  {path.name}
                </SectionTitle>
                <div className="space-y-4">
                  {path.units.map((unit, ui) => {
                    const unitSteps = pathSteps.filter((s) => s.unitId === unit.id);
                    const unitDone = progress ? unitSteps.filter((s) => progress.steps.has(s.fullId)).length : 0;
                    return (
                      <details key={unit.id} open={!long || (nextStep?.pathId === path.id && nextStep.unitId === unit.id)} className={`${panel} group overflow-hidden`}>
                        <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-4 hover:bg-neutral-50 group-open:border-b group-open:border-neutral-100 [&::-webkit-details-marker]:hidden">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${accent(a).tile}`}>{ui + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-neutral-900">{unit.name}</div>
                            {unit.description && <div className="text-sm text-neutral-500">{unit.description}</div>}
                          </div>
                          <span className="flex items-center gap-2 pt-1 text-xs tabular-nums text-neutral-400">
                            {unitDone === unitSteps.length && unitDone > 0 && <CheckIcon className="h-4 w-4 text-emerald-500" />}
                            {unitDone}/{unitSteps.length}
                            <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" />
                          </span>
                        </summary>
                        <ol className="divide-y divide-neutral-50">
                          {unitSteps.map((s) => {
                            const record = progress?.steps.get(s.fullId);
                            const isNext = nextStep?.fullId === s.fullId;
                            return (
                              <li key={s.fullId}>
                                <Link to={stepUrl(model.id, s)} className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-neutral-50 ${isNext ? 'bg-neutral-50' : ''}`}>
                                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                    record ? 'bg-emerald-500 text-white' : isNext ? 'border-2 border-neutral-900' : 'border border-neutral-300'
                                  }`}>
                                    {record && <CheckIcon className="h-3.5 w-3.5" />}
                                  </span>
                                  <span className={`flex-1 ${record ? 'text-neutral-500' : 'font-medium text-neutral-900'}`}>{s.step.title}</span>
                                  {record?.best_score != null && <span className="text-xs tabular-nums text-neutral-400">{Math.round(record.best_score * 100)} %</span>}
                                  <span className="w-14 text-right text-xs text-neutral-400">{s.step.config.challenge ? 'Défi' : getModule(s.step.module)?.label ?? s.step.module}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ol>
                      </details>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="space-y-8 lg:sticky lg:top-20">
          <section>
            <SectionTitle>Compétences</SectionTitle>
            <div className={`${panel} space-y-4 p-5`}>
              {rootSkills.map((root) => (
                <div key={root.id} className="space-y-2.5">
                  <SkillRow name={root.name} mastery={progress ? model.mastery(root.id, progress) : undefined} accent={a} strong />
                  {(!long || root.id === nextStep?.pathId) && pack.skills.filter((s) => s.parent === root.id).map((c) => (
                    <div key={c.id} className="pl-3">
                      <SkillRow name={c.name} mastery={progress ? model.mastery(c.id, progress) : undefined} accent={a} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
          {!long && pack.lessons.length > 0 && (
            <section>
              <SectionTitle>Leçons</SectionTitle>
              <ul className={`${panel} divide-y divide-neutral-100 overflow-hidden`}>
                {pack.lessons.map((l) => (
                  <li key={l.id}>
                    <Link to={`/s/${model.id}/lecon/${l.id}`} className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900">{l.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </Page>
  );
}

function SkillRow({ name, mastery, accent: a, strong }: { name: string; mastery?: Mastery; accent: Accent; strong?: boolean }) {
  // A skill without elements (e.g. only lessons) has nothing to measure.
  if (mastery && mastery.total === 0) {
    return <div className={`text-sm ${strong ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}>{name}</div>;
  }
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className={strong ? 'font-semibold text-neutral-900' : 'text-neutral-600'}>{name}</span>
        <span className="tabular-nums text-neutral-400">{mastery ? `${Math.round(mastery.value * 100)} %` : ''}</span>
      </div>
      <Bar value={mastery?.value ?? 0} accent={a} className="mt-1" />
    </div>
  );
}

export function stepUrl(subject: string, s: { pathId: string; unitId: string; step: { id: string } }) {
  return `/s/${subject}/etape/${s.pathId}/${s.unitId}/${s.step.id}`;
}
