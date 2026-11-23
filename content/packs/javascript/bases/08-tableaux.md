# Tableaux
> Créer, lire, ajouter, retirer, copier.

@@ lesson tableaux | Les tableaux

```js-run
const fruits = ['pomme', 'kiwi', 'poire'];
console.log(fruits.length, fruits[0], fruits.at(-1), fruits[9]);
fruits[1] = 'mangue';
console.log(fruits);
console.log(Array.isArray(fruits), typeof fruits);
```

`const` empêche de **réaffecter** la variable, pas de modifier le contenu du tableau.

### Ajouter, retirer (modifie le tableau)

| | Au début | À la fin |
|---|---|---|
| Ajouter | `unshift(x)` | `push(x)` |
| Retirer (et renvoyer) | `shift()` | `pop()` |

```js-run
const file = ['a', 'b'];
file.push('c');
console.log(file.shift(), file);
// splice(position, combien retirer, ...à insérer)
const l = [1, 2, 3, 4];
l.splice(1, 2, 'x');
console.log(l);
```

### Copier plutôt que modifier

```js-run
const a = [3, 1, 2];
console.log([...a, 4], a.concat([5, 6]), a.slice(1)); // a ne bouge pas
console.log(a.toSorted(), a.toReversed(), a.with(0, 99)); // copies modifiées
console.log(a);
```

`sort()` et `reverse()` modifient **sur place** ; `toSorted()` et `toReversed()` renvoient une copie.

### Références

Une variable ne contient pas le tableau, mais une **référence** vers lui :

```js-run
const a = [1, 2];
const b = a;     // le MÊME tableau
const c = [...a]; // une copie
b.push(3);
console.log(a, c);
```

### Chercher, trier

```js-run
const n = [10, 9, 1];
console.log(n.includes(9), n.indexOf(9));
console.log(n.toSorted());                // comme du texte !
console.log(n.toSorted((a, b) => a - b)); // croissant
console.log(n.toSorted((a, b) => b - a)); // décroissant
```

La fonction de comparaison renvoie un nombre négatif si `a` doit passer avant `b`, positif s'il doit passer après, 0 sinon.

### Fabriquer

```js-run
console.log(Array.from({ length: 4 }, (_, i) => i * i));
console.log(new Array(3).fill(0), Array.from('abc'), [[1, 2], [3]].flat());
```

### En TypeScript

`number[]` (ou `Array<number>`, pareil). Un **tuple** a une longueur fixe et un type par position :

```ts-run
const notes: number[] = [12, 15];
const point: [number, number] = [48.8, 2.3];
const mixte: (string | number)[] = ['a', 1];
const gele: readonly number[] = [1, 2]; // push interdit
console.log(notes, point, mixte, gele);
```

@@ code pile | Ajouter et retirer | js
À partir de `liste`, fais dans l'ordre :

1. ajoute `'d'` à la fin
2. retire le premier élément, et range-le dans `premier`
3. ajoute `'z'` au début
4. remplace l'élément d'indice 1 par `'B'`
@starter
const liste = ['a', 'b', 'c'];

@test La liste finale
expect(liste).toEqual(['z', 'B', 'c', 'd']);
@test `premier` vaut `'a'`
expect(premier).toBe('a');
@solution
const liste = ['a', 'b', 'c'];

liste.push('d');
const premier = liste.shift();
liste.unshift('z');
liste[1] = 'B';

@@ code sans-modifier | Sans modifier l'original | js
Écris ces fonctions. Aucune ne doit modifier le tableau reçu.

- `ajouter(liste, x)` : une copie avec `x` à la fin
- `retirer(liste, i)` : une copie sans l'élément d'indice `i`
- `remplacer(liste, i, x)` : une copie où l'élément `i` vaut `x`
- `trier(liste)` : une copie triée par ordre croissant (nombres)
@starter

@test `ajouter`
const l1 = [1, 2]; expect(ajouter(l1, 3)).toEqual([1, 2, 3]); expect(l1).toEqual([1, 2]);
@test `retirer`
const l2 = [1, 2, 3]; expect(retirer(l2, 1)).toEqual([1, 3]); expect(retirer(l2, 0)).toEqual([2, 3]); expect(l2).toEqual([1, 2, 3]);
@test `remplacer`
const l3 = [1, 2, 3]; expect(remplacer(l3, 2, 9)).toEqual([1, 2, 9]); expect(l3).toEqual([1, 2, 3]);
@test `trier`
const l4 = [10, 9, 1]; expect(trier(l4)).toEqual([1, 9, 10]); expect(l4).toEqual([10, 9, 1]);
@hint
`[...liste.slice(0, i), ...liste.slice(i + 1)]` : tout ce qui est avant `i`, puis tout ce qui est après.
@solution
const ajouter = (liste, x) => [...liste, x];
const retirer = (liste, i) => [...liste.slice(0, i), ...liste.slice(i + 1)];
const remplacer = (liste, i, x) => liste.with(i, x);
const trier = (liste) => liste.toSorted((a, b) => a - b);

