# Programmation dynamique
> Ne jamais résoudre deux fois le même sous-problème.

@@ lesson prog-dynamique | L'idée

Deux conditions : la solution se construit à partir de **sous-problèmes**, et ceux-ci **se répètent**. On garde leurs résultats.

```ts-run
let appels = 0;
function fibNaif(n: number): number {
  appels++;
  return n < 2 ? n : fibNaif(n - 1) + fibNaif(n - 2);
}
console.log(fibNaif(25), appels, 'appels');

// De haut en bas : récursion + mémoire
const memo = new Map<number, number>();
function fib(n: number): number {
  if (n < 2) return n;
  const connu = memo.get(n);
  if (connu !== undefined) return connu;
  const r = fib(n - 1) + fib(n - 2);
  memo.set(n, r);
  return r;
}
console.log(fib(80));

// De bas en haut : on remplit dans l'ordre
let [a, b] = [0, 1];
for (let i = 0; i < 80; i++) [a, b] = [b, a + b];
console.log(a);
```

### La méthode

1. **État** : que faut-il savoir pour décrire un sous-problème ? (« les i premiers objets, avec la capacité c »)
2. **Récurrence** : sa réponse, à partir de plus petits. Souvent « le meilleur de plusieurs choix ».
3. **Base** : les cas évidents.
4. **Ordre** de calcul.
5. Réduire la mémoire, si possible.

### Exemple : le sac à dos

Objets `(poids, valeur)`, capacité limitée, chaque objet au plus une fois.

État : `t[c]` = meilleure valeur avec une capacité `c`. Pour chaque objet : le prendre (`t[c - poids] + valeur`) ou non (`t[c]`).

```ts-run
function sac(objets: [poids: number, valeur: number][], capacite: number): number {
  const t = new Array<number>(capacite + 1).fill(0);
  for (const [p, v] of objets) {
    for (let c = capacite; c >= p; c--) { // à l'envers : l'objet n'est pris qu'une fois
      t[c] = Math.max(t[c], t[c - p] + v);
    }
  }
  return t[capacite];
}
console.log(sac([[1, 1], [3, 4], [4, 5], [5, 7]], 7));
```

### Glouton ?

Un algorithme **glouton** prend le meilleur choix immédiat. Plus simple, mais pas toujours juste : pour rendre 6 avec des pièces de 1, 3 et 4, le glouton donne 4+1+1, alors que 3+3 est meilleur.

@@ code pieces | Le moins de pièces | ts
`pieces(valeurs, cible)` renvoie le nombre **minimal** de pièces pour obtenir `cible` (chacune utilisable plusieurs fois), ou `-1`.
@starter
function pieces(valeurs: number[], cible: number): number {
  return -1;
}
@test Le glouton se trompe ici
expect(pieces([1, 3, 4], 6)).toBe(2);
@test Cas limites
expect([pieces([2], 3), pieces([5], 0), pieces([1, 2, 5], 11)]).toEqual([-1, 0, 3]);
@test Rapide
const t = performance.now(); expect(pieces([7, 13, 29], 50_000)).toBeGreaterThan(1000); expect(performance.now() - t).toBeLessThan(800);
@hint
`t[c]` : nombre minimal pour `c`. `t[0] = 0`, et `t[c] = 1 + min(t[c - v])`.
@solution
function pieces(valeurs: number[], cible: number): number {
  const t = new Array<number>(cible + 1).fill(Infinity);
  t[0] = 0;
  for (let c = 1; c <= cible; c++) {
    for (const v of valeurs) {
      if (v <= c) t[c] = Math.min(t[c], t[c - v] + 1);
    }
  }
  return Number.isFinite(t[cible]) ? t[cible] : -1;
}

@@ code distance-edition | Distance d'édition | ts
`distance(a, b)` : le nombre minimal d'insertions, suppressions ou remplacements d'une lettre pour passer de `a` à `b` (Levenshtein). Elle sert aux correcteurs d'orthographe.
@starter
function distance(a: string, b: string): number {
  return 0;
}
@test Exemples
expect([distance('chat', 'chats'), distance('niche', 'chiens'), distance('', 'abc'), distance('abc', 'abc')]).toEqual([1, 5, 3, 0]);
@test Symétrique
expect(distance('intention', 'execution')).toBe(5); expect(distance('execution', 'intention')).toBe(5);
@test Rapide
const t = performance.now(); distance('ab'.repeat(500), 'ba'.repeat(500)); expect(performance.now() - t).toBeLessThan(1000);
@hint
`t[i][j]` : distance entre les `i` premières lettres de `a` et les `j` premières de `b`. Si les lettres sont égales : `t[i-1][j-1]`. Sinon, 1 + le minimum des trois voisins.
@solution
function distance(a: string, b: string): number {
  let ligne = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const suivante = [i];
    for (let j = 1; j <= b.length; j++) {
      suivante[j] = a[i - 1] === b[j - 1]
        ? ligne[j - 1]
        : 1 + Math.min(ligne[j - 1], ligne[j], suivante[j - 1]);
    }
    ligne = suivante;
  }
  return ligne[b.length];
}

