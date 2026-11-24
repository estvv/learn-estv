import type { Hand } from '@learn/shared';
import type { KeyBox } from '../keyGeometry';
import { alpha, pairOf, tone, warm } from './colors';
import { drawParticles, light, vertical, type Box } from './draw';
import { Particles } from './particles';
import type { Effects, StageSettings } from './settings';
import { STYLES } from './styles';

// The stage: the notes, the line of light they fall on, the clouds that rise from
// it and the light on the keys. Given what is seen at each picture, it keeps the rest.

type Ctx = CanvasRenderingContext2D;

export interface SeenNote {
  id: object;
  midi: number;
  hand: Hand | null;
  box: Box;
  // Sounding now.
  active: boolean;
}

export interface Picture {
  w: number;
  h: number;
  layout: ReadonlyMap<number, KeyBox>;
  notes: SeenNote[];
  // The music goes on: notes held throw sparks.
  moving: boolean;
  hands: Record<Hand, string>;
}

const AMOUNT: Record<Effects, { much: number; limit: number }> = {
  off: { much: 0, limit: 0 }, soft: { much: 0.35, limit: 900 }, max: { much: 1, limit: 2600 },
};
// Seconds to come and to go.
const RISE = 0.04;
const FALL = 0.5;
// Motes a second: as a note strikes, for that long, then as long as it lasts.
const BURST = 420;
const STRIKE = 0.3;
const HOLD = 26;
// A flash for so many notes.
const FLASH = 0.2;
// Pictures slower than this ask for fewer sparks (seconds).
const SLOW = 0.026;

interface Lamp { color: string; level: number; on: boolean; strike: number }

const between = (a: number, b: number) => a + Math.random() * (b - a);
// Both sides of nothing, mostly near it.
const around = () => (Math.random() + Math.random() + Math.random()) / 1.5 - 1;
// A whole number, right on average.
const some = (n: number) => Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);

export class Scene {
  readonly particles = new Particles(0);
  private lamps = new Map<number, Lamp>();
  // Since when each note sounds.
  private sounding = new Map<object, number>();
  private time = 0;
  private pace = 0.016;
  // Of what is asked for: less on a slow machine.
  private share = 1;

  draw(ctx: Ctx, pic: Picture, settings: StageSettings, elapsed: number) {
    if (settings.style === 'classic') return;
    const drawNote = STYLES[settings.style];
    const { w, h, layout } = pic;
    const dt = Math.min(0.05, Math.max(0, elapsed));
    this.time += dt;
    this.measure(elapsed);
    const amount = AMOUNT[settings.effects];
    const much = amount.much * this.share;
    this.particles.limit = Math.round(amount.limit * this.share);
    // Everything flies as far on a small stage.
    const scale = Math.max(0.35, Math.min(1.6, h / 620));

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    for (const [midi, b] of layout) if (midi % 12 === 0) ctx.fillRect(Math.round(b.x * w), 0, 1, h);

    const pair = (n: SeenNote) => pairOf(settings.mood, n.hand, n.midi, pic.hands);
    const now = new Map<object, number>();
    for (const lamp of this.lamps.values()) lamp.on = false;
    for (const n of pic.notes) {
      if (!n.active) continue;
      const key = layout.get(n.midi);
      if (!key) continue;
      const color = pair(n)[1];
      const since = this.sounding.get(n.id) ?? this.time;
      now.set(n.id, since);
      const fresh = !this.sounding.has(n.id);
      const lamp = this.lamps.get(n.midi);
      if (lamp) Object.assign(lamp, { color, on: true, strike: fresh ? 1 : lamp.strike });
      else this.lamps.set(n.midi, { color, level: 0, on: true, strike: 1 });
      if (!pic.moving || !much) continue;
      const x = (key.x + key.width / 2) * w;
      const wide = Math.max(8, n.box.w);
      const age = this.time - since;
      // As many, whatever the number of pictures a second.
      this.cloud(x, h, wide, color, some((age < STRIKE ? BURST * (1 - age / STRIKE) + HOLD : HOLD) * dt * much), age, scale);
      if (fresh && Math.random() < FLASH * much) {
        this.particles.add({ kind: 'flash', color, x: x + around() * wide, y: h - 6, vx: around() * 110 * scale, vy: -between(330, 560) * scale, size: between(5, 9) * scale, life: between(0.6, 1.1) });
      }
    }
    this.sounding = now;
    for (const [midi, lamp] of this.lamps) {
      lamp.level = lamp.on ? Math.min(1, lamp.level + dt / RISE) : lamp.level - dt / FALL;
      lamp.strike = Math.max(0, lamp.strike - dt / 0.3);
      if (lamp.level <= 0) this.lamps.delete(midi);
    }

    for (const n of pic.notes) {
      const near = n.active ? 1 : (n.box.y + n.box.h) / h;
      drawNote(ctx, n.box, tone(warm(pair(n), near)), n.active ? this.lamps.get(n.midi)?.level ?? 1 : 0);
    }

    this.particles.step(dt, scale);
    drawParticles(ctx, this.particles.all);
    if (settings.led) this.line(ctx, pic, settings, scale);
    this.flares(ctx, pic, scale);
    ctx.globalAlpha = 1;
  }

