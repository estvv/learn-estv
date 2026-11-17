import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { accent, type Accent } from '../lib/theme';

// Classes and building blocks shared across pages, in the house style of the
// other *-estv apps (neutral palette, rounded-lg, white panels on #fafafa).
export const primaryButton =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
export const secondaryButton =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
export const ghostButton =
  'inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors';
export const dangerButton =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40';
export const panel = 'rounded-xl border border-neutral-200 bg-white shadow-sm';
// Clickable card: lifts on hover, like quizz-estv and music-estv.
export const card = `${panel} hover:shadow-md hover:-translate-y-0.5 transition-all`;

export function Page({ children, width = 'md' }: { children: ReactNode; width?: 'sm' | 'md' | 'lg' }) {
  const max = { sm: 'max-w-md', md: 'max-w-3xl', lg: 'max-w-5xl' }[width];
  return <main className={`${max} mx-auto px-4 py-8 md:py-10`}>{children}</main>;
}

export function PageHeader({ title, subtitle, icon, accent: a = 'neutral', actions, back }: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  accent?: Accent;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="mb-8">
      {back && <div className="mb-3 text-sm">{back}</div>}
      <div className="flex flex-wrap items-start gap-4">
        {icon && <IconTile icon={icon} accent={a} size="lg" />}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{title}</h1>
          {subtitle && <p className="text-neutral-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-3">
      <h2 className="text-sm font-semibold text-neutral-500">{children}</h2>
      {aside}
    </div>
  );
}

export function IconTile({ icon, accent: a, size = 'md' }: { icon: ReactNode; accent: Accent; size?: 'md' | 'lg' }) {
  return (
    <span className={`${size === 'lg' ? 'w-12 h-12 text-lg' : 'w-10 h-10'} shrink-0 rounded-lg flex items-center justify-center font-bold ${accent(a).tile}`}>
      {icon}
    </span>
  );
}

export function Badge({ children, accent: a = 'neutral' }: { children: ReactNode; accent?: Accent }) {
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${accent(a).badge}`}>{children}</span>;
}

export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <div className="text-xl font-bold text-neutral-900 tabular-nums">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
      {sub && <div className="text-xs text-neutral-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export function Bar({ value, accent: a = 'neutral', className = '' }: { value: number; accent?: Accent; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 ${className}`}>
      <div className={`h-full rounded-full transition-all ${a === 'neutral' ? 'bg-neutral-900' : accent(a).solid}`} style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </div>
  );
}

// "Piano / Le clavier / Quiz" above activity pages.
export function Breadcrumb({ items }: { items: { label: ReactNode; to?: string }[] }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-x-2 text-sm text-neutral-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-neutral-300">/</span>}
          {item.to ? <Link to={item.to} className="hover:text-neutral-900">{item.label}</Link> : <span className="text-neutral-900">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function LoadingState() {
  return <div className="py-12 text-center text-sm text-neutral-400">Chargement…</div>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-red-600">{children}</p>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className={`${panel} px-6 py-10 text-center text-sm text-neutral-500`}>{children}</div>;
}
