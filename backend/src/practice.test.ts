import { describe, expect, it } from 'vitest';
import { streakOf } from './practice.js';

describe('days in a row', () => {
  it('end today or yesterday', () => {
    const days = new Set(['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-24', '2026-11-25']);
    expect(streakOf(days, '2026-11-25')).toEqual({ current: 2, best: 3 });
    expect(streakOf(days, '2026-11-26')).toEqual({ current: 2, best: 3 });
    expect(streakOf(days, '2026-11-27')).toEqual({ current: 0, best: 3 });
    expect(streakOf(new Set(), '2026-11-27')).toEqual({ current: 0, best: 0 });
    // Across months.
    expect(streakOf(new Set(['2026-10-31', '2026-11-01']), '2026-11-01').current).toBe(2);
  });
});
