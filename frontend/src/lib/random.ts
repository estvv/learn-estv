export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// `count` items cycling through shuffled rounds, never the same item twice in a row.
export function drawCycling<T>(items: readonly T[], count: number): T[] {
  if (items.length === 0) return [];
  const out: T[] = [];
  while (out.length < count) {
    let round = shuffle(items);
    if (items.length > 1 && round[0] === out[out.length - 1]) round = [...round.slice(1), round[0]];
    out.push(...round);
  }
  return out.slice(0, count);
}
