import { isDue, retrievability, type Facet } from '@learn/shared';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { SubjectModel } from '../content/subject';
import { useSubject } from '../content/useSubject';
import { getModule } from '../modules/registry';
import { Breadcrumb, ErrorText, LoadingState, Page, panel, primaryButton, secondaryButton, SectionTitle } from '../components/ui';
import { Button } from '../modules/ui';
import type { SubjectProgress } from '../progress/store';
import { useSubjectProgress } from '../progress/useProgress';
import { ActivityRunner } from './ActivityRunner';

const MAX_PER_BATCH = 20;
const PRACTICE_SIZE = 10;

interface Batch {
  facet: Facet;
  ids: string[]; // local element ids
}

// Due facets first; with nothing due, the weakest seen elements (practice).
function planBatches(model: SubjectModel, progress: SubjectProgress, practice: boolean): Batch[] {
  const now = new Date();
  const prefix = `${model.id}/`;
  const byFacet = new Map<string, { id: string; r: number }[]>();
  for (const e of progress.srs.values()) {
    if (!practice && !isDue(e.card, now)) continue;
    const list = byFacet.get(e.facet) ?? [];
    list.push({ id: e.element.slice(prefix.length), r: retrievability(e.card, now) });
    byFacet.set(e.facet, list);
  }
  const batches: Batch[] = [];
  for (const [facetId, items] of byFacet) {
    const facet = model.facet(facetId);
    if (!facet?.review || !getModule(facet.review.module)?.reviewConfig) continue;
    const known = items.filter((i) => model.element(i.id)).sort((a, b) => a.r - b.r);
    const ids = known.slice(0, practice ? PRACTICE_SIZE : MAX_PER_BATCH).map((i) => i.id);
    if (ids.length) batches.push({ facet, ids });
  }
  return batches;
}

export function ReviewPage() {
  const { subject: subjectId } = useParams();
  const { pack, error } = useSubject(subjectId);
  const { progress, record } = useSubjectProgress(subjectId);
  const model = useMemo(() => (pack ? new SubjectModel(pack) : null), [pack]);
  // Planned once per session so answering does not reshuffle the queue.
  const [session, setSession] = useState<{ batches: Batch[]; practice: boolean; index: number } | null>(null);

  if (error) return <Page><ErrorText>{error}</ErrorText></Page>;
  if (!pack || !model || !progress) return <LoadingState />;

  const start = (practice: boolean) => setSession({ batches: planBatches(model, progress, practice), practice, index: 0 });
  const back = `/s/${model.id}`;
  const frame = (children: React.ReactNode) => (
    <Page>
      <Breadcrumb items={[{ label: pack.subject.name, to: back }, { label: session?.practice ? 'Entraînement' : 'Révisions' }]} />
      {children}
    </Page>
  );

  if (!session) {
    const due = planBatches(model, progress, false);
    if (due.length) return frame(<ReviewIntro batches={due} onStart={() => start(false)} />);
    const seen = progress.srs.size > 0;
    return frame(
      <div className={`${panel} p-8 text-center`}>
        <div className="text-lg font-semibold">Rien à réviser pour l’instant</div>
        <p className="mt-1 text-sm text-neutral-500">
          {seen ? 'Tu peux quand même t’entraîner sur tes éléments les plus fragiles.' : 'Commence le parcours : les éléments vus reviendront ici au bon moment.'}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {seen && <Button onClick={() => start(true)}>S’entraîner</Button>}
          <Link to={back} className={secondaryButton}>Retour au parcours</Link>
        </div>
      </div>,
    );
  }

  const batch = session.batches[session.index];
  if (!batch) {
    return frame(
      <div className={`${panel} p-8 text-center`}>
        <div className="text-lg font-semibold">Séance terminée</div>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => setSession(null)}>Encore</Button>
          <Link to={back} className={primaryButton}>Retour au parcours</Link>
        </div>
      </div>,
    );
  }

  const mod = getModule(batch.facet.review!.module)!;
  const config = mod.reviewConfig!(mod.configSchema.parse(batch.facet.review!.config), batch.ids);
  return frame(
    <>
      <SectionTitle>{batch.facet.label}</SectionTitle>
      <ActivityRunner
        key={`${session.index}`}
        subject={model}
        module={mod.id}
        config={config}
        onReview={(e) => void record([e])}
        onFinish={() => setSession({ ...session, index: session.index + 1 })}
      />
    </>,
  );
}

function ReviewIntro({ batches, onStart }: { batches: Batch[]; onStart(): void }) {
  return (
    <div className={`${panel} p-8`}>
      <div className="text-lg font-semibold">À réviser</div>
      <ul className="mt-3 space-y-1 text-sm text-neutral-600">
        {batches.map((b) => <li key={b.facet.id}>{b.facet.label} : {b.ids.length}</li>)}
      </ul>
      <Button className="mt-6" onClick={onStart}>Commencer</Button>
    </div>
  );
}
