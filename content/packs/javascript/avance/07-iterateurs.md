# Itérateurs et générateurs
> Ce qui se cache derrière for…of, et les suites produites à la demande.

@@ lesson iterateurs | Le protocole d'itération

`for…of`, le spread et la déstructuration marchent sur tout objet **itérable** : un objet avec une méthode `[Symbol.iterator]()` qui renvoie un **itérateur**, c'est-à-dire un objet avec une méthode `next()`.

```js-run
const it = ['a', 'b'][Symbol.iterator]();
console.log(it.next());
console.log(it.next());
console.log(it.next()); // done: true : terminé
```

À la main :

```js-run
const compteARebours = {
  debut: 3,
  [Symbol.iterator]() {
    let n = this.debut;
    return {
      next: () => (n > 0 ? { value: n--, done: false } : { value: undefined, done: true }),
    };
  },
};
console.log([...compteARebours], Math.max(...compteARebours));
```

### Générateurs

Bien plus simple : `function*` et `yield`. La fonction se met **en pause** à chaque `yield` et reprend au prochain `next()`.

```js-run
function* compter(de, a) {
  for (let i = de; i <= a; i++) yield i;
}
for (const n of compter(1, 3)) console.log(n);
console.log([...compter(5, 8)]);

const g = compter(1, 2);
console.log(g.next(), g.next(), g.next());
```

Les valeurs sont calculées **à la demande** : une suite infinie ne pose aucun problème tant qu'on s'arrête.

```js-run
function* naturels() {
  let n = 0;
  while (true) yield n++;
}
for (const n of naturels()) {
  if (n > 3) break;
  console.log(n);
}
// Méthodes des itérateurs : aussi à la demande
console.log(naturels().filter((n) => n % 2).map((n) => n * 10).take(3).toArray());
```

`yield*` délègue à un autre itérable ; et `next(valeur)` envoie une valeur **dans** le générateur :

```js-run
function* tout() {
  yield* [1, 2];
  const recu = yield 'prêt ?';
  console.log('reçu', recu);
}
const g = tout();
console.log(g.next().value, g.next().value, g.next().value);
g.next('oui');
```

Une méthode génératrice rend une classe itérable : `*[Symbol.iterator]() { yield* this.#elements; }`.

### En TypeScript

`Iterable<T>` : tout ce qui se parcourt. `Generator<T>` : ce que renvoie une fonction `function*`.

```ts-run
function* paires<T>(liste: Iterable<T>): Generator<[T, T]> {
  let avant: T | undefined;
  for (const x of liste) {
    if (avant !== undefined) yield [avant, x];
    avant = x;
  }
}
console.log([...paires([1, 2, 3])]);
```

@@ code range | range | js
Générateur `range(debut, fin, pas = 1)` : de `debut` à `fin` **non comprise**. Un pas négatif descend.
@starter
function* range(debut, fin, pas = 1) {
}
@test Monte
expect([...range(0, 4)]).toEqual([0, 1, 2, 3]);
@test Avec un pas
expect([...range(1, 10, 3)]).toEqual([1, 4, 7]);
@test Descend
expect([...range(3, 0, -1)]).toEqual([3, 2, 1]);
@test Vide
expect([...range(5, 5)]).toEqual([]);
@solution
function* range(debut, fin, pas = 1) {
  for (let n = debut; pas > 0 ? n < fin : n > fin; n += pas) yield n;
}

@@ code fibonacci | Fibonacci infini | js
- générateur **infini** `fibonacci()` : 0, 1, 1, 2, 3, 5…
- `prendre(iterable, n)` : un tableau des `n` premières valeurs, sans en demander davantage (et sans `.take`)
@starter

