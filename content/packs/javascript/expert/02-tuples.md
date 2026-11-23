# Tuples et récursion
> Parcourir des tuples avec les types, et même compter.

@@ lesson tuples | Programmer avec des tuples

Les types conditionnels sont un petit langage **fonctionnel** : pas de variables ni de boucles, seulement de la récursion. Les tuples en sont les listes.

```ts
type Tete<T extends unknown[]> = T extends [infer H, ...unknown[]] ? H : never;
type Queue<T extends unknown[]> = T extends [unknown, ...infer Q] ? Q : [];
type Dernier<T extends unknown[]> = T extends [...unknown[], infer D] ? D : never;
type Longueur<T extends unknown[]> = T['length'];
type Ajouter<T extends unknown[], X> = [...T, X];
```

Le schéma récursif : cas vide, sinon traiter la tête et continuer sur la queue.

```ts
type Inverser<T extends unknown[]> =
  T extends [infer H, ...infer Q] ? [...Inverser<Q>, H] : [];
```

### Accumulateur

Avec un paramètre supplémentaire (valeur par défaut), la récursion est **terminale** : TypeScript la mène jusqu'à 1000 niveaux au lieu d'une cinquantaine.

```ts
type InverserT<T extends unknown[], Acc extends unknown[] = []> =
  T extends [infer H, ...infer Q] ? InverserT<Q, [H, ...Acc]> : Acc;
```

### Compter

Les types ne savent pas additionner, mais un tuple a une **longueur** :

```ts
type Repeter<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : Repeter<N, [...Acc, unknown]>;
type Plus<A extends number, B extends number> = [...Repeter<A>, ...Repeter<B>]['length'];
type Cinq = Plus<2, 3>; // 5
```

### Mapped types sur des tuples

Un mapped type **homomorphe** garde la forme du tuple :

```ts-run
type EnPromesses<T extends unknown[]> = { [I in keyof T]: Promise<T[I]> };
const p: EnPromesses<[number, string]> = [Promise.resolve(1), Promise.resolve('a')];
console.log(await Promise.all(p));
```

C'est ainsi que sont typées `Promise.all` ou les zips.

@@ code listes-types | Les fonctions de liste | ts
- `Inverse<T>`, `Concat<A, B>`
- `Contient<T, X>` : booléen, avec une égalité **exacte** (utilise `$Equal`)
- `Aplatir<T>` : aplatit complètement
- `Zip<A, B>` : `[[a1, b1], [a2, b2]]`, jusqu'au plus court
@starter

@types `Inverse` et `Concat`
type _ = [$Expect<$Equal<Inverse<[1, 2, 3]>, [3, 2, 1]>>, $Expect<$Equal<Inverse<[]>, []>>, $Expect<$Equal<Concat<[1], [2, 3]>, [1, 2, 3]>>];
@types `Contient`
type _ = [$Expect<$Equal<Contient<[1, 2], 2>, true>>, $Expect<$Equal<Contient<[1, 2], 3>, false>>, $Expect<$Equal<Contient<[1 | 2], 1>, false>>, $Expect<$Equal<Contient<[], never>, false>>];
@types `Aplatir`
type _ = $Expect<$Equal<Aplatir<[1, [2, [3, [4]]], 5]>, [1, 2, 3, 4, 5]>>;
@types `Zip`
type _ = [$Expect<$Equal<Zip<[1, 2], ['a', 'b']>, [[1, 'a'], [2, 'b']]>>, $Expect<$Equal<Zip<[1], []>, []>>, $Expect<$Equal<Zip<[1, 2], ['a']>, [[1, 'a']]>>];
@solution
type Inverse<T extends unknown[]> = T extends [infer H, ...infer Q] ? [...Inverse<Q>, H] : [];
type Concat<A extends unknown[], B extends unknown[]> = [...A, ...B];
type Contient<T extends unknown[], X> =
  T extends [infer H, ...infer Q] ? ($Equal<H, X> extends true ? true : Contient<Q, X>) : false;
type Aplatir<T extends unknown[]> =
  T extends [infer H, ...infer Q]
    ? H extends unknown[] ? [...Aplatir<H>, ...Aplatir<Q>] : [H, ...Aplatir<Q>]
    : [];
type Zip<A extends unknown[], B extends unknown[]> =
  A extends [infer X, ...infer Q]
    ? B extends [infer Y, ...infer R] ? [[X, Y], ...Zip<Q, R>] : []
    : [];

@@ code compter | Compter avec des types | ts
Pour des entiers positifs, jusqu'à 100 au moins :

- `Plus<A, B>`, `Moins<A, B>` (`never` si négatif)
- `Inferieur<A, B>` : A < B ?
- `Intervalle<A, B>` : l'union des nombres de A à B compris
@starter

@types `Plus`
type _ = [$Expect<$Equal<Plus<2, 3>, 5>>, $Expect<$Equal<Plus<0, 0>, 0>>, $Expect<$Equal<Plus<60, 40>, 100>>];
@types `Moins`
type _ = [$Expect<$Equal<Moins<5, 3>, 2>>, $Expect<$Equal<Moins<3, 3>, 0>>, $Expect<$Equal<Moins<3, 5>, never>>];
@types `Inferieur`
type _ = [$Expect<$Equal<Inferieur<2, 3>, true>>, $Expect<$Equal<Inferieur<3, 3>, false>>, $Expect<$Equal<Inferieur<9, 1>, false>>];
@types `Intervalle`
type _ = [$Expect<$Equal<Intervalle<2, 5>, 2 | 3 | 4 | 5>>, $Expect<$Equal<Intervalle<4, 4>, 4>>];
@hint
`Moins` : `Repeter<A> extends [...Repeter<B>, ...infer Reste] ? Reste['length'] : never`.
@solution
type Repeter<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : Repeter<N, [...Acc, unknown]>;
type Plus<A extends number, B extends number> = [...Repeter<A>, ...Repeter<B>]['length'];
type Moins<A extends number, B extends number> =
  Repeter<A> extends [...Repeter<B>, ...infer Reste] ? Reste['length'] : never;
