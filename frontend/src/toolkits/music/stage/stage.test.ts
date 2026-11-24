import { describe, expect, it } from 'vitest';
import { keyLayout } from '../keyGeometry';
import { hex, noteColor, tone } from './colors';
import { Particles, presence, type Kind } from './particles';
import { Scene, type Picture, type SeenNote } from './scene';
import { cleanedStage, STYLE_IDS, type StageSettings } from './settings';

// A canvas that only counts what is drawn, and refuses what a real one would.
function canvas() {
  let calls = 0;
  const numbers = (args: unknown[]) => {
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) throw new Error('not a number');
  };
  const gradient = { addColorStop: (at: number, color: string) => {
    if (!(at >= 0 && at <= 1) || /NaN|undefined/.test(color)) throw new Error(`bad stop ${at} ${color}`);
  } };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (own, name: string) => (name in own ? own[name] : (...args: unknown[]) => {
      numbers(args);
      calls++;
      return name.startsWith('create') ? gradient : undefined;
    }),
    set: (own, name: string, value) => {
      if (typeof value === 'string' && /NaN|undefined/.test(value)) throw new Error(`bad ${name}: ${value}`);
      own[name] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls: () => calls };
}
const settings = (more: Partial<StageSettings> = {}): StageSettings => ({ ...cleanedStage({}), style: 'neon', ...more });
const layout = keyLayout(48, 83);
const hands = { left: '#ff0000', right: '#0000ff' };
const id = {};
const note = (active: boolean, more: Partial<SeenNote> = {}): SeenNote => ({ id, midi: 60, hand: 'right', box: { x: 100, y: 200, w: 20, h: 200 }, active, ...more });
const picture = (notes: SeenNote[], moving = true): Picture => ({ w: 800, h: 400, layout, notes, moving, hands });

describe('how the notes look', () => {
  it('is the classic way unless chosen otherwise', () => {
    expect(cleanedStage({}).style).toBe('classic');
    expect(cleanedStage({ style: 'galaxy', led: false, effects: 'lots' as never })).toMatchObject({ style: 'galaxy', led: false, effects: 'max', keys: true });
    expect(cleanedStage({ style: 'gone' as never }).style).toBe('classic');
  });

  it('takes the colours of the hands, of the style or of the keys', () => {
    const palette = { left: '#111111', right: '#222222' };
    expect(noteColor('hands', 'left', 60, hands, palette)).toBe('#ff0000');
    expect(noteColor('style', 'right', 60, hands, palette)).toBe('#222222');
    expect(noteColor('hands', null, 40, hands, palette)).toBe('#ff0000');
    const keys = [21, 50, 80, 108].map((m) => noteColor('rainbow', 'left', m, hands, palette));
    expect(new Set(keys).size).toBe(4);
    for (const k of keys) expect(k).toMatch(/^#[0-9a-f]{6}$/);
    expect([hex(0, 1, 0.5), hex(120, 1, 0.5), hex(240, 1, 0.5)]).toEqual(['#ff0000', '#00ff00', '#0000ff']);
    expect(tone('#336699').rgb).toBe('51, 102, 153');
  });

  it.each(STYLE_IDS.filter((s) => s !== 'classic'))('can be drawn: %s', (style) => {
    const scene = new Scene();
    const { ctx, calls } = canvas();
    for (const colors of ['hands', 'style', 'rainbow'] as const) {
      for (let i = 0; i < 40; i++) {
        // Coming, sounding, then gone; tall, flat, thin.
        const boxes = [{ x: 10, y: -50, w: 30, h: 300 }, { x: 60, y: 390, w: 3, h: 4 }, { x: 90, y: 100, w: 40, h: 8 }];
        scene.draw(ctx, picture(boxes.map((box, k) => note(i > 10 && i < 25, { box, midi: 60 + k, id: boxes[0] }))), settings({ style, colors }), 0.016);
        scene.drawKeys(ctx, 800, 160, layout);
      }
    }
    expect(calls()).toBeGreaterThan(500);
  });

  it('throws sparks as notes start and last, as many as asked for', () => {
    const run = (effects: StageSettings['effects'], moving = true) => {
      const scene = new Scene();
      const { ctx } = canvas();
      for (let i = 0; i < 20; i++) scene.draw(ctx, picture([note(true)], moving), settings({ effects }), 0.016);
      return scene.particles.all.length;
    };
    expect(run('off')).toBe(0);
    expect(run('max', false)).toBe(0);
    expect(run('soft')).toBeGreaterThan(0);
    expect(run('max')).toBeGreaterThan(run('soft'));
  });

  it('asks less of a slow machine', () => {
    const scene = new Scene();
    const { ctx } = canvas();
    for (let i = 0; i < 400; i++) scene.draw(ctx, picture([]), settings(), 0.06);
    expect(scene.particles.limit).toBeLessThan(400);
    for (let i = 0; i < 1200; i++) scene.draw(ctx, picture([]), settings(), 0.012);
    expect(scene.particles.limit).toBe(1000);
  });

  it('never has too many sparks, and they all go', () => {
    const p = new Particles(50);
    const kinds: Kind[] = ['dust', 'ember', 'drop', 'star', 'shard', 'ring', 'smoke'];
    for (let i = 0; i < 200; i++) p.add({ kind: kinds[i % 7], color: '#ffffff', x: 0, y: 0, vx: 10, vy: 10, size: 2, life: 1, turn: 0 });
    expect(p.all).toHaveLength(50);
    p.step(0.5, 3);
    expect(p.all.every((x) => Number.isFinite(x.x + x.y + x.size) && presence(x) > 0 && presence(x) <= 1)).toBe(true);
    // Drops stay above the keyboard.
    expect(p.all.filter((x) => x.kind === 'drop').every((x) => x.y <= 3)).toBe(true);
    p.step(0.6, 3);
    expect(p.all).toHaveLength(0);
    p.limit = 0;
    p.add({ kind: 'dust', color: '#ffffff', x: 0, y: 0, vx: 0, vy: 0, size: 1, life: 1, turn: 0 });
    expect(p.all).toHaveLength(0);
  });
});
