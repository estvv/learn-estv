# Typer les fonctions
> Surcharges, this, callbacks, variance et paramètres en tuple.

@@ lesson fonctions-types | Les fonctions en détail

### Écrire un type de fonction

```ts
type Comparer<T> = (a: T, b: T) => number;
interface Avec { (x: string): number; methode(x: number): void }
type Constructeur<T> = new (...args: any[]) => T; // une classe qui fabrique des T
```

### Retour void

Un **type** de callback qui renvoie `void` accepte une fonction qui renvoie autre chose (le résultat est ignoré) :

```ts-run
const noms: string[] = [];
['a', 'b'].forEach((x) => noms.push(x)); // push renvoie un nombre : accepté
console.log(noms);
```

### Moins de paramètres, c'est permis

Une fonction qui ignore des arguments convient partout où on en donne plus : c'est pour cela que `[1].map((n) => n)` marche.

En revanche, les types des paramètres se comparent **à l'envers** (*contravariance*) : pour une `(a: Chien) => void` attendue, une fonction qui accepte **tout** `Animal` convient ; pas l'inverse.

### Surcharges

Plusieurs signatures, une seule implémentation (qui n'est pas visible de l'extérieur) :

```ts-run
function lire(id: number): { id: number };
function lire(ids: number[]): { id: number }[];
function lire(x: number | number[]): { id: number } | { id: number }[] {
  return Array.isArray(x) ? x.map((id) => ({ id })) : { id: x };
}
console.log(lire(1).id, lire([1, 2]).length);
```

Si une union ou un générique suffit, préfère-les : plus simple.

### this

Un faux premier paramètre, qui disparaît à la compilation :

```ts-run
function presenter(this: { nom: string }, ponctuation: string): string {
  return this.nom + ponctuation;
}
console.log(presenter.call({ nom: 'Ada' }, '!'));
```

### Paramètres en tuple

`Parameters<F>` est un tuple, qu'on peut étaler. C'est la clé pour **envelopper** une fonction en gardant son type :

```ts-run
function journaliser<A extends unknown[], R>(f: (...args: A) => R): (...args: A) => R {
  return (...args) => {
    console.log('appel', args);
    return f(...args);
  };
}
const plus = journaliser((a: number, b: number) => a + b);
console.log(plus(1, 2)); // (a: number, b: number) => number
```

Les tuples peuvent avoir des noms, des éléments facultatifs et un reste : `[x: number, y?: number, ...autres: string[]]`.

@@ code surcharges | Des surcharges | ts
`creer(balise)` renvoie `{ balise, enfants: [] }` de type `Element2`. `creer(balise, texte)` renvoie `{ balise, texte }` de type `Texte`. Écris les deux surcharges.
@starter
interface Element2 {
  balise: string;
  enfants: Element2[];
}
interface Texte {
  balise: string;
  texte: string;
}

@test Sans texte
expect(creer('div')).toEqual({ balise: 'div', enfants: [] });
@test Avec texte, même vide
expect(creer('p', 'salut')).toEqual({ balise: 'p', texte: 'salut' }); expect(creer('p', '')).toEqual({ balise: 'p', texte: '' });
@types Le retour dépend de l'appel
const a = creer('div'); const b = creer('p', 'x');
type _ = [$Expect<$Equal<typeof a, Element2>>, $Expect<$Equal<typeof b, Texte>>];
@types Appel incorrect refusé
// @ts-expect-error
creer('p', 3);
@solution
interface Element2 {
  balise: string;
  enfants: Element2[];
}
interface Texte {
  balise: string;
  texte: string;
}

function creer(balise: string): Element2;
function creer(balise: string, texte: string): Texte;
function creer(balise: string, texte?: string): Element2 | Texte {
  return texte === undefined ? { balise, enfants: [] } : { balise, texte };
}

@@ code chrono | Envelopper en gardant le type | ts
`unSeulAppel(f)` renvoie une fonction avec **exactement** les mêmes paramètres et le même retour que `f`, qui n'appelle `f` qu'une fois et redonne toujours son premier résultat.
@starter
function unSeulAppel(f) {
}
@test Marche
let n = 0; const g = unSeulAppel((a, b) => { n++; return a + b; }); expect([g(1, 2), g(5, 5), n]).toEqual([3, 3, 1]);
@types Garde la signature
const g = unSeulAppel((a: number, b: string) => a > b.length); type _ = $Expect<$Equal<typeof g, (a: number, b: string) => boolean>>;
@types Vérifie les arguments
const g = unSeulAppel((a: number) => a);
// @ts-expect-error
g('x');
@test Sans `any`
expect($source).not.toMatch(/\bany\b/);
@hint
Pour savoir si l'appel a eu lieu tout en gardant le type : `let memo: { valeur: R } | undefined;`
@solution
function unSeulAppel<A extends unknown[], R>(f: (...args: A) => R): (...args: A) => R {
  let memo: { valeur: R } | undefined;
  return (...args) => {
    memo ??= { valeur: f(...args) };
    return memo.valeur;
  };
}