@test Les premiers nombres
expect(prendre(fibonacci(), 8)).toEqual([0, 1, 1, 2, 3, 5, 8, 13]);
@test `prendre` sur un tableau
expect(prendre([1, 2, 3], 2)).toEqual([1, 2]); expect(prendre([1], 5)).toEqual([1]); expect(prendre([1], 0)).toEqual([]);
@test Ne demande pas de valeur en trop
let n = 0; function* suite() { while (true) { n++; yield n; } } prendre(suite(), 3); expect(n).toBe(3);
@hint
Dans `prendre`, sors de la boucle juste **après** avoir ajouté la n-ième valeur. Et traite `n = 0` avant.
@solution
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

function prendre(iterable, n) {
  const resultat = [];
  if (n <= 0) return resultat;
  for (const x of iterable) {
    resultat.push(x);
    if (resultat.length === n) break;
  }
  return resultat;
}

@@ code liste-chainee | Liste chaînée itérable | js
Classe `Liste` : `ajouter(x)` (à la fin, renvoie `this`), getter `taille`, et **itérable**. Utilise des maillons `{ valeur, suivant }`, pas un tableau.
@starter
class Liste {
}
@test Se parcourt
expect([...new Liste().ajouter('a').ajouter('b')]).toEqual(['a', 'b']);
@test Plusieurs fois
const l = new Liste().ajouter(1); expect([[...l], [...l]]).toEqual([[1], [1]]);
@test Vide, et taille
expect([...new Liste()]).toEqual([]); expect(new Liste().ajouter(1).ajouter(2).taille).toBe(2);
@test Sans tableau
expect($source).not.toMatch(/push|\[\s*\]/);
@hint
Garde deux champs, `premier` et `dernier`. Et `*[Symbol.iterator]()` suit les `suivant`.
@solution
class Liste {
  #premier = null;
  #dernier = null;
  taille = 0;

