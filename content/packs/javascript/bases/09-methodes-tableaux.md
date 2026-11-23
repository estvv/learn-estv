# map, filter, reduce
> Transformer des tableaux sans écrire de boucle.

@@ lesson methodes | Les méthodes à callback

Ces méthodes appellent ta fonction sur chaque élément, sans modifier le tableau.

### map : transformer chaque élément

```js-run
console.log([1, 2, 3].map((n) => n * 10));
console.log(['a', 'b'].map((x, i) => `${i}:${x}`)); // 2e argument : l'indice
```

### filter : garder certains éléments

```js-run
console.log([5, 12, 8, 20].filter((n) => n >= 10));
```

### reduce : tout réduire à une valeur

La fonction reçoit l'**accumulateur** et l'élément, et renvoie le nouvel accumulateur. Le deuxième argument de `reduce` est la valeur de départ : mets-le toujours.

```js-run
const total = [5, 10, 20].reduce((somme, n) => somme + n, 0);
console.log(total);
```

### Chercher

```js-run
const gens = [{ nom: 'Ada', age: 36 }, { nom: 'Linus', age: 21 }];
console.log(gens.find((p) => p.age < 30));      // l'élément, ou undefined
console.log(gens.findIndex((p) => p.age < 30)); // son indice, ou -1
console.log(gens.findLast((p) => p.age > 1));   // depuis la fin
console.log(gens.some((p) => p.age > 30));      // au moins un ?
console.log(gens.every((p) => p.age > 30));     // tous ?
```

### Et encore

```js-run
[1, 2].forEach((n) => console.log(n));           // ne renvoie rien
console.log([1, 2].flatMap((n) => [n, n * 10])); // map puis flat(1)
console.log(Object.groupBy([1, 2, 3], (n) => (n % 2 ? 'impair' : 'pair')));
```

### Enchaîner

```js-run
const panier = [
  { nom: 'livre', prix: 12, qte: 2 },
  { nom: 'stylo', prix: 2, qte: 0 },
  { nom: 'sac', prix: 30, qte: 1 },
];
const total = panier
  .filter((a) => a.qte > 0)
  .map((a) => a.prix * a.qte)
  .reduce((s, n) => s + n, 0);
console.log(total);
```

> **Boucle ou méthode ?** Une méthode dit *ce qu'on veut* (filtrer, transformer). Une boucle `for…of` reste meilleure s'il faut s'arrêter en cours de route ou faire plusieurs choses à la fois.

### En TypeScript

Les types suivent tout seuls : `[1, 2].map(String)` est un `string[]`, et `find` renvoie `T | undefined`, ce qui t'oblige à gérer l'absence. Pour `reduce` avec un accumulateur vide, précise le type :

```ts-run
const longueurs = ['a', 'bcd'].reduce<Record<string, number>>((acc, mot) => {
  acc[mot] = mot.length;
  return acc;
}, {});
console.log(longueurs);
```

@@ code trio | map, filter, reduce | js
Sans boucle :

- `doubles(liste)` : chaque nombre multiplié par 2
- `positifs(liste)` : seulement les nombres > 0
- `produit(liste)` : tous les nombres multipliés entre eux (`1` pour une liste vide)
@starter

@test `doubles`
expect(doubles([1, -2, 3])).toEqual([2, -4, 6]);
@test `positifs`
expect(positifs([1, -2, 0, 3])).toEqual([1, 3]);
@test `produit`
expect(produit([2, 3, 4])).toBe(24);
expect(produit([])).toBe(1);
@test Sans boucle
expect($source).not.toMatch(/\b(for|while)\b/);
@solution
const doubles = (liste) => liste.map((n) => n * 2);
const positifs = (liste) => liste.filter((n) => n > 0);
const produit = (liste) => liste.reduce((p, n) => p * n, 1);