  // A cloud, thrown up as one: all its motes go nearly the same way.
  private cloud(x: number, h: number, wide: number, color: string, count: number, age: number, scale: number) {
    // Thrown more or less hard as time goes: what leaves together stays together,
    // what leaves next follows, and the cloud draws a ribbon.
    const lean = Math.sin(x * 0.7 + this.time * 3.1) * 46;
    const throwing = age < STRIKE ? 640 - 420 * (age / STRIKE) : 250 + 90 * Math.sin(this.time * 4.7 + x);
    for (let i = 0; i < count; i++) {
      const up = throwing * between(0.82, 1.1);
      this.particles.add({
        kind: 'mote', color,
        x: x + around() * wide * 0.5, y: h - 3 - Math.random() * 5,
        vx: (lean + around() * 34) * scale, vy: -up * scale,
        size: between(0.7, 1.75) * Math.max(0.8, Math.min(1.25, scale)), life: between(1.1, 3),
      });
    }
  }

  // Slow machines get fewer sparks, and more of them again once at ease.
  private measure(elapsed: number) {
    if (elapsed <= 0 || elapsed > 0.2) return;
    this.pace += (elapsed - this.pace) * 0.05;
    if (this.pace > SLOW) this.share = Math.max(0.15, this.share - 0.01);
    else if (this.share < 1) this.share = Math.min(1, this.share + 0.002);
  }

  private at(pic: Picture, midi: number): number | null {
    const key = pic.layout.get(midi);
    return key ? (key.x + key.width / 2) * pic.w : null;
  }

  // White hot, its upper edge never still, higher where notes strike; its light
  // spreads above.
  private line(ctx: Ctx, pic: Picture, settings: StageSettings, scale: number) {
    const { w, h } = pic;
    const lamps = [...this.lamps].flatMap(([midi, lamp]) => {
      const x = this.at(pic, midi);
      return x === null ? [] : [{ ...lamp, x }];
    });
    const rest = (x: number) => {
      const pitch = 21 + (x / w) * 87;
      return pairOf(settings.mood, x < w / 2 ? 'left' : 'right', pitch, pic.hands)[1];
    };
    ctx.globalCompositeOperation = 'lighter';
    // The light it gives, from one end to the other.
    const parts = settings.mood === 'rainbow' ? 14 : settings.mood === 'hands' ? 8 : 4;
    for (let i = 0; i <= parts; i++) {
      const x = (i / parts) * w;
      light(ctx, rest(x), x, h, (w / parts) * 1.8, 110 * scale, 0.3 + 0.04 * Math.sin(this.time * 1.7 + i));
      light(ctx, rest(x), x, h, (w / parts) * 1.8, 34 * scale, 0.4);
    }
    for (const l of lamps) {
      light(ctx, l.color, l.x, h, 170 * scale, 100 * scale, 0.36 * l.level);
      light(ctx, l.color, l.x, h, 46 * scale, 34 * scale, 0.5 * l.level);
    }
    // Its edge: waves that do not repeat, and sudden steps as a spark would leave.
    const step = 7;
    const tall = (x: number) => {
      const t = this.time;
      const waves = Math.sin(x * 0.021 + t * 1.9) + Math.sin(x * 0.053 - t * 2.7) * 0.7 + Math.sin(x * 0.13 + t * 4.3) * 0.45;
      const cell = Math.floor(x / step);
      const crackle = Math.max(0, Math.sin(cell * 12.9898 + Math.floor(t * 12 + cell * 0.37) * 78.233)) ** 10 * 1.5;
      let lift = 0;
      for (const l of lamps) {
        const far = (x - l.x) / (34 * scale);
        if (far > -3 && far < 3) lift += (2 + 4 * l.strike) * l.level * Math.exp(-far * far);
      }
      return 1.6 + Math.max(0, waves) * 0.7 + crackle + Math.min(6, lift);
    };
    const trace = (more: number) => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, h - tall(x) * more - (more - 1) * 1.5);
      ctx.lineTo(w, h);
      ctx.closePath();
    };
    const hue = ctx.createLinearGradient(0, 0, w, 0);
    const hot = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= parts; i++) {
      const t = tone(rest((i / parts) * w));
      hue.addColorStop(i / parts, alpha(t, 0.5));
      hot.addColorStop(i / parts, t.hot);
    }
    // Soft around, then white.
    ctx.fillStyle = hue;
    for (const [more, a] of [[4.5, 0.16], [3.2, 0.24], [2.2, 0.36], [1.5, 0.6]]) {
      trace(more);
      ctx.globalAlpha = a;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    trace(1);
    ctx.fillStyle = hot;
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, h - 2, w, 2);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Where notes go into the keys.
  private flares(ctx: Ctx, pic: Picture, scale: number) {
    ctx.globalCompositeOperation = 'lighter';
    for (const [midi, lamp] of this.lamps) {
      const x = this.at(pic, midi);
      if (x === null) continue;
      const hot = tone(lamp.color).hot;
      const strong = lamp.level * (0.55 + 0.45 * lamp.strike);
      light(ctx, hot, x, pic.h, 26 * scale, 18 * scale, strong);
      light(ctx, lamp.color, x, pic.h, 95 * scale, 12 * scale, strong * 0.8);
      light(ctx, hot, x, pic.h, 5 * scale, (60 + 90 * lamp.strike) * scale, strong * 0.5);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // Laid over the keyboard and multiplied with it: coloured where there is light.
  drawKeys(ctx: Ctx, w: number, h: number, layout: ReadonlyMap<number, KeyBox>) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = vertical(ctx, { x: 0, y: 0, w, h }, [[0, '#ffffff'], [0.3, '#f3f4f8'], [1, '#e0e2ea']]);
    ctx.fillRect(0, 0, w, h);
    for (const [midi, lamp] of this.lamps) {
      const key = layout.get(midi);
      if (!key) continue;
      const x = (key.x + key.width / 2) * w;
      const wide = Math.max(70, key.width * w * 3.4);
      light(ctx, lamp.color, x, h * 0.05, wide * 1.2, h, 0.85 * lamp.level);
    }
  }
}
