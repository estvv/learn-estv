# Complexité
> Estimer le temps et la mémoire d'un programme avant de l'exécuter.

@@ lesson grand-o | La notation O

Combien de travail quand les données **grandissent** ? On garde le terme dominant, sans les constantes.

| | Nom | Exemple | n = 1 000 000 |
|---|---|---|---|
| O(1) | constant | `tab[i]`, `map.get` | 1 |
| O(log n) | logarithmique | recherche dichotomique | 20 |
| O(n) | linéaire | une boucle | 1 million |
| O(n log n) | | un bon tri | 20 millions |
| O(n²) | quadratique | deux boucles imbriquées | mille milliards |
| O(2ⁿ) | exponentiel | tous les sous-ensembles | impensable |

Repère : environ **100 millions** d'opérations simples par seconde.

### Compter

```js
for (const x of liste) …                    // O(n)
for (const x of liste) for (const y of liste) … // O(n²)
for (let i = n; i > 1; i /= 2) …            // O(log n)
f(liste); g(liste);                         // O(n) + O(n) = O(n)
for (const x of liste) autre.includes(x);   // O(n × m) : includes est une boucle cachée !
```

Le coût des opérations de JavaScript :

| O(1) | O(n) |
|---|---|
| `tab[i]`, `push`, `pop` | `shift`, `unshift`, `splice`, `includes`, `indexOf`, `slice`, `[...tab]`, `map`, `filter` |
| `map.get/set`, `set.has/add` | `Math.max(...tab)`, comparer ou copier une chaîne |

`sort` : O(n log n). Un piège fréquent : `[...acc, x]` dans un `reduce` recopie tout à chaque tour, donc O(n²).

### Échanger de la mémoire contre du temps

```js-run
const n = 20000;
const a = Array.from({ length: n }, (_, i) => i);
const b = a.map((x) => x + n / 2);

let t = performance.now();
let communs = a.filter((x) => b.includes(x)).length;       // O(n²)
console.log(communs, Math.round(performance.now() - t), 'ms');

t = performance.now();
const dansB = new Set(b);                                  // O(n) de mémoire
communs = a.filter((x) => dansB.has(x)).length;            // O(n)
console.log(communs, Math.round(performance.now() - t), 'ms');
```

On parle aussi de complexité **en mémoire**, et de coût **amorti** : `push` est parfois lent (agrandissement), mais O(1) en moyenne.

@@ code doublon | Un doublon, vite | ts
`aUnDoublon(liste)` dit si une valeur apparaît deux fois. O(n) : le test utilise 60 000 éléments.
@starter
function aUnDoublon(liste: number[]): boolean {
  return liste.some((x, i) => liste.indexOf(x) !== i);
}
@test Petits cas
expect([aUnDoublon([1, 2, 1]), aUnDoublon([1, 2]), aUnDoublon([])]).toEqual([true, false, false]);
@test Rapide
const l = Array.from({ length: 60_000 }, (_, i) => i); const t = performance.now(); expect(aUnDoublon(l)).toBe(false); expect(performance.now() - t).toBeLessThan(250);
@solution
function aUnDoublon(liste: number[]): boolean {
  return new Set(liste).size !== liste.length;
}

@@ code deux-somme | Deux nombres | ts
`deuxSomme(liste, cible)` renvoie les **indices** `[i, j]` (i < j) de deux éléments dont la somme vaut `cible`, ou `null`. En O(n). S'il y a plusieurs réponses, celle dont `j` est le plus petit.
@starter
function deuxSomme(liste: number[], cible: number): [number, number] | null {
  return null;
}
@test Trouve
expect(deuxSomme([2, 7, 11, 15], 9)).toEqual([0, 1]); expect(deuxSomme([3, 2, 4], 6)).toEqual([1, 2]);
@test Le même nombre deux fois, mais pas deux fois le même élément
expect(deuxSomme([3, 3], 6)).toEqual([0, 1]); expect(deuxSomme([3, 1], 6)).toBe(null);
@test Rapide
const l = Array.from({ length: 200_000 }, (_, i) => i * 2); const t = performance.now(); expect(deuxSomme(l, 399_998 + 399_996)).toEqual([199_998, 199_999]); expect(deuxSomme(l, 3)).toBe(null); expect(performance.now() - t).toBeLessThan(500);
@hint
Une Map « valeur → indice » des nombres déjà vus : pour chaque `x`, a-t-on déjà vu `cible - x` ?
@solution
function deuxSomme(liste: number[], cible: number): [number, number] | null {
  const vus = new Map<number, number>();
  for (const [j, x] of liste.entries()) {
    const i = vus.get(cible - x);
    if (i !== undefined) return [i, j];
    vus.set(x, j);
  }
  return null;
}

