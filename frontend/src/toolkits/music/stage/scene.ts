import type { Hand } from '@learn/shared';
import type { KeyBox } from '../keyGeometry';
import { noteColor, tone } from './colors';
import { drawParticles, light, type Box } from './draw';
import { Particles } from './particles';
import type { Effects, StageSettings } from './settings';
import { STYLES } from './styles';

// A style at work: the notes, what flies around them, the bar of light and the
// light on the keys. Given what is seen at each picture, it keeps the rest.

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
  off: { much: 0, limit: 0 }, soft: { much: 0.4, limit: 320 }, max: { much: 1, limit: 1000 },
};
// Seconds to come and to go.
const RISE = 0.05;
const FALL = 0.45;
// Pictures slower than this ask for fewer sparks (seconds).
const SLOW = 0.026;

interface Lamp { color: string; level: number; on: boolean }

export class Scene {
  readonly particles = new Particles(0);
  private lamps = new Map<number, Lamp>();
  private sounding = new Set<object>();
  private time = 0;
  private pace = 0.016;
  // Of what is asked for: less on a slow machine.
  private share = 1;

  draw(ctx: Ctx, pic: Picture, settings: StageSettings, elapsed: number) {
    if (settings.style === 'classic') return;
    const style = STYLES[settings.style];
    const { w, h, layout } = pic;
    const dt = Math.min(0.05, Math.max(0, elapsed));
    this.time += dt;
    this.measure(elapsed);
    const amount = AMOUNT[settings.effects];
    const much = amount.much * this.share;
    this.particles.limit = Math.round(amount.limit * this.share);

    style.background(ctx, w, h, this.time);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    for (const [midi, b] of layout) if (midi % 12 === 0) ctx.fillRect(Math.round(b.x * w), 0, 1, h);

    const colorOf = (n: SeenNote) => noteColor(settings.colors, n.hand, n.midi, pic.hands, style.palette);
    const now = new Set<object>();
    for (const lamp of this.lamps.values()) lamp.on = false;
    for (const n of pic.notes) {
      if (!n.active) continue;
      now.add(n.id);
      const key = layout.get(n.midi);
      if (!key) continue;
      const color = colorOf(n);
      const lamp = this.lamps.get(n.midi);
      if (lamp) Object.assign(lamp, { color, on: true });
      else this.lamps.set(n.midi, { color, level: 0, on: true });
      if (!pic.moving || !much) continue;
      const x = (key.x + key.width / 2) * w;
      const wide = Math.max(8, n.box.w);
      if (!this.sounding.has(n.id)) style.strike(this.particles, x, h - 4, wide, color, much);
      // As many, whatever the number of pictures a second.
      else style.hold(this.particles, x, h - 4, wide, color, much * dt * 60);
    }
    this.sounding = now;
    for (const [midi, lamp] of this.lamps) {
      lamp.level = lamp.on ? Math.min(1, lamp.level + dt / RISE) : lamp.level - dt / FALL;
      if (lamp.level <= 0) this.lamps.delete(midi);
    }

    // Light climbing from the keys.
    ctx.globalCompositeOperation = 'lighter';
    for (const [midi, lamp] of this.lamps) {
      const key = layout.get(midi);
      if (!key) continue;
      const x = (key.x + key.width / 2) * w;
      const wide = Math.max(26, key.width * w * 1.6);
      light(ctx, lamp.color, x, h, wide * 2.2, Math.min(h * 0.4, wide * 3.4), 0.34 * lamp.level);
      light(ctx, lamp.color, x, h, wide * 0.55, Math.min(h * 0.62, wide * 6), 0.2 * lamp.level);
    }
    ctx.globalCompositeOperation = 'source-over';

    for (const n of pic.notes) style.note(ctx, n.box, tone(colorOf(n)), n.active ? this.lamps.get(n.midi)?.level ?? 1 : 0, this.time);

    this.particles.step(dt, h - 3);
    drawParticles(ctx, this.particles.all);
    if (settings.led) this.bar(ctx, w, h, layout, style.palette, settings, pic.hands);
    ctx.globalAlpha = 1;
  }

  // Slow machines get fewer sparks, and more of them again once at ease.
  private measure(elapsed: number) {
    if (elapsed <= 0 || elapsed > 0.2) return;
    this.pace += (elapsed - this.pace) * 0.05;
    if (this.pace > SLOW) this.share = Math.max(0.15, this.share - 0.01);
    else if (this.share < 1) this.share = Math.min(1, this.share + 0.002);
  }

  // At rest, the colours of the hands from one end to the other; it waves, and
  // swells where notes fall.
  private bar(ctx: Ctx, w: number, h: number, layout: ReadonlyMap<number, KeyBox>, palette: Record<Hand, string>, settings: StageSettings, hands: Record<Hand, string>) {
    const ends = settings.colors === 'style' ? palette : hands;
    ctx.globalCompositeOperation = 'lighter';
    const count = Math.max(12, Math.round(w / 46));
    for (let i = 0; i <= count; i++) {
      const x = (i / count) * w;
      const wave = 0.5 + 0.28 * Math.sin(this.time * 2.1 + i * 0.7) + 0.22 * Math.sin(this.time * 3.7 - i * 1.3);
      const color = settings.colors === 'rainbow' ? noteColor('rainbow', null, 21 + (i / count) * 87, hands, palette) : i / count < 0.5 ? ends.left : ends.right;
      light(ctx, color, x, h, (w / count) * 1.5, 12 + 9 * wave, 0.5);
    }
    for (const [midi, lamp] of this.lamps) {
      const key = layout.get(midi);
      if (!key) continue;
      const x = (key.x + key.width / 2) * w;
      light(ctx, lamp.color, x, h, 70, 34, 0.9 * lamp.level);
      light(ctx, tone(lamp.color).hot, x, h, 34, 14, 0.9 * lamp.level);
    }
    const line = ctx.createLinearGradient(0, 0, w, 0);
    line.addColorStop(0, tone(ends.left).light);
    line.addColorStop(1, tone(ends.right).light);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = line;
    ctx.fillRect(0, h - 2.5, w, 2.5);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // Laid over the keyboard and multiplied with it: dark where there is no light.
  drawKeys(ctx: Ctx, w: number, h: number, layout: ReadonlyMap<number, KeyBox>) {
    ctx.globalCompositeOperation = 'source-over';
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, '#8d909c');
    shade.addColorStop(1, '#b4b7c2');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const [midi, lamp] of this.lamps) {
      const key = layout.get(midi);
      if (!key) continue;
      const x = (key.x + key.width / 2) * w;
      const wide = Math.max(60, key.width * w * 3.2);
      light(ctx, lamp.color, x, 0, wide, h * 0.95, 0.75 * lamp.level);
      light(ctx, tone(lamp.color).light, x, 0, wide * 0.4, h * 0.5, 0.5 * lamp.level);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
