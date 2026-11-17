import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ghostButton, panel, primaryButton, secondaryButton } from '../components/ui';

// Widgets for activity players, built on the shared house style.

const variants = {
  primary: primaryButton,
  secondary: secondaryButton,
  ghost: ghostButton,
  danger: 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-600 hover:bg-red-50 transition-colors',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button type="button" {...props} className={`${variants[variant]} ${className}`} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="ml-1 rounded border border-current/30 px-1 text-[10px] font-medium opacity-60">{children}</kbd>;
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 ${className}`}>
      <div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className={`${panel} px-6 py-10 text-center text-sm text-neutral-500`}>{children}</div>;
}

// A white card for the activity content (question, card face…).
export function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${panel} p-6 ${className}`}>{children}</div>;
}

export function Summary({ score, total, correct, passed, children }: { score?: number; total?: number; correct?: number; passed: boolean; children?: ReactNode }) {
  return (
    <div className={`${panel} p-8 text-center`}>
      <div className="text-4xl font-bold tabular-nums">{score !== undefined ? `${Math.round(score * 100)} %` : '✓'}</div>
      {total !== undefined && <div className="mt-1 text-sm text-neutral-500">{correct} / {total} bonnes réponses</div>}
      <div className={`mt-3 text-sm font-medium ${passed ? 'text-emerald-600' : 'text-neutral-600'}`}>
        {passed ? 'Étape validée' : 'Pas encore validée : recommence quand tu veux'}
      </div>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
