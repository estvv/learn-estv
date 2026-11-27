import { describe, expect, it } from 'vitest';
import { cleaned, themeOf } from './appearance';

describe('how the app looks', () => {
  it('follows the device unless chosen otherwise', () => {
    expect(cleaned({}).theme).toBe('auto');
    expect(cleaned({ theme: 'nope' as never }).theme).toBe('auto');
    const a = cleaned({});
    expect([themeOf(a, false), themeOf(a, true)]).toEqual(['light', 'dark']);
    expect(themeOf(cleaned({ theme: 'light' }), true)).toBe('light');
  });

  it('reads the theme saved when the hands had colours too', () => {
    expect(cleaned({ theme: 'dark', hands: { dark: { left: '#00ff00', right: '#ff0000' } } } as never)).toEqual({ theme: 'dark' });
  });
});
