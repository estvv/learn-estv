# Tri
> Insertion, fusion, rapide, comptage, et bien utiliser sort.

@@ lesson tris | Les tris

| | Temps | Mémoire | Stable | Idée |
|---|---|---|---|---|
| Insertion | O(n²), O(n) si presque trié | O(1) | oui | insérer chaque élément à sa place |
| Fusion | O(n log n) | O(n) | oui | trier deux moitiés, les fusionner |
| Rapide | O(n log n), O(n²) au pire | O(log n) | non | plus petits à gauche d'un pivot, plus grands à droite |
| Comptage | O(n + k) | O(k) | oui | compter chaque valeur (petits entiers) |

**Stable** : deux éléments égaux gardent leur ordre. `sort` est stable, ce qui permet de trier par un critère secondaire, puis par le principal.

```ts-run
interface P { nom: string; age: number }
const gens: P[] = [{ nom: 'Zoé', age: 20 }, { nom: 'Ali', age: 30 }, { nom: 'Bob', age: 20 }];

// Plusieurs critères : le premier non nul l'emporte
const tries = gens.toSorted((a, b) => a.age - b.age || a.nom.localeCompare(b.nom));
console.log(tries.map((p) => p.nom));
```

La fonction de comparaison doit être **cohérente** : toujours le même résultat, et `f(a, b)` de signe opposé à `f(b, a)`. `() => Math.random() - 0.5` n'est **pas** un bon mélange : utilise Fisher-Yates.

```ts-run
function melanger<T>(liste: readonly T[]): T[] {
  const l = [...liste];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}
console.log(melanger([1, 2, 3, 4, 5]));
```

### La fusion

```ts-run
function fusionner(a: number[], b: number[]): number[] {
  const r: number[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) r.push(a[i] <= b[j] ? a[i++] : b[j++]);
  return [...r, ...a.slice(i), ...b.slice(j)];
}
console.log(fusionner([1, 5, 9], [2, 3]));
```

@@ code insertion | Tri par insertion | ts
`trierInsertion(liste)` trie **sur place** et renvoie la liste. Sans `sort`.
@starter
function trierInsertion(liste: number[]): number[] {
  return liste;
}
@test Trie
expect(trierInsertion([5, 2, 9, 1, 5])).toEqual([1, 2, 5, 5, 9]); expect(trierInsertion([])).toEqual([]);
@test Sur place
const l = [2, 1]; expect(trierInsertion(l)).toBe(l); expect(l).toEqual([1, 2]);
@test Rapide sur des données presque triées
const l = Array.from({ length: 100_000 }, (_, i) => i); [l[10], l[11]] = [l[11], l[10]]; const t = performance.now(); trierInsertion(l); expect(performance.now() - t).toBeLessThan(400); expect(l[10]).toBe(10);
@test Sans `sort`
expect($source).not.toMatch(/sort|Sorted/i);
@hint
Pour chaque élément, décale vers la droite ceux qui sont plus grands à sa gauche, puis pose-le.
@solution
function trierInsertion(liste: number[]): number[] {
  for (let i = 1; i < liste.length; i++) {
    const x = liste[i];
    let j = i - 1;
    while (j >= 0 && liste[j] > x) {
      liste[j + 1] = liste[j];
      j--;
    }
    liste[j + 1] = x;
  }
  return liste;
}

@@ code fusion-tri | Tri fusion | ts
`trierFusion(liste, comparer)` renvoie une copie triée, **stable**, en O(n log n), pour n'importe quel type. Sans `sort`.
@starter
function trierFusion<T>(liste: readonly T[], comparer: (a: T, b: T) => number): T[] {
  return [...liste];
}
@test Trie
expect(trierFusion([5, 2, 9, 1], (a, b) => a - b)).toEqual([1, 2, 5, 9]); expect(trierFusion([], () => 0)).toEqual([]);
@test Stable
expect(trierFusion(['b1', 'a1', 'b2', 'a2'], (x, y) => x.charCodeAt(0) - y.charCodeAt(0))).toEqual(['a1', 'a2', 'b1', 'b2']);
@test Rapide, et sans toucher à l'original
const l = Array.from({ length: 60_000 }, (_, i) => (i * 7919) % 60_013); const copie = [...l]; const t = performance.now(); const r = trierFusion(l, (a, b) => a - b); expect(performance.now() - t).toBeLessThan(1500); expect(r).toEqual([...copie].sort((a, b) => a - b)); expect(l).toEqual(copie);
@test Sans `sort`
expect($source).not.toMatch(/sort|Sorted/i);
@solution
function trierFusion<T>(liste: readonly T[], comparer: (a: T, b: T) => number): T[] {
  if (liste.length < 2) return [...liste];
  const milieu = Math.floor(liste.length / 2);
  const a = trierFusion(liste.slice(0, milieu), comparer);
  const b = trierFusion(liste.slice(milieu), comparer);
  const resultat: T[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    const deA = j >= b.length || (i < a.length && comparer(a[i], b[j]) <= 0);
    resultat.push(deA ? a[i++] : b[j++]);
  }
  return resultat;
}