@@ code rotation | Rotation | js
`tourner(liste, n)` renvoie une copie où les `n` premiers éléments sont passés à la fin. `n` peut dépasser la longueur.
@starter
function tourner(liste, n) {
}
@test D'un cran
expect(tourner([1, 2, 3, 4], 1)).toEqual([2, 3, 4, 1]);
@test De plusieurs
expect(tourner([1, 2, 3, 4], 3)).toEqual([4, 1, 2, 3]);
@test Plus que la longueur
expect(tourner([1, 2, 3], 4)).toEqual([2, 3, 1]);
@test Tableau vide, et original intact
expect(tourner([], 2)).toEqual([]);
const l = [1, 2]; tourner(l, 1); expect(l).toEqual([1, 2]);
@hint
`n % liste.length` ramène `n` dans les limites. Pour un tableau vide, cela donne `NaN`, que `slice` prend pour 0.
@solution
function tourner(liste, n) {
  const k = n % liste.length;
  return [...liste.slice(k), ...liste.slice(0, k)];
}

@@ code grille | Une grille, en TypeScript | ts
`grille(lignes, colonnes, valeur)` renvoie un tableau de tableaux rempli de `valeur`. Chaque ligne doit être un tableau **différent**. Type la fonction (avec des nombres).
@starter
function grille() {
}
@test La bonne taille
expect(grille(2, 3, 0)).toEqual([[0, 0, 0], [0, 0, 0]]);
@test Les lignes sont indépendantes
const g = grille(2, 2, 0); g[0][0] = 5; expect(g).toEqual([[5, 0], [0, 0]]);
@test Zéro ligne
expect(grille(0, 3, 1)).toEqual([]);
@types Types des paramètres et du retour
type _ = $Expect<$Equal<typeof grille, (lignes: number, colonnes: number, valeur: number) => number[][]>>;
@hint
`new Array(2).fill(ligne)` mettrait **la même** ligne deux fois. `Array.from({ length }, () => …)` crée une ligne neuve à chaque fois.
@solution
function grille(lignes: number, colonnes: number, valeur: number): number[][] {
  return Array.from({ length: lignes }, () => Array.from({ length: colonnes }, () => valeur));
}

@@ predict reference
Qu'affiche ce code ?
```js
const a = [1];
const b = a;
b.push(2);
console.log(a.length);
```
@answer `2`
@wrong `1`
@wrong `3`
@wrong Une TypeError
@why `a` et `b` désignent le même tableau.

@@ predict tri
Qu'affiche ce code ?
```js
console.log([10, 9, 1].sort());
```
@answer `[1, 10, 9]`
@wrong `[1, 9, 10]`
@wrong `[10, 9, 1]`
@wrong `[9, 10, 1]`
@why Sans fonction de comparaison, `sort` compare les textes. Pour des nombres : `(a, b) => a - b`.

@@ predict push
Qu'affiche ce code ?
```js
const l = [1];
console.log(l.push(5), l);
```
@answer `2 [1, 5]`
@wrong `[1, 5] [1, 5]`
@wrong `5 [1, 5]`
@wrong `undefined [1, 5]`
@why `push` renvoie la nouvelle longueur.

@@ predict splice-slice
Qu'affiche ce code ?
```js
const l = [1, 2, 3, 4];
console.log(l.splice(1, 2), l);
```
@answer `[2, 3] [1, 4]`
@wrong `[2, 3] [1, 2, 3, 4]`
@wrong `[1, 4] [2, 3]`
@wrong `[2] [1, 3, 4]`
@why `splice` modifie le tableau et renvoie ce qu'il a retiré ; `slice` ne modifie rien.

@@ card push-pop
Ajouter/retirer à la fin ? Au début ?
@back
Fin : `push` / `pop`. Début : `unshift` / `shift`.

@@ card copie
Comment copier un tableau `a` ?
@back
`[...a]` (ou `a.slice()`). C'est une copie de surface.

@@ card sort
Trier des nombres dans l'ordre croissant, sans modifier le tableau ?
@back
`liste.toSorted((a, b) => a - b)`

@@ card tuple
Type TypeScript d'une paire texte + nombre ?
@back
Un tuple : `[string, number]`

@@ defi matrices | Tourner une matrice | js
Pour des matrices rectangulaires (tableaux de lignes), sans modifier l'original :

- `transposer(m)` : les lignes deviennent des colonnes
- `tourner(m)` : un quart de tour dans le sens des aiguilles d'une montre
- `multiplier(a, b)` : le produit, ou `null` si les tailles ne conviennent pas
@starter

@test `transposer`
expect(transposer([[1, 2, 3], [4, 5, 6]])).toEqual([[1, 4], [2, 5], [3, 6]]); expect(transposer([])).toEqual([]);
@test `tourner`
expect(tourner([[1, 2, 3], [4, 5, 6]])).toEqual([[4, 1], [5, 2], [6, 3]]);
@test Quatre quarts de tour
const m = [[1, 2], [3, 4], [5, 6]]; expect(tourner(tourner(tourner(tourner(m))))).toEqual(m);
@test `multiplier`
expect(multiplier([[1, 2], [3, 4]], [[5, 6], [7, 8]])).toEqual([[19, 22], [43, 50]]); expect(multiplier([[1, 2, 3]], [[1], [2], [3]])).toEqual([[14]]); expect(multiplier([[1, 2]], [[1, 2]])).toBe(null);
@hint
Tourner, c'est transposer, puis inverser chaque ligne.
@solution
const transposer = (m) => (m[0] ?? []).map((_, c) => m.map((ligne) => ligne[c]));

const tourner = (m) => transposer(m).map((ligne) => ligne.toReversed());

function multiplier(a, b) {
  if ((a[0]?.length ?? 0) !== b.length) return null;
  const colonnes = transposer(b);
  return a.map((ligne) => colonnes.map((colonne) => {
    let total = 0;
    for (let i = 0; i < ligne.length; i++) total += ligne[i] * colonne[i];
    return total;
  }));
}