  ajouter(valeur) {
    const maillon = { valeur, suivant: null };
    if (this.#dernier) this.#dernier.suivant = maillon;
    else this.#premier = maillon;
    this.#dernier = maillon;
    this.taille++;
    return this;
  }

  *[Symbol.iterator]() {
    for (let m = this.#premier; m; m = m.suivant) yield m.valeur;
  }
}

@@ code par-paquets | Par paquets, en TypeScript | ts
Générateur `paquets(iterable, taille)` : produit des tableaux de `taille` éléments (le dernier peut être plus court). Il doit marcher avec n'importe quel type d'éléments : `function* paquets<T>(…)`.
@starter
function* paquets() {
}
@test Découpe
expect([...paquets([1, 2, 3, 4, 5], 2)]).toEqual([[1, 2], [3, 4], [5]]);
@test Marche sur un texte
expect([...paquets('abcd', 3)]).toEqual([['a', 'b', 'c'], ['d']]);
@test Vide
expect([...paquets([], 2)]).toEqual([]);
@types Types
const g: Generator<number[]> = paquets([1, 2], 2); const h: Generator<string[]> = paquets(new Set(['a']), 1);
@types Le type des éléments est suivi
// @ts-expect-error
const g: Generator<string[]> = paquets([1, 2], 2);
@solution
function* paquets<T>(iterable: Iterable<T>, taille: number): Generator<T[]> {
  let paquet: T[] = [];
  for (const x of iterable) {
    paquet.push(x);
    if (paquet.length === taille) {
      yield paquet;
      paquet = [];
    }
  }
  if (paquet.length > 0) yield paquet;
}

@@ predict paresseux
Qu'affiche ce code ?
```js
function* g() { console.log('a'); yield 1; console.log('b'); }
const it = g();
console.log('c');
it.next();
```
@answer `c a`
@wrong `a c`
@wrong `a b c`
@wrong `c a b`
@why Appeler un générateur n'exécute rien ; `next()` avance jusqu'au premier `yield`.

@@ predict epuise
Qu'affiche ce code ?
```js
function* g() { yield 1; yield 2; }
const it = g();
console.log([...it].length, [...it].length);
```
@answer `2 0`
@wrong `2 2`
@wrong `0 0`
@wrong Une TypeError
@why Un générateur ne se parcourt qu'une fois.

@@ card iterable
Que faut-il pour qu'un objet soit itérable ?
@back
Une méthode `[Symbol.iterator]()` qui renvoie un objet avec `next()` → `{ value, done }`.

@@ card generateur
Syntaxe d'un générateur ?
@back
`function* f() { yield valeur; }`

@@ defi flux | Une bibliothèque paresseuse | ts
`flux(iterable)` renvoie un objet **paresseux** et itérable, avec `map`, `filtrer`, `prendre(n)`, `sauter(n)`, `zip(autre)`, `fenetre(n)` (tous renvoient un nouveau flux) et `tableau()`. Rien n'est calculé avant la consommation, et pas un élément de trop. Un flux se parcourt plusieurs fois si sa source le permet.
@starter

@test Enchaîne
expect(flux([1, 2, 3, 4, 5, 6]).filtrer((n) => n % 2 === 0).map((n) => n * 10).sauter(1).tableau()).toEqual([40, 60]);
@test Suites infinies, rien de trop
let vus = 0; function* n() { for (let i = 1; ; i++) { vus++; yield i; } } expect(flux(n()).map((x) => x * x).filtrer((x) => x % 2).prendre(3).tableau()).toEqual([1, 9, 25]); expect(vus).toBe(5);
@test Paresseux
let appels = 0; const f = flux([1, 2]).map((x) => { appels++; return x; }); expect(appels).toBe(0); f.tableau(); expect(appels).toBe(2);
@test `zip` et `fenetre`
expect([flux('abc').zip([1, 2]).tableau(), flux([1, 2, 3, 4]).fenetre(3).tableau(), flux([1]).fenetre(2).tableau()]).toEqual([[['a', 1], ['b', 2]], [[1, 2, 3], [2, 3, 4]], []]);
@test Se parcourt deux fois
const f = flux([1, 2, 3]).prendre(2); expect([f.tableau(), [...f]]).toEqual([[1, 2], [1, 2]]); expect(flux([1]).prendre(0).tableau()).toEqual([]);
@types Types suivis
const r = flux([1, 2]).map((n) => n.toFixed(1)).zip([true]).tableau(); type _ = $Expect<$Equal<typeof r, [string, boolean][]>>;
@solution
class Flux<T> implements Iterable<T> {
  constructor(private readonly source: () => Iterator<T>) {}

  [Symbol.iterator](): Iterator<T> {
    return this.source();
  }

  #suite<R>(generateur: (source: Iterable<T>) => Iterator<R>): Flux<R> {
    return new Flux(() => generateur(this));
  }

  map<R>(f: (x: T) => R): Flux<R> {
    return this.#suite(function* (source) {
      for (const x of source) yield f(x);
    });
  }

  filtrer(test: (x: T) => boolean): Flux<T> {
    return this.#suite(function* (source) {
      for (const x of source) if (test(x)) yield x;
    });
  }

  prendre(n: number): Flux<T> {
    return this.#suite(function* (source) {
      if (n <= 0) return;
      let pris = 0;
      for (const x of source) {
        yield x;
        if (++pris === n) return;
      }
    });
  }

  sauter(n: number): Flux<T> {
    return this.#suite(function* (source) {
      let i = 0;
      for (const x of source) if (i++ >= n) yield x;
    });
  }

  zip<U>(autre: Iterable<U>): Flux<[T, U]> {
    return this.#suite(function* (source) {
      const b = autre[Symbol.iterator]();
      for (const x of source) {
        const y = b.next();
        if (y.done) return;
        yield [x, y.value] as [T, U];
      }
    });
  }

  fenetre(n: number): Flux<T[]> {
    return this.#suite(function* (source) {
      let f: T[] = [];
      for (const x of source) {
        f = [...f, x].slice(-n);
        if (f.length === n) yield f;
      }
    });
  }

  tableau(): T[] {
    return [...this];
  }
}

const flux = <T>(iterable: Iterable<T>): Flux<T> => new Flux(() => iterable[Symbol.iterator]());