@@ code trier-par | Trier par critères | ts
`par(f)` renvoie une fonction de comparaison selon `f(element)` (nombre ou texte, ce dernier avec `localeCompare`). Elle a deux méthodes : `.puis(g)` ajoute un critère secondaire, `.inverse()` inverse l'ordre. Les deux renvoient un nouveau comparateur du même genre.
@starter
interface Comparateur<T> {
  (a: T, b: T): number;
  puis(f: (x: T) => string | number): Comparateur<T>;
  inverse(): Comparateur<T>;
}

@test Un critère
expect([{ n: 3 }, { n: 1 }].sort(par((x) => x.n))).toEqual([{ n: 1 }, { n: 3 }]); expect(['é', 'z', 'a'].sort(par((x) => x))).toEqual(['a', 'é', 'z']);
@test Deux critères
const l = [{ a: 2, b: 'x' }, { a: 1, b: 'z' }, { a: 1, b: 'y' }]; expect(l.toSorted(par((x) => x.a).puis((x) => x.b)).map((x) => x.b)).toEqual(['y', 'z', 'x']);
@test Inverse
expect([1, 3, 2].sort(par((x) => x).inverse())).toEqual([3, 2, 1]); const l = [{ a: 1, b: 1 }, { a: 2, b: 2 }, { a: 2, b: 1 }]; expect(l.toSorted(par((x) => x.a).inverse().puis((x) => x.b))).toEqual([{ a: 2, b: 1 }, { a: 2, b: 2 }, { a: 1, b: 1 }]);
@types Types
[{ a: 1 }].sort(par((x: { a: number }) => x.a).puis((x) => x.a).inverse());
// @ts-expect-error
par((x: { a: number }) => x.zut);
@hint
Une fonction interne `creer(comparer)` qui ajoute les deux méthodes avec `Object.assign`.
@solution
interface Comparateur<T> {
  (a: T, b: T): number;
  puis(f: (x: T) => string | number): Comparateur<T>;
  inverse(): Comparateur<T>;
}

function creer<T>(comparer: (a: T, b: T) => number): Comparateur<T> {
  return Object.assign((a: T, b: T) => comparer(a, b), {
    puis: (f: (x: T) => string | number) => creer<T>((a, b) => comparer(a, b) || par(f)(a, b)),
    inverse: () => creer<T>((a, b) => comparer(b, a)),
  });
}

function par<T>(f: (x: T) => string | number): Comparateur<T> {
  return creer<T>((a, b) => {
    const x = f(a);
    const y = f(b);
    return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
  });
}

@@ defi kieme | Le k-ième plus petit | ts
`kieme(liste, k)` renvoie le k-ième plus petit élément (k = 1 : le minimum) en O(n) **en moyenne**, sans trier toute la liste ni la modifier (*quickselect*). `undefined` si k est hors limites. Attention aux listes déjà triées et aux nombreux doublons.
@starter
function kieme(liste: readonly number[], k: number): number | undefined {
  return undefined;
}
@test Cas simples
expect([kieme([5, 2, 9], 1), kieme([5, 2, 9], 2), kieme([5, 2, 9], 3), kieme([1], 2), kieme([], 1)]).toEqual([2, 5, 9, undefined, undefined]);
@test Doublons
expect(kieme([2, 2, 1, 2], 2)).toBe(2); const t = performance.now(); expect(kieme(new Array(100_000).fill(7), 50_000)).toBe(7); expect(performance.now() - t).toBeLessThan(800);
@test Liste triée, sans la modifier
const l = Array.from({ length: 200_000 }, (_, i) => i); const t = performance.now(); expect(kieme(l, 150_000)).toBe(149_999); expect(performance.now() - t).toBeLessThan(800); expect(l[0]).toBe(0);
@test Sans `sort`
expect($source).not.toMatch(/sort|Sorted/i);
@hint
Choisis un pivot **au hasard** ; sépare en plus petits, égaux, plus grands ; continue seulement dans le bon groupe.
@solution
function kieme(liste: readonly number[], k: number): number | undefined {
  if (k < 1 || k > liste.length) return undefined;
  let reste = liste;
  let rang = k;
  for (;;) {
    const pivot = reste[Math.floor(Math.random() * reste.length)];
    const petits = reste.filter((x) => x < pivot);
    const egaux = reste.filter((x) => x === pivot).length;
    if (rang <= petits.length) {
      reste = petits;
    } else if (rang <= petits.length + egaux) {
      return pivot;
    } else {
      rang -= petits.length + egaux;
      reste = reste.filter((x) => x > pivot);
    }
  }
}

@@ predict stable
Que veut dire « tri stable » ?
@answer Les éléments égaux gardent leur ordre d'origine
@wrong Le temps est toujours le même
@wrong Le tableau d'origine n'est pas modifié
@wrong Il n'utilise pas de mémoire
@why Pratique pour trier par plusieurs critères successifs.

@@ predict tri-criteres
Qu'affiche ce code ?
```js
console.log([[1, 'b'], [0, 'z'], [1, 'a']].sort((x, y) => x[0] - y[0] || x[1].localeCompare(y[1])).map((x) => x[1]).join(''));
```
@answer `zab`
@wrong `zba`
@wrong `abz`
@wrong `baz`
@why D'abord par nombre, et à égalité par texte.

@@ card fusion-idee
Le principe du tri fusion ?
@back
Trier deux moitiés, puis fusionner deux listes triées. O(n log n), stable.

@@ card melange
Mélanger correctement un tableau ?
@back
Fisher-Yates : de la fin au début, échanger avec un indice au hasard entre 0 et i.
