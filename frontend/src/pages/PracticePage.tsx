import { Link, Navigate, useParams } from 'react-router';
import { LoadingState } from '../components/ui';
import { isPracticeOnly } from '../content/subject';
import { useSubject } from '../content/useSubject';
import { toolkits } from '../toolkits';

// A subject's free practice, full screen without the app header: the
// playground of the toolkit named by the pack's `practice` field.
export function PracticePage() {
  const { subject } = useParams();
  const { pack, error } = useSubject(subject);
  if (error) return <Navigate to="/" replace />;
  if (!pack) return <LoadingState />;
  const toolkit = toolkits.find((t) => t.id === pack.subject.practice);
  if (!toolkit?.Practice) return <Navigate to={`/s/${pack.subject.id}`} replace />;
  const back = isPracticeOnly(pack) ? { to: '/', label: 'Retour : accueil' } : { to: `/s/${pack.subject.id}`, label: `Retour : ${pack.subject.name}` };

  return (
    <div className="fixed inset-0 bg-[#fafafa]">
      <Link
        to={back.to}
        title={back.label}
        aria-label="Retour"
        className="absolute left-4 top-4 z-10 rounded-lg border border-neutral-200 bg-white p-2 text-neutral-500 shadow-sm transition-colors hover:text-neutral-900"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
      </Link>
      <toolkit.Practice subject={pack.subject.id} />
    </div>
  );
}
