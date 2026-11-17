import type { Accent } from '@learn/shared';

export type { Accent };

// One accent colour per subject, used everywhere it appears (tile, badge,
// bars). Literal class strings so Tailwind's scanner sees them; same palette
// as music-estv.
export interface AccentClasses {
  tile: string;
  badge: string;
  solid: string;
  text: string;
}

const ACCENTS: Record<Accent, AccentClasses> = {
  emerald: { tile: 'bg-emerald-50 text-emerald-600', badge: 'bg-emerald-50 text-emerald-700', solid: 'bg-emerald-500', text: 'text-emerald-700' },
  teal: { tile: 'bg-teal-50 text-teal-600', badge: 'bg-teal-50 text-teal-700', solid: 'bg-teal-500', text: 'text-teal-700' },
  blue: { tile: 'bg-blue-50 text-blue-600', badge: 'bg-blue-50 text-blue-700', solid: 'bg-blue-500', text: 'text-blue-700' },
  violet: { tile: 'bg-violet-50 text-violet-600', badge: 'bg-violet-50 text-violet-700', solid: 'bg-violet-500', text: 'text-violet-700' },
  rose: { tile: 'bg-rose-50 text-rose-600', badge: 'bg-rose-50 text-rose-700', solid: 'bg-rose-500', text: 'text-rose-700' },
  amber: { tile: 'bg-amber-50 text-amber-600', badge: 'bg-amber-50 text-amber-700', solid: 'bg-amber-500', text: 'text-amber-700' },
  neutral: { tile: 'bg-neutral-100 text-neutral-600', badge: 'bg-neutral-100 text-neutral-600', solid: 'bg-neutral-500', text: 'text-neutral-700' },
};

export const accent = (a: Accent | string | undefined): AccentClasses => ACCENTS[(a as Accent) in ACCENTS ? (a as Accent) : 'neutral'];

// Heatmap intensity, from no activity to a lot.
export const HEAT = ['bg-neutral-100', 'bg-emerald-200', 'bg-emerald-300', 'bg-emerald-500', 'bg-emerald-700'];
