import { Link } from 'react-router';
import { ArrowRightIcon } from '../components/icons';
import { SubjectImage } from '../components/SubjectImage';
import { Badge, Bar, card, EmptyState, ErrorText, Page, panel, primaryButton, SectionTitle } from '../components/ui';
import { recentSteps, relativeDay, useOverview, type SubjectOverview } from '../content/overview';
import { stepUrl } from './SubjectPage';

export function HomePage() {
  const { subjects, error } = useOverview();

  if (error) return <Page width="lg"><ErrorText>{error}</ErrorText></Page>;

  const started = subjects?.filter((s) => s.started) ?? [];
  const recent = subjects ? recentSteps(subjects) : [];

  return (
    <Page width="lg">
      <div className="space-y-8">
        {!subjects ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className={`${panel} h-56 animate-pulse`} />)}
          </div>
        ) : subjects.length === 0 ? (
          <EmptyState>Aucun sujet pour l’instant.</EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {subjects.map((s) => <SubjectTile key={s.summary.id} subject={s} />)}
          </div>
        )}

        {subjects && (
          <div className="grid items-start gap-6 lg:grid-cols-3">
            <section className="min-w-0 lg:col-span-2">
              <SectionTitle>Continuer</SectionTitle>
              {started.length === 0 ? (
                <EmptyState>Choisis un sujet au-dessus pour commencer son parcours.</EmptyState>
              ) : (
                <div className="space-y-3">
                  {started.map((s) => <ContinueRow key={s.summary.id} subject={s} />)}
                </div>
              )}
            </section>
            <section className="min-w-0">
              <SectionTitle>Activité récente</SectionTitle>
              {recent.length === 0 ? (
                <EmptyState>Rien pour l’instant.</EmptyState>
              ) : (
                <ol className={`${panel} divide-y divide-neutral-100 overflow-hidden`}>
                  {recent.map((r) => (
                    <li key={r.step.fullId}>
                      <Link to={stepUrl(r.subject.model.id, r.step)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50">
                        <SubjectImage id={r.subject.summary.id} name={r.subject.summary.name} accent={r.subject.summary.accent} className="h-7.5 w-12 rounded-md" text="text-xs" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-neutral-900">{r.step.step.title}</span>
                          <span className="block text-xs text-neutral-400">{relativeDay(r.completedAt)}</span>
                        </span>
                        {r.score !== null && <span className="text-sm font-semibold tabular-nums text-neutral-500">{Math.round(r.score * 100)} %</span>}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </div>
    </Page>
  );
}

function SubjectTile({ subject: s }: { subject: SubjectOverview }) {
  return (
    <Link to={s.model.practiceOnly ? `/s/${s.summary.id}/pratique` : `/s/${s.summary.id}`} className={`${card} relative block overflow-hidden`}>
      <SubjectImage id={s.summary.id} name={s.summary.name} accent={s.summary.accent} className="aspect-[16/10] w-full" text="text-5xl" />
      {s.due > 0 && (
        <span className="absolute right-2.5 top-2.5"><Badge accent={s.summary.accent}>{s.due} à réviser</Badge></span>
      )}
      <span className="block px-4 py-3">
        <span className="block font-semibold text-neutral-900">{s.summary.name}</span>
        <span className="mt-0.5 hidden text-xs text-neutral-500 sm:block">
          {s.model.practiceOnly ? 'Pratique' : s.started ? `${s.stepsDone} / ${s.stepsTotal} étapes` : `${s.stepsTotal} étapes · ${s.summary.lessons} leçons`}
        </span>
      </span>
    </Link>
  );
}

function ContinueRow({ subject: s }: { subject: SubjectOverview }) {
  return (
    <div className={`${panel} flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3`}>
      <SubjectImage id={s.summary.id} name={s.summary.name} accent={s.summary.accent} className="h-10 w-16 rounded-lg" text="text-base" />
      <div className="min-w-40 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-semibold text-neutral-900">{s.summary.name}</p>
          <span className="text-xs tabular-nums text-neutral-400">{s.stepsDone}/{s.stepsTotal}</span>
        </div>
        <p className="truncate text-xs text-neutral-500">{s.next ? `Prochaine étape : ${s.next.step.title}` : 'Parcours terminé'}</p>
        <Bar value={s.stepsTotal ? s.stepsDone / s.stepsTotal : 0} accent={s.summary.accent} className="mt-2" />
      </div>
      <div className="ml-auto flex shrink-0 gap-2">
        {s.due > 0 && (
          <Link to={`/s/${s.summary.id}/revisions`} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Réviser <Badge accent={s.summary.accent}>{s.due}</Badge>
          </Link>
        )}
        {s.next && (
          <Link to={stepUrl(s.summary.id, s.next)} className={primaryButton}>
            Continuer <ArrowRightIcon className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
