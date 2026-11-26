import type { Hand } from '@learn/shared';
import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../../components/Modal';
import { PHONE, useMedia } from '../../../lib/useMedia';
import { TEXT } from './Numbers';
import { compactLines, handLetter, type Part } from './numbers';

// The numbers of one part, large: a hand, or both, one view at a time. The
// parts follow each other with the arrows.

type View = Hand | 'both';
const VIEWS: { value: View; label: string }[] = [{ value: 'left', label: 'Main gauche' }, { value: 'both', label: 'Les deux' }, { value: 'right', label: 'Main droite' }];
// Opened again on the view last chosen.
let last: View = 'both';

export function PartNumbers({ parts, start, onClose }: { parts: Part[]; start: number; onClose(): void }) {
  const [index, setIndex] = useState(start);
  const part = parts[index] ?? parts[0];
  const go = (by: number) => setIndex((i) => Math.max(0, Math.min(parts.length - 1, i + by)));
  // ← and → too.
  const keys = useRef(go);
  keys.current = go;
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        keys.current(e.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    window.addEventListener('keydown', down, true);
    return () => window.removeEventListener('keydown', down, true);
  }, []);
  const [view, setView] = useState<View>(last);
  const phone = useMedia(PHONE);
  const show = (v: View) => {
    last = v;
    setView(v);
  };
  const of = (v: View): Part => (v === 'both' ? part : { ...part, rows: part.rows.filter((r) => r.hand === v) });
  const width = phone ? 22 : 40;

  return (
    <Modal
      title={(
        <span className="flex items-center gap-1">
          <Arrow label="Partie précédente (←)" disabled={index === 0} onClick={() => go(-1)}>‹</Arrow>
          {/* As in the timeline of the player. */}
          <span title={`Partie ${part.label}`} className="flex h-8 min-w-24 items-center justify-center rounded bg-neutral-100 px-3 text-sm font-semibold text-neutral-500">{part.label}</span>
          <Arrow label="Partie suivante (→)" disabled={index === parts.length - 1} onClick={() => go(1)}>›</Arrow>
        </span>
      )}
      onClose={onClose}
      width="lg"
      centered
    >
      <div role="tablist" className="-mt-1 mb-5 flex border-b border-neutral-200">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            role="tab"
            aria-selected={view === v.value}
            onClick={() => show(v.value)}
            className={`-mb-px flex-1 border-b-2 px-2 py-2 text-sm font-medium transition-colors ${view === v.value ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-700'}`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {/* All three in the same place, only one seen: as big as the biggest, whichever is shown. */}
      <div className="grid">
        {VIEWS.map((v) => (
          <div key={v.value} className={`[grid-area:1/1] ${v.value === view ? '' : 'invisible'}`} aria-hidden={v.value !== view}>
            <Lines part={of(v.value)} both={v.value === 'both'} width={width} empty={v.value === 'both' ? 'Rien à jouer dans cette partie.' : 'Cette main ne joue pas dans cette partie.'} />
          </div>
        ))}
      </div>
    </Modal>
  );
}

function Arrow({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick(): void; children: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-25 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}

function Lines({ part, both, width, empty }: { part: Part; both: boolean; width: number; empty: string }) {
  if (!part.rows.length) return <p className="py-6 text-center text-sm text-neutral-400">{empty}</p>;
  return (
    <div className="space-y-5 font-mono text-lg leading-relaxed phone:text-base">
      {compactLines(part, width).map((line, k) => (
        <div key={k} className="overflow-x-auto [scrollbar-width:none]">
          {part.rows.map((row, r) => (
            <div key={row.hand} className="flex whitespace-pre">
              {both && <span className="shrink-0 text-neutral-300">{handLetter(row.hand)}  </span>}
              {line.map((m) => (
                <span key={m.step} className={`shrink-0 font-semibold ${TEXT[row.hand]}`} style={{ width: `${m.width}ch` }}>{m.texts[r]}</span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
