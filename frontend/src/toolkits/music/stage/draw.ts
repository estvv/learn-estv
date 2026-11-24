import { alpha, tone, type Tone } from './colors';
import { presence, type Particle } from './particles';

// Brushes shared by the styles. Light is added up ("lighter") from pictures made
// once: blurring at every picture would be far too slow.

export interface Box { x: number; y: number; w: number; h: number }
type Ctx = CanvasRenderingContext2D;

const glows = new Map<string, HTMLCanvasElement>();
const GLOW = 64;
// A round light.
export function glow(color: string): HTMLCanvasElement {
  let c = glows.get(color);
  if (!c) {
    c = document.createElement('canvas');
    c.width = GLOW;
    c.height = GLOW;
    const ctx = c.getContext('2d');
    if (ctx) {
      const t = tone(color);
      const g = ctx.createRadialGradient(GLOW / 2, GLOW / 2, 0, GLOW / 2, GLOW / 2, GLOW / 2);
      g.addColorStop(0, alpha(t, 1));
      g.addColorStop(0.2, alpha(t, 0.55));
      g.addColorStop(0.5, alpha(t, 0.16));
      g.addColorStop(1, alpha(t, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, GLOW, GLOW);
    }
    if (glows.size > 200) glows.clear();
    glows.set(color, c);
  }
  return c;
}

export function light(ctx: Ctx, color: string, x: number, y: number, rx: number, ry: number, a: number) {
  if (a <= 0.004 || rx <= 0 || ry <= 0) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(glow(color), x - rx, y - ry, rx * 2, ry * 2);
  ctx.globalAlpha = 1;
}

export function round(ctx: Ctx, b: Box, r: number) {
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, Math.max(0, Math.min(r, b.w / 2, b.h / 2)));
}

// Light around the shape just traced.
export function halo(ctx: Ctx, t: Tone, strength: number) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  for (const [width, a] of [[18, 0.05], [11, 0.09], [6, 0.16]]) {
    ctx.lineWidth = width;
    ctx.strokeStyle = alpha(t, a * strength);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function vertical(ctx: Ctx, b: Box, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}
export function horizontal(ctx: Ctx, b: Box, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

export function drawParticles(ctx: Ctx, all: readonly Particle[]) {
  ctx.globalCompositeOperation = 'lighter';
  for (const p of all) {
    const a = presence(p);
    const { x, y, size } = p;
    switch (p.kind) {
      case 'smoke':
        light(ctx, p.color, x, y, size, size, a * 0.1);
        break;
      case 'ring':
        ctx.globalAlpha = a * 0.8;
        ctx.strokeStyle = tone(p.color).light;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      case 'shard': {
        // A long thin flash, along its way.
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        light(ctx, p.color, 0, 0, size * 5, size * 0.9, a * 0.9);
        light(ctx, tone(p.color).hot, 0, 0, size * 2.4, size * 0.4, a);
        ctx.restore();
        break;
      }
      case 'star': {
        const twinkle = 0.55 + 0.45 * Math.sin(p.seed + p.age * 14);
        light(ctx, p.color, x, y, size * 3, size * 3, a * 0.5);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.turn);
        light(ctx, tone(p.color).hot, 0, 0, size * 3.4, size * 0.45, a * twinkle);
        light(ctx, tone(p.color).hot, 0, 0, size * 0.45, size * 3.4, a * twinkle);
        ctx.restore();
        break;
      }
      case 'drop':
        light(ctx, p.color, x, y, size * 2.4, size * 2.4, a * 0.5);
        ctx.globalAlpha = a;
        ctx.fillStyle = tone(p.color).light;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      default:
        light(ctx, p.color, x, y, size * 2.6, size * 2.6, a * 0.75);
        light(ctx, tone(p.color).hot, x, y, size, size, a);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
