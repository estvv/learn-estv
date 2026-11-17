import type { PieceNote } from '@learn/shared';
import { useEffect, useRef } from 'react';
import { keyLayout } from '../keyGeometry';
import type { PiecePlayer } from './player';

// Notes falling towards the keyboard below: a note reaches the bottom edge
// when it must be played. Drawn on a canvas every animation frame.
//
// In the editor (`edit` given) the notes can be picked: click a note (Shift
// adds or removes it), drag over empty space to pick every note in a box,
// scroll to move through the piece.

const LOOKAHEAD = 3; // seconds visible above the keyboard, at normal tempo
const COLORS = {
  right: { fill: '#0ea5e9', active: '#0284c7' }, // sky
  left: { fill: '#f59e0b', active: '#d97706' }, // amber
  none: { fill: '#8b5cf6', active: '#7c3aed' }, // violet
};
const SELECTED = '#171717';

export interface NotePicking {
  selected: Set<number>;
  // Ids of the notes picked; `add`: Shift held, toggle them in the selection.
  onPick(ids: number[], add: boolean): void;
  // The place in the piece changed (scrolling).
  onScroll(): void;
}

type Rect = { x: number; y: number; width: number; height: number };
const idOf = (n: PieceNote) => (n as PieceNote & { id?: number }).id;

export function FallingNotes({ player, from, to, edit }: { player: PiecePlayer; from: number; to: number; edit?: NotePicking }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Read by the drawing loop and the pointer handlers without restarting them.
  const editRef = useRef(edit);
  editRef.current = edit;
  const box = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  // Where a note is drawn, in CSS pixels; null when out of view.
  const geometry = useRef<(n: PieceNote) => Rect | null>(() => null);

  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext('2d')!;
    const layout = keyLayout(from, to);
    let raf = 0;

    geometry.current = (n) => {
      const { clientWidth: w, clientHeight: h } = el;
      const keyBox = layout.get(n.midi);
      const pos = player.position;
      const span = LOOKAHEAD * player.rate;
      if (!keyBox || n.time > pos + span || n.time + n.duration < pos) return null;
      const pps = h / span;
      const bottom = h - (n.time - pos) * pps;
      const top = bottom - n.duration * pps;
      const x = keyBox.x * w + 1.5;
      const width = Math.max(3, keyBox.width * w - 3);
      const y = Math.max(-4, top);
      return { x, y, width, height: Math.max(4, Math.min(h, bottom) - y) };
    };

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
      for (const [midi, b] of layout) if (midi % 12 === 0) ctx.fillRect(b.x * w, 0, 1, h);

      const pos = player.position;
      const span = LOOKAHEAD * player.rate;
      const expected = new Set(player.state.get().expected.map((n) => n.midi));
      const selected = editRef.current?.selected;

      for (const n of player.notes) {
        if (n.time > pos + span) break;
        const r = geometry.current(n);
        if (!r) continue;
        const color = COLORS[n.hand ?? 'none'];
        const active = n.time <= pos + 0.001 && (expected.size === 0 || expected.has(n.midi));
        const isSelected = !!selected && selected.has(idOf(n)!);
        ctx.fillStyle = active ? color.active : color.fill;
        ctx.globalAlpha = layout.get(n.midi)!.black ? 1 : 0.85;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.width, r.height, Math.min(5, r.width / 3));
        ctx.fill();
        if (isSelected) {
          ctx.globalAlpha = 1;
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = SELECTED;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      const b = box.current;
      if (b) {
        ctx.fillStyle = 'rgba(14,165,233,0.12)';
        ctx.strokeStyle = 'rgba(2,132,199,0.8)';
        ctx.lineWidth = 1;
        const [x, y, bw, bh] = [Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0)];
        ctx.fillRect(x, y, bw, bh);
        ctx.strokeRect(x + 0.5, y + 0.5, bw, bh);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // Scrolling moves through the piece; React's wheel listener is passive.
    const onWheel = (e: WheelEvent) => {
      if (!editRef.current) return;
      e.preventDefault();
      const pps = el.clientHeight / (LOOKAHEAD * player.rate);
      player.seek(player.position - e.deltaY / pps);
      editRef.current.onScroll();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('wheel', onWheel);
    };
  }, [player, from, to]);

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // Topmost note under a point: notes are drawn in order, so search backwards.
  const noteAt = (x: number, y: number) => {
    for (let i = player.notes.length - 1; i >= 0; i--) {
      const r = geometry.current(player.notes[i]);
      if (r && x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) return player.notes[i];
    }
    return null;
  };

  return (
    <canvas
      ref={canvas}
      className={`block h-full w-full ${edit ? 'cursor-crosshair touch-none' : ''}`}
      onPointerDown={edit && ((e) => {
        const { x, y } = point(e);
        const hit = noteAt(x, y);
        if (hit) return edit.onPick([idOf(hit)!], e.shiftKey);
        e.currentTarget.setPointerCapture(e.pointerId);
        box.current = { x0: x, y0: y, x1: x, y1: y };
      })}
      onPointerMove={edit && ((e) => {
        if (!box.current) return;
        const { x, y } = point(e);
        box.current = { ...box.current, x1: x, y1: y };
      })}
      onPointerUp={edit && ((e) => {
        const b = box.current;
        box.current = null;
        if (!b) return;
        const [left, right, top, bottom] = [Math.min(b.x0, b.x1), Math.max(b.x0, b.x1), Math.min(b.y0, b.y1), Math.max(b.y0, b.y1)];
        // A click on empty space (no real box) clears the selection.
        if (right - left < 4 && bottom - top < 4) return void (!e.shiftKey && edit.onPick([], false));
        const ids: number[] = [];
        for (const n of player.notes) {
          const r = geometry.current(n);
          if (r && r.x < right && r.x + r.width > left && r.y < bottom && r.y + r.height > top) ids.push(idOf(n)!);
        }
        edit.onPick(ids, e.shiftKey);
      })}
    />
  );
}