@@ code anagrammes | Grouper les anagrammes | ts
`grouper(mots)` regroupe les anagrammes (mêmes lettres). Les groupes sont dans l'ordre d'apparition de leur premier mot, et les mots d'un groupe dans leur ordre d'origine.
@starter
function grouper(mots: string[]): string[][] {
  return [];
}
@test Groupe
expect(grouper(['chien', 'niche', 'chat', 'chine'])).toEqual([['chien', 'niche', 'chine'], ['chat']]);
@test Vide et identiques
expect(grouper([])).toEqual([]); expect(grouper(['a', 'a'])).toEqual([['a', 'a']]);
@test Rapide
const m = Array.from({ length: 30_000 }, (_, i) => String(i)); const t = performance.now(); grouper(m); expect(performance.now() - t).toBeLessThan(1000);
@solution
function grouper(mots: string[]): string[][] {
  const groupes = new Map<string, string[]>();
  for (const mot of mots) {
    const cle = [...mot].sort().join('');
    const groupe = groupes.get(cle);
    if (groupe) groupe.push(mot);
    else groupes.set(cle, [mot]);
  }
  return [...groupes.values()];
}

@@ defi produit-sauf | Tout sauf soi-même | ts
`produitSauf(liste)` renvoie, pour chaque position, le produit de **tous les autres** éléments. En O(n), **sans division** (il peut y avoir des zéros).
@starter
function produitSauf(liste: number[]): number[] {
  return [];
}
@test Cas simples
expect(produitSauf([1, 2, 3, 4])).toEqual([24, 12, 8, 6]); expect(produitSauf([5])).toEqual([1]);
@test Des zéros
expect(produitSauf([0, 2, 3])).toEqual([6, 0, 0]); expect(produitSauf([0, 0, 3])).toEqual([0, 0, 0]);
@test Sans division, et rapide
expect($source).not.toMatch(/[^/*]\/[^/*]/); const t = performance.now(); produitSauf(new Array(100_000).fill(1)); expect(performance.now() - t).toBeLessThan(300);
@hint
Le produit de tout ce qui est à gauche, fois le produit de tout ce qui est à droite : deux passages.
@solution
function produitSauf(liste: number[]): number[] {
  const resultat: number[] = [];
  let gauche = 1;
  for (const x of liste) {
    resultat.push(gauche);
    gauche *= x;
  }
  let droite = 1;
  for (let i = liste.length - 1; i >= 0; i--) {
    resultat[i] *= droite;
    droite *= liste[i];
  }
  return resultat;
}

@@ predict includes-boucle
Quelle est la complexité ?
```ts
const communs = a.filter((x) => b.includes(x));
```
@answer O(n × m)
@wrong O(n)
@wrong O(n + m)
@wrong O(log n)
@why `includes` parcourt `b` pour chaque élément de `a`. Avec un Set : O(n + m).

@@ predict boucle-log
Quelle est la complexité ?
```ts
for (let i = 1; i < n; i *= 2) faire();
```
@answer O(log n)
@wrong O(n)
@wrong O(n / 2)
@wrong O(n²)
@why `i` double à chaque tour : il faut log₂(n) tours.

@@ card couts
Coût de `push`, `shift`, `includes` et `set.has` ?
@back
O(1), O(n), O(n), O(1).

@@ card tri-cout
Complexité d'un bon tri ?
@back
O(n log n)