@@ code tuyau | Un tuyau typé | ts
`tuyau(valeur, f, g)` applique `f` puis `g`. Chaque fonction reçoit le type produit par la précédente. Puis `fabriquer(Classe, ...args)`, qui crée une instance de la classe donnée, avec les bons types d'arguments.
@starter

@test `tuyau`
expect(tuyau(' 42 ', (s) => Number(s), (n) => n > 10)).toBe(true);
@test `fabriquer`
class P { constructor(x, y) { this.x = x; this.y = y; } } const p = fabriquer(P, 1, 2); expect(p).toBeInstanceOf(P); expect(p.y).toBe(2);
@types `tuyau` relie les types
const r = tuyau('a', (s) => s.length, (n) => n.toFixed(1)); type _ = $Expect<$Equal<typeof r, string>>;
// @ts-expect-error
tuyau('a', (s) => s.length, (s: string) => s);
@types `fabriquer` vérifie les arguments
class P { constructor(public x: number, public nom: string) {} }
const p = fabriquer(P, 1, 'a'); type _ = $Expect<$Equal<typeof p, P>>;
// @ts-expect-error
fabriquer(P, 'a', 1);
@hint
`new (...args: A) => T` est le type d'une classe qui se construit avec `A` et donne un `T`.
@solution
function tuyau<A, B, C>(valeur: A, f: (a: A) => B, g: (b: B) => C): C {
  return g(f(valeur));
}

function fabriquer<A extends unknown[], T>(Classe: new (...args: A) => T, ...args: A): T {
  return new Classe(...args);
}

@@ predict void
Que dit TypeScript ?
```ts
const f: () => void = () => 42;
```
@answer Rien : c'est accepté
@wrong Erreur : `number` n'est pas `void`
@wrong `f` est de type `() => number`
@wrong Erreur à l'exécution
@why Un type de fonction qui renvoie `void` accepte n'importe quel retour : il sera ignoré.

@@ predict moins-params
Que dit TypeScript ?
```ts
const f: (a: number, b: number) => number = (a) => a;
```
@answer Rien : c'est accepté
@wrong Erreur : il manque `b`
@wrong Erreur : `a` est implicitement `any`
@wrong Erreur : le retour diffère
@why Ignorer des arguments est toujours permis.

@@ card params-tuple
Comment écrire une fonction qui enveloppe `f` en gardant ses paramètres et son retour ?
@back
`<A extends unknown[], R>(f: (...args: A) => R) => (...args: A) => R`

@@ card type-constructeur
Type d'une classe qui fabrique des `T` ?
@back
`new (...args: any[]) => T`

@@ defi curry-type | curry, avec les types | ts
`curry(f)` transforme une fonction en fonctions **à un argument** : `(a, b, c) => d` devient `(a) => (b) => (c) => d`, types compris. Une fonction à un seul paramètre reste telle quelle. Ajoute `partielle(f, ...debut)`, qui fixe les **premiers** arguments, en vérifiant leurs types.
@starter

@test `curry`
expect([curry((a, b, c) => [a, b, c])(1)(2)(3), curry((a) => a * 2)(4)]).toEqual([[1, 2, 3], 8]);
@test Réutilisable
const f = curry((a, b) => a + b)(10); expect([f(1), f(2)]).toEqual([11, 12]);
@test `partielle`
expect([partielle((a, b, c) => a + b + c, 'x', 'y')('z'), partielle((a) => a, 5)()]).toEqual(['xyz', 5]);
@types `curry`
const f = curry((a: number, b: string, c: boolean) => new Date()); type _ = $Expect<$Equal<typeof f, (a: number) => (a: string) => (a: boolean) => Date>>;
@types `partielle`
const f = partielle((a: number, b: string, c: boolean) => 1, 5, 'x'); type _ = $Expect<$Equal<Parameters<typeof f>, [c: boolean]>>; const n: number = f(true);
// @ts-expect-error
partielle((a: number, b: string) => 1, 'x');
// @ts-expect-error
partielle((a: number) => 1, 1, 2);
@hint
`type Curry<A extends unknown[], R> = A extends [infer X, ...infer Q] ? (a: X) => (Q extends [] ? R : Curry<Q, R>) : () => R`
@hint
Dans `partielle`, deux listes de paramètres : `<D extends unknown[], S extends unknown[], R>(f: (...args: [...D, ...S]) => R, ...debut: D)`.
@solution
type Curry<A extends unknown[], R> =
  A extends [infer X, ...infer Q] ? (a: X) => Q extends [] ? R : Curry<Q, R> : () => R;

function curry<A extends unknown[], R>(f: (...args: A) => R): Curry<A, R> {
  const suite = (recus: unknown[]): unknown => (...args: unknown[]) => {
    const tous = [...recus, ...args];
    return tous.length >= f.length ? f(...(tous as A)) : suite(tous);
  };
  return suite([]) as Curry<A, R>;
}

function partielle<D extends unknown[], S extends unknown[], R>(
  f: (...args: [...D, ...S]) => R,
  ...debut: D
): (...suite: S) => R {
  return (...suite) => f(...debut, ...suite);
}