@@ code suite-croissante | La plus longue suite croissante | ts
`plusLongueSuite(liste)` renvoie **une** plus longue sous-suite **strictement croissante** (les éléments gardent leur ordre, sans être forcément voisins). Au plus O(n²).
@starter
function plusLongueSuite(liste: number[]): number[] {
  return [];
}
@test Longueur
expect(plusLongueSuite([10, 9, 2, 5, 3, 7, 101, 18])).toHaveLength(4); expect([plusLongueSuite([]), plusLongueSuite([3, 2, 1]).length, plusLongueSuite([2, 2, 2]).length]).toEqual([[], 1, 1]);
@test La suite est valable
const l = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]; const s = plusLongueSuite(l); expect(s).toHaveLength(6); let i = 0; for (const x of l) if (x === s[i]) i++; expect(i).toBe(6); expect(s.every((x, k) => k === 0 || s[k - 1] < x)).toBe(true);
@test Rapide
const t = performance.now(); expect(plusLongueSuite(Array.from({ length: 3000 }, (_, i) => i))).toHaveLength(3000); expect(performance.now() - t).toBeLessThan(1500);
@hint
Pour chaque position : la longueur de la meilleure suite qui **finit** là, et l'indice précédent pour la reconstruire.
@solution
function plusLongueSuite(liste: number[]): number[] {
  const longueur: number[] = [];
  const avant: number[] = [];
  let fin = -1;
  for (let i = 0; i < liste.length; i++) {
    longueur[i] = 1;
    avant[i] = -1;
    for (let j = 0; j < i; j++) {
      if (liste[j] < liste[i] && longueur[j] + 1 > longueur[i]) {
        longueur[i] = longueur[j] + 1;
        avant[i] = j;
      }
    }
    if (fin < 0 || longueur[i] > longueur[fin]) fin = i;
  }
  const suite: number[] = [];
  for (let i = fin; i >= 0; i = avant[i]) suite.unshift(liste[i]);
  return suite;
}

@@ defi diff | Un diff de fichiers | ts
Comme `git diff` : `diff(avant, apres)` reçoit deux tableaux de lignes et renvoie le plus petit changement, sous forme de lignes `' x'` (gardée), `'-x'` (retirée), `'+x'` (ajoutée). Dans un même endroit, les retraits viennent **avant** les ajouts.
@starter
function diff(avant: string[], apres: string[]): string[] {
  return [];
}
@test Exemple
expect(diff(['a', 'b', 'c'], ['a', 'x', 'c', 'd'])).toEqual([' a', '-b', '+x', ' c', '+d']);
@test Cas limites
expect([diff([], []), diff(['a'], []), diff([], ['a']), diff(['a'], ['a'])]).toEqual([[], ['-a'], ['+a'], [' a']]);
@test Le plus petit changement
const a = 'abcabba'.split(''); const b = 'cbabac'.split(''); const d = diff(a, b); expect(d.filter((l) => l[0] !== ' ')).toHaveLength(5); expect(d.filter((l) => l[0] !== '+').map((l) => l.slice(1))).toEqual(a); expect(d.filter((l) => l[0] !== '-').map((l) => l.slice(1))).toEqual(b);
@test Retraits avant ajouts
expect(diff(['1', '2', '3'], ['x', 'y', '3'])).toEqual(['-1', '-2', '+x', '+y', ' 3']);
@test Rapide
const l = Array.from({ length: 600 }, (_, i) => `l${i}`); const t = performance.now(); diff(l, l.toReversed()); expect(performance.now() - t).toBeLessThan(1500);
@hint
Calcule la plus longue sous-suite commune des **fins** de liste (`t[i][j]` pour `avant` à partir de `i` et `apres` à partir de `j`), puis parcours depuis le début.
@solution
function diff(avant: string[], apres: string[]): string[] {
  const n = avant.length;
  const m = apres.length;
  // t[i][j] : longueur commune maximale de avant[i…] et apres[j…]
  const t = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      t[i][j] = avant[i] === apres[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    }
  }

  const lignes: string[] = [];
  let retraits: string[] = [];
  let ajouts: string[] = [];
  const vider = () => {
    lignes.push(...retraits, ...ajouts);
    retraits = [];
    ajouts = [];
  };
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && avant[i] === apres[j]) {
      vider();
      lignes.push(` ${avant[i]}`);
      i++;
      j++;
    } else if (j >= m || (i < n && t[i + 1][j] >= t[i][j + 1])) {
      retraits.push(`-${avant[i++]}`);
    } else {
      ajouts.push(`+${apres[j++]}`);
    }
  }
  vider();
  return lignes;
}

@@ predict dp-conditions
Quand la programmation dynamique aide-t-elle ?
@answer Quand les sous-problèmes se répètent
@wrong Dès qu'il y a une récursion
@wrong Quand les données sont triées
@wrong Quand il n'y a qu'une solution
@why Si chaque sous-problème n'apparaît qu'une fois, il n'y a rien à mémoriser.

@@ predict glouton
Pièces 1, 3, 4, cible 6. Que donne un algorithme glouton (la plus grande d'abord) ?
@answer 3 pièces : 4 + 1 + 1
@wrong 2 pièces : 3 + 3
@wrong 6 pièces
@wrong Aucune solution
@why Le meilleur choix immédiat n'est pas toujours dans la meilleure solution.

@@ card dp-methode
Les étapes de la programmation dynamique ?
@back
État, récurrence, cas de base, ordre de calcul, puis réduire la mémoire.

@@ card haut-bas
De haut en bas, ou de bas en haut ?
@back
Haut en bas : récursion + mémoire. Bas en haut : on remplit un tableau dans l'ordre.
