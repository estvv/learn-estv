import { Link, useParams } from 'react-router';
import { Markdown } from '../components/Markdown';
import { Breadcrumb, EmptyState, ErrorText, LoadingState, Page, panel } from '../components/ui';
import { useSubject } from '../content/useSubject';

export function LessonPage() {
  const { subject, lesson: lessonId } = useParams();
  const { pack, error } = useSubject(subject);
  if (error) return <Page><ErrorText>{error}</ErrorText></Page>;
  if (!pack) return <LoadingState />;
  const lesson = pack.lessons.find((l) => l.id === lessonId);
  if (!lesson) return <Page><EmptyState>Leçon introuvable. <Link to={`/s/${pack.subject.id}`} className="underline">Retour</Link></EmptyState></Page>;
  return (
    <Page>
      <Breadcrumb items={[{ label: pack.subject.name, to: `/s/${pack.subject.id}` }, { label: 'Leçons' }]} />
      <article className={`${panel} p-6 md:p-10`}>
        <h1 className="mb-6 text-2xl font-bold md:text-3xl">{lesson.title}</h1>
        <Markdown>{lesson.markdown}</Markdown>
      </article>
    </Page>
  );
}
