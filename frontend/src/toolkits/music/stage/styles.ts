import type { Hand } from '@learn/shared';
import { alpha, tone, type Tone } from './colors';
import { halo, horizontal, light, round, vertical, type Box } from './draw';
import type { Particles } from './particles';
import type { StyleId } from './settings';

type Ctx = CanvasRenderingContext2D;

export interface StageStyle {
  // Of the two hands, when the style's own colours are asked for.
  palette: Record<Hand, string>;
  // Behind everything, and around.
  page: string;
  background(ctx: Ctx, w: number, h: number, time: number): void;
  // `lit`: how much it sounds, 0 to 1.
  note(ctx: Ctx, b: Box, t: Tone, lit: number, time: number): void;
  // As a note starts, then as long as it sounds. `x`: the middle of its key,
  // `much`: how many of them.
  strike(p: Particles, x: number, y: number, w: number, color: string, much: number): void;
  hold(p: Particles, x: number, y: number, w: number, color: string, much: number): void;
}

const between = (a: number, b: number) => a + Math.random() * (b - a);
// A whole number, right on average.
const some = (n: number) => Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
const times = (n: number, what: () => void) => {
  for (let i = some(n); i > 0; i--) what();
};
// In a fan going up.
const fan = (speed: number, spread: number) => {
  const a = -Math.PI / 2 + between(-spread, spread);
  return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed };
};

function plain(ctx: Ctx, w: number, h: number, top: string, bottom: string) {
  ctx.fillStyle = vertical(ctx, { x: 0, y: 0, w, h }, [[0, top], [1, bottom]]);
  ctx.fillRect(0, 0, w, h);
}

const neon: StageStyle = {
  palette: { left: '#ff2d95', right: '#22e5ff' },
  page: '#05050a',
  background: (ctx, w, h) => plain(ctx, w, h, '#05050a', '#0a0714'),
  note(ctx, b, t, lit, time) {
    round(ctx, b, 8);
    ctx.fillStyle = alpha(t, 0.1 + 0.5 * lit);
    ctx.fill();
    halo(ctx, t, 0.8 + 1.6 * lit + 0.1 * Math.sin(time * 6 + b.x));
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = t.main;
    ctx.stroke();
    // The gas, in the middle of the tube.
    ctx.lineWidth = 1;
    ctx.strokeStyle = t.hot;
    ctx.stroke();
  },
  strike(p, x, y, w, color, much) {
    times(16 * much, () => p.add({ kind: 'dust', color, x: x + between(-w / 2, w / 2), y, ...fan(between(120, 420), 1), size: between(1, 2.6), life: between(0.4, 1), turn: 0 }));
    p.add({ kind: 'ring', color, x, y, vx: 0, vy: 0, size: w * 0.5, life: 0.5, turn: 0 });
  },
  hold(p, x, y, w, color, much) {
    times(1.1 * much, () => p.add({ kind: 'dust', color, x: x + between(-w / 2, w / 2), y, ...fan(between(60, 260), 0.5), size: between(0.8, 2), life: between(0.4, 1.1), turn: 0 }));
  },
};

