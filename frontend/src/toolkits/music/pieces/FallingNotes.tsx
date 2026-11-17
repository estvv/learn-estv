import { useEffect, useRef } from 'react';
import { keyLayout } from '../keyGeometry';
import type { PiecePlayer } from './player';

// Notes falling towards the keyboard below: a note reaches the bottom edge
// when it must be played. Drawn on a canvas every animation frame.

const LOOKAHEAD = 3; // seconds visible above the keyboard, at normal tempo
const COLORS = {
  right: { fill: '#0ea5e9', active: '#0284c7' }, // sky
  left: { fill: '#f59e0b', active: '#d97706' }, // amber
  none: { fill: '#8b5cf6', active: '#7c3aed' }, // violet
};

export function FallingNotes({ player, from, to }: { player: PiecePlayer; from: number; to: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext('2d')!;
    const layout = keyLayout(from, to);
    let raf = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth: w, clientHeight: h } = el;
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr);
        el.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Faint guide on every C.
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      for (const [midi, box] of layout) if (midi % 12 === 0) ctx.fillRect(box.x * w, 0, 1, h);

      const pos = player.position;
      const span = LOOKAHEAD * player.rate;
      const pps = h / span;
      const expected = new Set(player.state.get().expected.map((n) => n.midi));

      for (const n of player.notes) {
        if (n.time > pos + span) break;
        if (n.time + n.duration < pos) continue;
        const box = layout.get(n.midi);
        if (!box) continue;
        const bottom = h - (n.time - pos) * pps;
        const top = bottom - n.duration * pps;
        const color = COLORS[n.hand ?? 'none'];
        const active = n.time <= pos + 0.001 && (expected.size === 0 || expected.has(n.midi));
        ctx.fillStyle = active ? color.active : color.fill;
        ctx.globalAlpha = box.black ? 1 : 0.85;
        const x = box.x * w + 1.5;
        const width = Math.max(3, box.width * w - 3);
        const y = Math.max(-4, top);
        const height = Math.max(4, Math.min(h, bottom) - y);
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, Math.min(5, width / 3));
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [player, from, to]);

  return <canvas ref={canvas} className="block h-full w-full" />;
}