@@ code noms-majeurs | Enchaîner | js
`nomsMajeurs(personnes)` renvoie les noms des personnes de 18 ans ou plus, en majuscules, triés par ordre alphabétique.
@starter
function nomsMajeurs(personnes) {
}
@test Filtre, transforme et trie
expect(nomsMajeurs([{ nom: 'Zoé', age: 20 }, { nom: 'Max', age: 12 }, { nom: 'Ali', age: 18 }])).toEqual(['ALI', 'ZOÉ']);
@test Personne
expect(nomsMajeurs([{ nom: 'Max', age: 12 }])).toEqual([]);
@hint
`.filter(…).map(…).sort()` : trier des textes par défaut convient ici.
@solution
function nomsMajeurs(personnes) {
  return personnes
    .filter((p) => p.age >= 18)
    .map((p) => p.nom.toUpperCase())
    .sort();
}

@@ code occurrences | Compter avec reduce | js
`occurrences(mots)` renvoie un objet qui donne, pour chaque mot, combien de fois il apparaît. Utilise `reduce`.
@starter
function occurrences(mots) {
}
@test Compte les mots
expect(occurrences(['a', 'b', 'a', 'a'])).toEqual({ a: 3, b: 1 });
@test Vide
expect(occurrences([])).toEqual({});
@test Utilise `reduce`
expect($source).toMatch(/\.reduce\(/);
@hint
`acc[mot] = (acc[mot] ?? 0) + 1;` puis `return acc;`
@solution
function occurrences(mots) {
  return mots.reduce((acc, mot) => {
    acc[mot] = (acc[mot] ?? 0) + 1;
    return acc;
  }, {});
}

@@ code mon-map | Réécrire map et filter | js
Pour bien comprendre, écris `monMap(liste, f)` et `monFiltre(liste, f)` **avec des boucles**. Comme les vraies, elles donnent à `f` l'élément **et** l'indice.
@starter
function monMap(liste, f) {
}

function monFiltre(liste, f) {
}
@test `monMap`
expect(monMap([1, 2], (n) => n + 1)).toEqual([2, 3]);
expect(monMap(['a', 'b'], (x, i) => x + i)).toEqual(['a0', 'b1']);
@test `monFiltre`
expect(monFiltre([1, 2, 3], (n) => n > 1)).toEqual([2, 3]);
expect(monFiltre(['a', 'b', 'c'], (_, i) => i !== 1)).toEqual(['a', 'c']);
@test Sans les vraies méthodes
expect($source).not.toMatch(/\.(map|filter|reduce|forEach)\(/);
@solution
function monMap(liste, f) {
  const resultat = [];
  for (let i = 0; i < liste.length; i++) {
    resultat.push(f(liste[i], i));
  }
  return resultat;
}

function monFiltre(liste, f) {
  const resultat = [];
  for (let i = 0; i < liste.length; i++) {
    if (f(liste[i], i)) resultat.push(liste[i]);
  }
  return resultat;
}

@@ code classement | Statistiques, en TypeScript | ts
`stats(notes)` renvoie un objet `{ min, max, moyenne }`, ou `null` si la liste est vide. Donne un type au retour.
@starter
function stats(notes: number[]) {
}
@test Trois valeurs
expect(stats([10, 20, 12])).toEqual({ min: 10, max: 20, moyenne: 14 });
@test Une seule note
expect(stats([8])).toEqual({ min: 8, max: 8, moyenne: 8 });
@test Vide
expect(stats([])).toBe(null);
@types Le type de retour
type _ = $Expect<$Equal<ReturnType<typeof stats>, { min: number; max: number; moyenne: number } | null>>;
@hint
Le type d'un objet s'écrit `{ min: number; max: number; moyenne: number }`.
@solution
function stats(notes: number[]): { min: number; max: number; moyenne: number } | null {
  if (notes.length === 0) return null;
  return {
    min: Math.min(...notes),
    max: Math.max(...notes),
    moyenne: notes.reduce((s, n) => s + n, 0) / notes.length,
  };
}

@@ predict map-parseint
Qu'affiche ce code ?
```js
console.log(['1', '2', '3'].map(parseInt));
```
@answer `[1, NaN, NaN]`
@wrong `[1, 2, 3]`
@wrong `[NaN, NaN, NaN]`
@wrong Une TypeError
@why `map` donne aussi l'indice, que `parseInt` prend pour la base : `parseInt('2', 1)` donne NaN. Écris `.map(Number)`.

@@ predict foreach
Qu'affiche ce code ?
```js
console.log([1, 2].forEach((n) => n * 2));
```
@answer `undefined`
@wrong `[2, 4]`
@wrong `[1, 2]`
@wrong `2 4`
@why `forEach` ne renvoie rien ; pour obtenir un tableau, c'est `map`.

@@ predict reduce
Qu'affiche ce code ?
```js
console.log([1, 2, 3].reduce((a, n) => a + n, '0'));
```
@answer `0123`
@wrong `6`
@wrong `06`
@wrong `NaN`
@why L'accumulateur part d'une chaîne : `+` colle les textes.

@@ predict every
Qu'affiche ce code ?
```js
console.log([].every((n) => n > 5), [].some((n) => n > 5));
```
@answer `true false`
@wrong `false false`
@wrong `true true`
@wrong `undefined undefined`
@why Sur un tableau vide, `every` est vrai (aucun contre-exemple) et `some` est faux.

@@ card map-filter
`map` ou `filter` ?
@back
`map` transforme (même longueur) ; `filter` garde les éléments pour lesquels la fonction renvoie vrai.

@@ card reduce-somme
Somme d'un tableau de nombres ?
@back
`liste.reduce((s, n) => s + n, 0)`

@@ card find
Que renvoie `find` s'il ne trouve rien ? Et `findIndex` ?
@back
`undefined`, et `-1`.

@@ defi tout-reduce | Tout avec reduce | js
Avec **seulement** `reduce` (ni boucle, ni autre méthode à callback), écris :

- `map(l, f)`, `filtrer(l, f)`
- `grouper(l, cleDe)` : un objet clé → tableau
- `aplatir(l)` : tableaux imbriqués à **toute** profondeur
- `maxPar(l, f)` : l'élément pour lequel `f` est le plus grand (le premier en cas d'égalité), `undefined` si vide
@starter

@test `map` et `filtrer`
expect([map([1, 2], (n, i) => n * 10 + i), filtrer([1, 2, 3], (n) => n !== 2)]).toEqual([[10, 21], [1, 3]]);
@test `grouper`
expect(grouper(['a', 'bb', 'c'], (s) => s.length)).toEqual({ 1: ['a', 'c'], 2: ['bb'] });
@test `aplatir`
expect(aplatir([1, [2, [3, [4, []]]], 5])).toEqual([1, 2, 3, 4, 5]);
@test `maxPar`
expect([maxPar([{ n: 1 }, { n: 5, a: 1 }, { n: 5 }], (x) => x.n), maxPar([], (x) => x), maxPar([-3, -1], (x) => x)]).toEqual([{ n: 5, a: 1 }, undefined, -1]);
@test Seulement `reduce`
expect($source).not.toMatch(/\b(for|while)\b|\.(map|filter|flat|flatMap|forEach|find|some|every|sort)\(/);
@solution
const map = (l, f) => l.reduce((acc, x, i) => [...acc, f(x, i)], []);
const filtrer = (l, f) => l.reduce((acc, x) => (f(x) ? [...acc, x] : acc), []);
const grouper = (l, cleDe) => l.reduce((acc, x) => {
  (acc[cleDe(x)] ??= []).push(x);
  return acc;
}, {});
const aplatir = (l) => l.reduce((acc, x) => [...acc, ...(Array.isArray(x) ? aplatir(x) : [x])], []);
const maxPar = (l, f) => l.reduce((max, x, i) => (i === 0 || f(x) > f(max) ? x : max), undefined);
