// What flies around the notes. No more than a fixed number of them: the oldest
// make room for the new ones.

export type Kind = 'dust' | 'ember' | 'drop' | 'star' | 'shard' | 'ring' | 'smoke';

export interface Particle {
  kind: Kind;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  age: number;
  life: number; // seconds
  turn: number;
  seed: number;
}

interface Law { gravity: number; drag: number; sway: number; grow: number }
const LAWS: Record<Kind, Law> = {
  dust: { gravity: 60, drag: 1.6, sway: 60, grow: 0 },
  ember: { gravity: -90, drag: 0.9, sway: 110, grow: 0 },
  drop: { gravity: 900, drag: 0.2, sway: 0, grow: 0 },
  star: { gravity: -10, drag: 1.4, sway: 30, grow: 0 },
  shard: { gravity: -40, drag: 0.6, sway: 50, grow: 0 },
  ring: { gravity: 0, drag: 0, sway: 0, grow: 150 },
  smoke: { gravity: -22, drag: 0.5, sway: 24, grow: 26 },
};

export class Particles {
  readonly all: Particle[] = [];

  constructor(public limit: number) {}

  add(p: Omit<Particle, 'age' | 'seed'>) {
    if (this.limit <= 0) return;
    if (this.all.length >= this.limit) this.all.splice(0, this.all.length - this.limit + 1);
    this.all.push({ ...p, age: 0, seed: Math.random() * 100 });
  }

  step(dt: number, floor: number) {
    let kept = 0;
    for (const p of this.all) {
      p.age += dt;
      if (p.age >= p.life) continue;
      const law = LAWS[p.kind];
      const slow = Math.exp(-law.drag * dt);
      p.vx = p.vx * slow + Math.sin(p.seed + p.age * 5) * law.sway * dt;
      p.vy = p.vy * slow + law.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += law.grow * dt;
      p.turn += (p.seed % 4 - 2) * dt;
      // Drops bounce off the keyboard, once or twice.
      if (p.kind === 'drop' && p.y > floor && p.vy > 0) {
        p.y = floor;
        p.vy *= -0.32;
        p.vx *= 0.6;
      }
      this.all[kept++] = p;
    }
    this.all.length = kept;
  }

  clear() {
    this.all.length = 0;
  }
}

// How much of it is left to see, 0 to 1: comes quickly, goes slowly.
export function presence(p: Particle): number {
  const t = p.age / p.life;
  return Math.min(1, t * 12) * (1 - t) ** (p.kind === 'smoke' ? 1 : 0.8);
}