type Inferieur<A extends number, B extends number> =
  A extends B ? false : [Moins<B, A>] extends [never] ? false : true;
type Intervalle<A extends number, B extends number, Acc extends unknown[] = Repeter<A>> =
  Acc['length'] extends B ? B : Acc['length'] | Intervalle<A, B, [...Acc, unknown]>;

@@ code tuyau-type | Un tuyau typé de toute longueur | ts
`tuyau(...fonctions)` renvoie une fonction qui les applique de gauche à droite. Chaque fonction doit accepter ce que renvoie la précédente, pour **n'importe quel nombre** de fonctions (au moins une). La première peut avoir plusieurs paramètres.
@starter
type Fn = (...args: any[]) => any;

function tuyau(...fonctions) {
}
@test Compose
expect(tuyau((a, b) => a + b, (n) => n * 10, (n) => `=${n}`)(1, 2)).toBe('=30'); expect(tuyau((x) => x)(4)).toBe(4);
@types Types de départ et d'arrivée
const f = tuyau((a: number, b: number) => a + b, (n: number) => n > 3, (b: boolean) => [b]);
type _ = $Expect<$Equal<typeof f, (a: number, b: number) => boolean[]>>;
@types Une seule fonction
const f = tuyau((s: string) => s.length); type _ = $Expect<$Equal<typeof f, (s: string) => number>>;
@types Chaîne cassée refusée
// @ts-expect-error
tuyau((a: number) => a, (s: string) => s);
// @ts-expect-error
tuyau((a: number) => a, (n: number) => String(n), (n: number) => n);
@hint
Un type `Verifier<F>` parcourt le tuple et remplace une fonction incompatible par celle attendue. Le paramètre : `...fonctions: F & Verifier<F>`, ou `F extends Verifier<F> ? F : Verifier<F>`.
@solution
type Fn = (...args: any[]) => any;

type Verifier<F extends Fn[]> =
  F extends [infer A extends Fn, infer B extends Fn, ...infer Reste extends Fn[]]
    ? [A, ...Verifier<[ReturnType<A> extends Parameters<B>[0] ? B : (x: ReturnType<A>) => ReturnType<B>, ...Reste]>]
    : F;

type Dernier<F extends Fn[]> = F extends [...Fn[], infer D extends Fn] ? D : never;

function tuyau<F extends [Fn, ...Fn[]]>(
  ...fonctions: F & Verifier<F>
): (...args: Parameters<F[0]>) => ReturnType<Dernier<F>> {
  const [premiere, ...suite] = fonctions as Fn[];
  return (...args) => suite.reduce((x, f) => f(x), premiere(...args));
}

@@ defi trier-type | Trier un tuple | ts
`Trier<T>` trie un tuple d'entiers positifs (jusqu'à 50) par ordre croissant, doublons gardés, **dans les types**.
@starter

@types Trie
type _ = [$Expect<$Equal<Trier<[3, 1, 2]>, [1, 2, 3]>>, $Expect<$Equal<Trier<[]>, []>>, $Expect<$Equal<Trier<[7]>, [7]>>];
@types Doublons
type _ = $Expect<$Equal<Trier<[2, 1, 2, 0, 1]>, [0, 1, 1, 2, 2]>>;
@types Plus long
type _ = $Expect<$Equal<Trier<[30, 4, 50, 8, 15, 16, 23, 42, 1]>, [1, 4, 8, 15, 16, 23, 30, 42, 50]>>;
@hint
Un tri rapide : sépare la queue en plus petits et plus grands que la tête, avec deux accumulateurs.
@solution
type Repeter<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : Repeter<N, [...Acc, unknown]>;

// A <= B
type AuPlus<A extends number, B extends number> =
  Repeter<B> extends [...Repeter<A>, ...unknown[]] ? true : false;

type Filtrer<T extends number[], P extends number, Petits extends boolean, Acc extends number[] = []> =
  T extends [infer H extends number, ...infer Q extends number[]]
    ? Filtrer<Q, P, Petits, AuPlus<H, P> extends Petits ? [...Acc, H] : Acc>
    : Acc;

type Trier<T extends number[]> =
  T extends [infer P extends number, ...infer Q extends number[]]
    ? [...Trier<Filtrer<Q, P, true>>, P, ...Trier<Filtrer<Q, P, false>>]
    : [];

@@ predict longueur-tuple
Quel est le type `T` ?
```ts
type T = [1, 2, ...[3, 4]]['length'];
```
@answer `4`
@wrong `number`
@wrong `3`
@wrong `2`
@why Un tuple a une longueur littérale.

@@ predict mapped-tuple
Quel est le type `T` ?
```ts
type F<X> = { [K in keyof X]: X[K][] };
type T = F<[1, 'a']>;
```
@answer `[1[], 'a'[]]`
@wrong `{ 0: 1[]; 1: 'a'[] }`
@wrong `(1 | 'a')[][]`
@wrong `[1, 'a'][]`
@why Un mapped type sur `keyof X` garde la forme d'un tuple.

@@ card tete-queue
Séparer la tête et la queue d'un tuple ?
@back
`T extends [infer H, ...infer Q] ? … : …`

@@ card compter-types
Comment additionner dans les types ?
@back
Avec la longueur de tuples : `[...A, ...B]['length']`
