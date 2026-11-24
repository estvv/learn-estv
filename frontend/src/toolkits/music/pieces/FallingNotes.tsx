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
// Pale while they come, strong while they sound; a little darker on black keys.
const COLORS = {
  right: { fill: '#bae6fd', black: '#7dd3fc', active: '#0ea5e9', text: '#0c4a6e' }, // sky
  left: { fill: '#fde68a', black: '#fcd34d', active: '#f59e0b', text: '#78350f' }, // amber
  none: { fill: '#ddd6fe', black: '#c4b5fd', active: '#8b5cf6', text: '#4c1d95' }, // violet
};
// White keys' notes leave room to the black keys' ones.
const WHITE_INSET = 0.16;
const SELECTED = '#171717';
const FONT = (size: number) => `700 ${size}px "Plus Jakarta Sans", sans-serif`;

export interface NotePicking {
  selected: Set<number>;
  // Ids of the notes picked; `add`: Shift held, toggle them in the selection.
  onPick(ids: number[], add: boolean): void;
  // The place in the piece changed (scrolling).
  onScroll(): void;
  // A click on empty space adds a note there (a double click always does).
  adding: boolean;
  onAdd(midi: number, time: number): void;
}

type Rect = { x: number; y: number; width: number; height: number };
const idOf = (n: PieceNote) => (n as PieceNote & { id?: number }).id;

export function FallingNotes({ player, from, to, edit, numbers, parts }: {
  player: PiecePlayer;
  from: number;
  to: number;
  edit?: NotePicking;
  // Written on the notes, and where they start again at 1 (see numbers.ts).
  numbers?: ReadonlyMap<PieceNote, number>;
  parts?: { start: number; label: string }[];
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Read by the drawing loop and the pointer handlers without restarting them.
  const editRef = useRef(edit);
  editRef.current = edit;
  const numbersRef = useRef({ numbers, parts });
  numbersRef.current = { numbers, parts };
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
      const selected = editRef.current?.selected;

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
        const r = geometry.current(n);
        if (!r) continue;
        const color = COLORS[n.hand ?? 'none'];
        const active = n.time <= pos + 0.001 && (expected.size === 0 || expected.has(n.midi));
        const isSelected = !!selected && selected.has(idOf(n)!);
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
        if (isSelected) {
          ctx.globalAlpha = 1;
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = SELECTED;
          ctx.stroke();
        }
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

  // Key and time under a point, black keys first: they lie over the white ones.
  const placeAt = (x: number, y: number) => {
    const { clientWidth: w, clientHeight: h } = canvas.current!;
    let midi: number | null = null;
    for (const [m, b] of keyLayout(from, to)) {
      if (x >= b.x * w && x < (b.x + b.width) * w && (midi === null || b.black)) midi = m;
    }
    return midi === null ? null : { midi, time: Math.max(0, player.position + (h - y) / (h / (LOOKAHEAD * player.rate))) };
  };
  const addAt = (x: number, y: number) => {
    const place = placeAt(x, y);
    if (place) edit?.onAdd(place.midi, place.time);
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
      className={`block h-full w-full ${edit ? (edit.adding ? 'cursor-copy touch-none' : 'cursor-crosshair touch-none') : ''}`}
      onDoubleClick={edit && ((e) => {
        const r = canvas.current!.getBoundingClientRect();
        const [x, y] = [e.clientX - r.left, e.clientY - r.top];
        if (!edit.adding && !noteAt(x, y)) addAt(x, y);
      })}
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
        if (right - left < 4 && bottom - top < 4) {
          if (edit.adding) addAt(b.x0, b.y0);
          else if (!e.shiftKey) edit.onPick([], false);
          return;
        }
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