// A bar cut at both ends, its faces more or less in the light.
const crystal: StageStyle = {
  palette: { left: '#ff1f45', right: '#a855f7' },
  page: '#000000',
  background(ctx, w, h) {
    plain(ctx, w, h, '#000000', '#0b0208');
  },
  note(ctx, b, t, lit) {
    const cut = Math.min(b.w * 0.42, b.h / 2);
    const { x, y, w, h } = b;
    const [l, r, top, bottom] = [x, x + w, y, y + h];
    const inner = w * 0.28;
    const shape = () => {
      ctx.beginPath();
      ctx.moveTo(l, top + cut);
      ctx.lineTo(l + inner, top);
      ctx.lineTo(r - inner, top);
      ctx.lineTo(r, top + cut);
      ctx.lineTo(r, bottom - cut);
      ctx.lineTo(r - inner, bottom);
      ctx.lineTo(l + inner, bottom);
      ctx.lineTo(l, bottom - cut);
      ctx.closePath();
    };
    const face = (points: [number, number][], fill: string | CanvasGradient) => {
      ctx.beginPath();
      points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };
    shape();
    ctx.fillStyle = 'rgba(16, 8, 28, 0.85)';
    ctx.fill();
    halo(ctx, t, 0.7 + 1.5 * lit);
    const body = { x, y: top + cut, w, h: Math.max(0, h - 2 * cut) };
    // Left, middle and right faces of the bar.
    face([[l, body.y], [l + inner, body.y], [l + inner, bottom - cut], [l, bottom - cut]], horizontal(ctx, { ...b, w: inner }, [[0, alpha(t, 0.85)], [1, alpha(t, 0.3)]]));
    face([[l + inner, body.y], [r - inner, body.y], [r - inner, bottom - cut], [l + inner, bottom - cut]], vertical(ctx, body, [[0, alpha(t, 0.2 + 0.5 * lit)], [0.5, `rgba(214, 196, 255, ${0.22 + 0.5 * lit})`], [1, alpha(t, 0.3 + 0.6 * lit)]]));
    face([[r - inner, body.y], [r, body.y], [r, bottom - cut], [r - inner, bottom - cut]], horizontal(ctx, { ...b, x: r - inner, w: inner }, [[0, alpha(t, 0.25)], [1, alpha(t, 0.6)]]));
    // The cut ends.
    for (const [edge, flat, toward] of [[top, body.y, 1], [bottom, bottom - cut, -1]]) {
      face([[l, flat], [l + inner, edge], [l + inner, flat]], toward > 0 ? t.dark : t.main);
      face([[l + inner, edge], [r - inner, edge], [r - inner, flat], [l + inner, flat]], toward > 0 ? t.main : t.light);
      face([[r - inner, edge], [r, flat], [r - inner, flat]], t.dark);
    }
    // A reflection.
    ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + 0.4 * lit})`;
    ctx.fillRect(l + inner + w * 0.06, body.y + 2, Math.max(1, w * 0.07), Math.max(0, body.h - 4));
    shape();
    ctx.lineWidth = 1;
    ctx.strokeStyle = alpha(tone(t.light), 0.5 + 0.5 * lit);
    ctx.stroke();
  },
  strike(p, x, y, w, color, much) {
    times(26 * much, () => p.add({ kind: 'dust', color, x: x + between(-w / 2, w / 2), y: y - between(0, 14), ...fan(between(60, 340), 0.8), size: between(1, 3), life: between(0.6, 1.7), turn: 0 }));
    times(1.2 * much, () => p.add({ kind: 'shard', color, x: x + between(-w, w), y: y - 10, ...fan(between(160, 330), 0.5), size: between(4, 8), life: between(0.8, 1.6), turn: 0 }));
  },
  hold(p, x, y, w, color, much) {
    times(1.6 * much, () => p.add({ kind: 'dust', color, x: x + between(-w / 2, w / 2), y, ...fan(between(50, 260), 0.5), size: between(0.8, 2.4), life: between(0.5, 1.5), turn: 0 }));
    times(0.08 * much, () => p.add({ kind: 'smoke', color, x, y, vx: between(-12, 12), vy: -30, size: w, life: between(1.2, 2.2), turn: 0 }));
  },
};

const fire: StageStyle = {
  palette: { left: '#ff3d00', right: '#ffb300' },
  page: '#070302',
  background: (ctx, w, h) => plain(ctx, w, h, '#040202', '#160703'),
  note(ctx, b, t, lit, time) {
    // Burning at its foot, its edges moving.
    const waves = Math.max(2, Math.round(b.h / 14));
    const wave = (i: number, side: number) => Math.sin(i * 1.7 + time * (5 + 5 * lit) + side * 2 + b.x) * b.w * (0.03 + 0.05 * lit);
    const trace = () => {
      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2, b.y - b.w * 0.25);
      for (let i = 0; i <= waves; i++) ctx.lineTo(b.x + b.w + wave(i, 1), b.y + (b.h * i) / waves);
      for (let i = waves; i >= 0; i--) ctx.lineTo(b.x + wave(i, 0), b.y + (b.h * i) / waves);
      ctx.closePath();
    };
    trace();
    ctx.fillStyle = vertical(ctx, b, [[0, alpha(t, 0.15 + 0.3 * lit)], [0.45, t.main], [0.85, t.light], [1, t.hot]]);
    ctx.fill();
    halo(ctx, t, 0.8 + 1.8 * lit);
  },
  strike(p, x, y, w, color, much) {
    times(20 * much, () => p.add({ kind: 'ember', color, x: x + between(-w / 2, w / 2), y, ...fan(between(60, 300), 0.9), size: between(1.2, 3.4), life: between(0.7, 2), turn: 0 }));
    times(2 * much, () => p.add({ kind: 'smoke', color, x, y, vx: between(-20, 20), vy: -40, size: w * 0.8, life: between(1.2, 2.2), turn: 0 }));
  },
  hold(p, x, y, w, color, much) {
    times(1.5 * much, () => p.add({ kind: 'ember', color, x: x + between(-w / 2, w / 2), y, ...fan(between(30, 190), 0.5), size: between(0.8, 2.8), life: between(0.6, 1.8), turn: 0 }));
    times(0.14 * much, () => p.add({ kind: 'smoke', color, x, y, vx: between(-14, 14), vy: -40, size: w * 0.7, life: between(1, 2), turn: 0 }));
  },
};

const liquid: StageStyle = {
  palette: { left: '#ff5fa2', right: '#2dd4ff' },
  page: '#020814',
  background: (ctx, w, h) => plain(ctx, w, h, '#020814', '#04162a'),
  note(ctx, b, t, lit, time) {
    const swell = 1 + 0.1 * lit * Math.sin(time * 18);
    const box = { x: b.x + (b.w * (1 - swell)) / 2, y: b.y, w: b.w * swell, h: b.h };
    round(ctx, box, box.w / 2);
    ctx.fillStyle = horizontal(ctx, box, [[0, t.dark], [0.3, t.main], [0.7, t.light], [1, t.main]]);
    ctx.fill();
    halo(ctx, t, 0.6 + 1.5 * lit);
    // As a bubble shines.
    const shine = { x: box.x + box.w * 0.2, y: box.y + box.w * 0.22, w: box.w * 0.2, h: Math.max(box.w * 0.2, Math.min(box.h * 0.6, box.h - box.w * 0.5)) };
    round(ctx, shine, shine.w / 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + 0.3 * lit})`;
    ctx.fill();
  },
  strike(p, x, y, w, color, much) {
    times(14 * much, () => p.add({ kind: 'drop', color, x: x + between(-w / 3, w / 3), y: y - 2, ...fan(between(180, 480), 0.65), size: between(1.6, 4.2), life: between(0.7, 1.3), turn: 0 }));
    p.add({ kind: 'ring', color, x, y, vx: 0, vy: 0, size: w * 0.4, life: 0.7, turn: 0 });
    p.add({ kind: 'ring', color, x, y, vx: 0, vy: 0, size: w * 0.15, life: 0.95, turn: 0 });
  },
  hold(p, x, y, w, color, much) {
    times(0.5 * much, () => p.add({ kind: 'drop', color, x: x + between(-w / 3, w / 3), y: y - 2, ...fan(between(90, 300), 0.5), size: between(1, 2.6), life: between(0.5, 1), turn: 0 }));
  },
};

