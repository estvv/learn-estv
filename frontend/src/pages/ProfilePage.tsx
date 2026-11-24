import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useAuth, type User } from '../app/auth';
import { Avatar } from '../components/Avatar';
import { FlameIcon, PencilIcon } from '../components/icons';
import { SubjectImage } from '../components/SubjectImage';
import { Bar, EmptyState, ErrorText, LoadingState, Page, panel, SectionTitle, StatTile } from '../components/ui';
import { relativeDay } from '../content/overview';
import { api } from '../lib/api';
import { HEAT } from '../lib/theme';

interface Profile {
  user: User & { created_at: number };
  stats: {
    streak: { current: number; best: number; active_days: number };
    totals: { answers: number; correct_rate: number | null; elements_seen: number; elements_mastered: number; steps_done: number };
    heatmap: { day: string; count: number }[];
    subjects: { id: string; name: string; accent: string; steps_done: number; steps_total: number; elements_seen: number; elements_total: number; mastery: number }[];
    recent: { step: string; title: string; subject: string; subject_name: string; accent: string; score: number | null; completed_at: number }[];
  };
}

const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)} %`);
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export function ProfilePage() {
  const { username = '' } = useParams();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!me) return;
    setProfile(null);
    api<Profile>(`/users/${encodeURIComponent(username)}/profile`).then(setProfile, (e: Error) => setError(e.message));
  }, [username, me]);

  if (!me) return <Navigate to="/connexion" replace />;
  if (error && !profile) return <Page><ErrorText>{error}</ErrorText></Page>;
  if (!profile) return <LoadingState />;

  const { user, stats } = profile;
  const isMe = me.id === user.id;
  const since = new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <Page width="lg">
      <section className="mb-6 flex items-start gap-4 sm:mb-8 sm:gap-5">
        <Avatar url={user.avatar_url} name={user.display_name} size="xl" />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <h1 className="min-w-0 truncate text-2xl font-bold text-neutral-900">{user.display_name}</h1>
            {isMe && (
              <Link to="/compte" className="inline-flex items-center gap-1.5 self-center rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900">
                <PencilIcon className="h-3.5 w-3.5" />Modifier
              </Link>
            )}
          </div>
          <p className="text-xs text-neutral-400">
            <span className="font-medium text-neutral-500">@{user.username}</span> · inscrit en {since}
          </p>
          {stats.streak.current > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-700">
              <FlameIcon className="h-4 w-4" />{plural(stats.streak.current, 'jour')} d’affilée
            </p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Série actuelle" value={stats.streak.current} sub={`record : ${plural(stats.streak.best, 'jour')}`} />
        <StatTile label="Jours actifs" value={stats.streak.active_days} />
        <StatTile label="Réponses" value={stats.totals.answers} sub={`${pct(stats.totals.correct_rate)} de réussite`} />
        <StatTile label="Éléments maîtrisés" value={stats.totals.elements_mastered} sub={`sur ${stats.totals.elements_seen} vus`} />
      </div>

      <section className="mt-8">
        <SectionTitle>Activité</SectionTitle>
        <Heatmap days={stats.heatmap} />
      </section>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0">
          <SectionTitle>Sujets</SectionTitle>
          {stats.subjects.length === 0 ? (
            <EmptyState>Aucun sujet commencé.</EmptyState>
          ) : (
            <div className="space-y-3">
              {stats.subjects.map((s) => (
                <Link key={s.id} to={`/s/${s.id}`} className={`${panel} flex items-center gap-4 px-4 py-3 transition-shadow hover:shadow-md`}>
                  <SubjectImage id={s.id} name={s.name} accent={s.accent} className="h-10 w-16 rounded-lg" text="text-base" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-neutral-900">{s.name}</span>
                      <span className="text-xs tabular-nums text-neutral-400">maîtrise {pct(s.mastery)}</span>
                    </div>
                    <Bar value={s.mastery} accent={s.accent as never} className="mt-1.5" />
                    <div className="mt-1.5 text-xs text-neutral-500">
                      {s.steps_done}/{s.steps_total} étapes · {s.elements_seen}/{s.elements_total} éléments vus
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="min-w-0">
          <SectionTitle>Activité récente</SectionTitle>
          {stats.recent.length === 0 ? (
            <EmptyState>Rien pour l’instant.</EmptyState>
          ) : (
            <ol className={`${panel} divide-y divide-neutral-100 overflow-hidden`}>
              {stats.recent.map((r) => (
                <li key={r.step} className="flex items-center gap-3 px-4 py-2.5">
                  <SubjectImage id={r.subject} name={r.subject_name} accent={r.accent} className="h-7.5 w-12 rounded-md" text="text-xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900">{r.title}</span>
                    <span className="block text-xs text-neutral-400">{r.subject_name} · {relativeDay(r.completed_at)}</span>
                  </span>
                  {r.score !== null && <span className="text-sm font-semibold tabular-nums text-neutral-500">{Math.round(r.score * 100)} %</span>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Page>
  );
}

// GitHub-style calendar: one column per week, Monday on top.
function Heatmap({ days }: { days: { day: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
  const first = new Date(`${days[0].day}T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7; // Monday = 0
  const cells: ({ day: string; count: number } | null)[] = [...Array(offset).fill(null), ...days];
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  // On a phone the year does not fit: show the last weeks.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);
  const total = days.reduce((n, d) => n + (d.count ? 1 : 0), 0);

  return (
    <div className={`${panel} p-4`}>
      <div ref={scroller} className="overflow-x-auto">
        <div className="flex w-max gap-[3px]">
          {weeks.map((week, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {week.map((d, j) => (
                <span
                  key={j}
                  title={d ? `${new Date(`${d.day}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} : ${d.count}` : undefined}
                  className={`h-[11px] w-[11px] rounded-[3px] ${d ? HEAT[level(d.count)] : 'bg-transparent'}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
        <span>{plural(total, 'jour')} actif{total > 1 ? 's' : ''} sur l’année</span>
        <span className="flex items-center gap-1">
          Moins {HEAT.map((c) => <span key={c} className={`h-[11px] w-[11px] rounded-[3px] ${c}`} />)} Plus
        </span>
      </div>
    </div>
  );
}
