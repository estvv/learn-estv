import type { PieceNote } from '@learn/shared';
import { useEffect, useRef } from 'react';
import { keyLayout } from '../keyGeometry';
import type { PiecePlayer } from './player';

// Notes falling towards the keyboard below: a note reaches the bottom edge
// when it must be played. Drawn on a canvas every animation frame.

const LOOKAHEAD = 3; // seconds visible above the keyboard, at normal tempo
// Pale while they come, strong while they sound; a little darker on black keys.
const COLORS = {
  right: { fill: '#bae6fd', black: '#7dd3fc', active: '#0ea5e9', text: '#0c4a6e' }, // sky
  left: { fill: '#fde68a', black: '#fcd34d', active: '#f59e0b', text: '#78350f' }, // amber
  none: { fill: '#ddd6fe', black: '#c4b5fd', active: '#8b5cf6', text: '#4c1d95' }, // violet
};
// White keys' notes leave room to the black keys' ones.
const WHITE_INSET = 0.16;
const FONT = (size: number) => `700 ${size}px "Plus Jakarta Sans", sans-serif`;

export function FallingNotes({ player, from, to, numbers, parts }: {
  player: PiecePlayer;
  from: number;
  to: number;
  // Written on the notes, and where they start again at 1 (see numbers.ts).
  numbers?: ReadonlyMap<PieceNote, number>;
  parts?: { start: number; label: string }[];
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Read by the drawing loop without restarting it.
  const numbersRef = useRef({ numbers, parts });
  numbersRef.current = { numbers, parts };
  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext('2d')!;
    const layout = keyLayout(from, to);
    let raf = 0;

    // Where a note is drawn, in CSS pixels; null when out of view.
    const place = (n: PieceNote) => {
      const { clientWidth: w, clientHeight: h } = el;
      const keyBox = layout.get(n.midi);
      const pos = player.position;
      const span = LOOKAHEAD * player.rate;
      if (!keyBox || n.time > pos + span || n.time + n.duration < pos) return null;
      const pps = h / span;
      const bottom = h - (n.time - pos) * pps;
      const top = bottom - n.duration * pps;
      // Thin keys (a whole keyboard on a phone) keep almost all their width.
      const gap = keyBox.black ? Math.min(1, keyBox.width * w * 0.1) : keyBox.width * w * WHITE_INSET;
      const x = keyBox.x * w + gap;
      const width = Math.max(3, keyBox.width * w - 2 * gap);
      const y = Math.max(-4, top);
      return { x, y, width, height: Math.max(4, Math.min(h, bottom) - y) };
    };

    const draw = () => {
      const { clientWidth: w, clientHeight: h } = el;
      // A wide keyboard on a sharp phone screen would be a huge canvas.
      const dpr = Math.min(window.devicePixelRatio || 1, Math.max(1, 5120 / w));
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr);
        el.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Faint guide on every C.
      ctx.fillStyle = 'rgba(0,0,0,0.035)';
      for (const [midi, b] of layout) if (midi % 12 === 0) ctx.fillRect(b.x * w, 0, 1, h);

      const pos = player.position;
      const span = LOOKAHEAD * player.rate;
      const expected = new Set(player.state.get().expected.map((n) => n.midi));

      // Where a part begins.
      const { numbers: numbered, parts: cuts } = numbersRef.current;
      ctx.textBaseline = 'middle';
      for (const cut of cuts ?? []) {
        if (cut.start <= pos || cut.start > pos + span) continue;
        const y = h - (cut.start - pos) * (h / span);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, y, w, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.font = FONT(12);
        ctx.textAlign = 'left';
        ctx.fillText(cut.label, 2, y - 9);
      }
      const labels: { text: string; x: number; y: number; size: number; color: string }[] = [];

      for (const n of player.notes) {
        if (n.time > pos + span) break;
        const r = place(n);
        if (!r) continue;
        const color = COLORS[n.hand ?? 'none'];
        const active = n.time <= pos + 0.001 && (expected.size === 0 || expected.has(n.midi));
        const number = numbered?.get(n);
        const size = Math.round(Math.min(17, Math.max(10, r.width * 0.5)));
        // Tall enough for its number.
        if (number !== undefined && r.height < size + 6) {
          r.y -= size + 6 - r.height;
          r.height = size + 6;
        }
        ctx.fillStyle = active ? color.active : layout.get(n.midi)!.black ? color.black : color.fill;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.width, r.height, Math.min(6, r.width / 3));
        ctx.fill();
        if (number !== undefined) {
          labels.push({ text: String(number), x: r.x + r.width / 2, y: r.y + r.height - size * 0.55 - 3, size, color: active ? '#fff' : color.text });
        }
      }
      ctx.globalAlpha = 1;

      // Above all the notes.
      ctx.textAlign = 'center';
      for (const l of labels) {
        ctx.font = FONT(l.size);
        ctx.fillStyle = l.color;
        ctx.fillText(l.text, l.x, l.y);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(raf);
  }, [player, from, to]);

  return <canvas ref={canvas} className="block h-full w-full" />;
}
