import { describe, expect, it } from 'vitest';
import { heardAs } from './record';
import { cleanedVideo, sizeOf } from './settings';

describe('a video', () => {
  it('has the size of its format', () => {
    expect(sizeOf(cleanedVideo({}))).toEqual([1920, 1080]);
    expect(sizeOf(cleanedVideo({ format: 'portrait', quality: 720 }))).toEqual([720, 1280]);
  });

  it('keeps only what makes sense', () => {
    const v = cleanedVideo({ format: 'square' as never, quality: 480 as never, logo: 'x'.repeat(99), logoImage: 'https://evil.test/a.png', sound: false });
    expect(v).toMatchObject({ format: 'landscape', quality: 1080, sound: false, lyrics: true, logoImage: '' });
    expect(v.logo).toHaveLength(40);
  });

  it('shows what is heard, a little after it is asked for', () => {
    const player = { position: 5, rate: 1, other: 'x' };
    const late = heardAs(player, 0.1);
    expect(late.position).toBeCloseTo(4.9);
    expect(late.other).toBe('x');
    player.position = 0.05;
    expect(late.position).toBe(0);
  });
});