// Always the same sky.
const SKY = Array.from({ length: 150 }, (_, i) => {
  const r = (k: number) => Math.abs(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
  return { x: r(1), y: r(2), size: 0.5 + r(3) * 1.5, speed: 0.004 + r(4) * 0.014, phase: r(5) * 6 };
});

const galaxy: StageStyle = {
  palette: { left: '#b07cff', right: '#5ee7ff' },
  page: '#03030c',
  background(ctx, w, h, time) {
    plain(ctx, w, h, '#03030c', '#0c0722');
    ctx.globalCompositeOperation = 'lighter';
    light(ctx, '#5b2bd6', w * 0.25, h * 0.35, w * 0.4, h * 0.5, 0.22);
    light(ctx, '#0e6fae', w * 0.78, h * 0.55, w * 0.38, h * 0.5, 0.2);
    ctx.fillStyle = '#ffffff';
    for (const s of SKY) {
      ctx.globalAlpha = 0.25 + 0.45 * Math.abs(Math.sin(time * 0.9 + s.phase));
      ctx.fillRect(s.x * w, ((s.y + time * s.speed) % 1) * h, s.size, s.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  },
  note(ctx, b, t, lit, time) {
    // A comet: its head first, its tail behind.
    const tail = { x: b.x + b.w * 0.12, y: b.y, w: b.w * 0.76, h: b.h };
    round(ctx, tail, tail.w / 2);
    ctx.fillStyle = vertical(ctx, tail, [[0, alpha(t, 0.04 + 0.2 * lit)], [0.6, alpha(t, 0.45 + 0.3 * lit)], [1, t.light]]);
    ctx.fill();
    halo(ctx, t, 0.4 + 1.2 * lit);
    const head = b.y + b.h - b.w / 2;
    ctx.globalCompositeOperation = 'lighter';
    light(ctx, t.main, b.x + b.w / 2, head, b.w * (1.3 + 0.6 * lit), b.w * (1.3 + 0.6 * lit), 0.9);
    light(ctx, t.hot, b.x + b.w / 2, head, b.w * 0.6, b.w * 0.6, 0.85 + 0.15 * Math.sin(time * 5 + b.x));
    ctx.globalCompositeOperation = 'source-over';
  },
  strike(p, x, y, w, color, much) {
    times(14 * much, () => p.add({ kind: 'star', color, x: x + between(-w / 2, w / 2), y, ...fan(between(80, 340), 1.1), size: between(1.6, 4.4), life: between(0.8, 2), turn: between(0, 3) }));
    p.add({ kind: 'ring', color, x, y, vx: 0, vy: 0, size: w * 0.4, life: 0.8, turn: 0 });
  },
  hold(p, x, y, w, color, much) {
    times(0.7 * much, () => p.add({ kind: 'star', color, x: x + between(-w / 2, w / 2), y, ...fan(between(50, 220), 0.6), size: between(1, 2.8), life: between(0.6, 1.6), turn: between(0, 3) }));
  },
};

export const STYLES: Record<Exclude<StyleId, 'classic'>, StageStyle> = { neon, crystal, fire, liquid, galaxy };
