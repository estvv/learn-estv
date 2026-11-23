# Types conditionnels
> extends ? :, infer, distributivité, types récursifs.

@@ lesson conditionnels | Choisir un type

```ts
type EstTexte<T> = T extends string ? true : false;
type A = EstTexte<'x'>; // true
type B = EstTexte<3>;   // false
```

`T extends U ? X : Y` : si `T` est assignable à `U`, alors `X`, sinon `Y`.

### infer : extraire un morceau

```ts
type Element<T> = T extends (infer E)[] ? E : never;
type Retour<F> = F extends (...args: any[]) => infer R ? R : never;
type Contenu<P> = P extends Promise<infer V> ? V : P;
type Premier<T> = T extends [infer P, ...unknown[]] ? P : undefined;

type E = Element<string[]>;          // string
type R = Retour<() => Date>;         // Date
```

On peut contraindre ce qu'on extrait : `infer N extends number`.

### Distributivité

Sur un paramètre de type **nu**, un type conditionnel s'applique à chaque membre de l'union :

```ts
type EnTableau<T> = T extends unknown ? T[] : never;
type D = EnTableau<string | number>;       // string[] | number[]

type Ensemble<T> = [T] extends [unknown] ? T[] : never; // crochets : pas de distribution
type F = Ensemble<string | number>;        // (string | number)[]
```

C'est ainsi que marche `Exclude` : `T extends U ? never : T`. Et `never`, l'union vide, distribue sur… rien : `EnTableau<never>` est `never`.

### Récursion

```ts
type Profond<T> = T extends (infer E)[] ? Profond<E> : T;
type G = Profond<number[][][]>;            // number

type LectureSeule<T> = T extends (...args: any[]) => any ? T
  : T extends object ? { readonly [K in keyof T]: LectureSeule<T[K]> }
  : T;
```

### Lire des textes

```ts
type Extension<F> = F extends `${string}.${infer E}` ? E : never;
type H = Extension<'photo.png'>;           // 'png'

type Decouper<S extends string, Sep extends string> =
  S extends `${infer Tete}${Sep}${infer Reste}` ? [Tete, ...Decouper<Reste, Sep>] : [S];
type I = Decouper<'a-b-c', '-'>;           // ['a', 'b', 'c']
```

Un usage réel : les paramètres d'une route.

```ts-run
type Params<R extends string> =
  R extends `${string}:${infer P}/${infer Reste}` ? P | Params<Reste>
  : R extends `${string}:${infer P}` ? P
  : never;

function lien<R extends string>(route: R, params: Record<Params<R>, string>): string {
  return route.replace(/:(\w+)/g, (_, p: string) => (params as Record<string, string>)[p]!);
}
console.log(lien('/users/:id/posts/:post', { id: '1', post: '9' }));
```

> Ces types servent surtout à écrire des **bibliothèques**. Dans du code d'application, cherche d'abord le type simple.

@@ code extraire | Extraire avec infer | ts
Sans utiliser `ReturnType`, `Parameters`, `Awaited`… :

- `ElementDe<T>` : le type des éléments d'un tableau (même `readonly`), sinon `never`
- `RetourDe<F>` : le retour d'une fonction
- `PremierParam<F>` : le type du premier paramètre
- `Deballer<P>` : ce que contient une promesse, **même imbriquée** ; un autre type reste tel quel
@starter

@types `ElementDe`
type _ = [$Expect<$Equal<ElementDe<string[]>, string>>, $Expect<$Equal<ElementDe<readonly [1, 2]>, 1 | 2>>, $Expect<$Equal<ElementDe<number>, never>>];
@types `RetourDe`
type _ = $Expect<$Equal<RetourDe<(a: string) => Date>, Date>>;
@types `PremierParam`
type _ = $Expect<$Equal<PremierParam<(a: string, b: number) => void>, string>>;
@types `Deballer`
type _ = [$Expect<$Equal<Deballer<Promise<Promise<number>>>, number>>, $Expect<$Equal<Deballer<string>, string>>];
@hint
`T extends readonly (infer E)[] ? E : never`. Pour `Deballer`, la branche « vrai » s'appelle elle-même.
@solution
type ElementDe<T> = T extends readonly (infer E)[] ? E : never;
type RetourDe<F> = F extends (...args: any[]) => infer R ? R : never;
type PremierParam<F> = F extends (premier: infer P, ...autres: any[]) => unknown ? P : never;
type Deballer<P> = P extends Promise<infer V> ? Deballer<V> : P;

@@ code filtrer-union | Filtrer | ts
- `Sans<T, U>` : comme `Exclude`
- `SansNul<T>` : comme `NonNullable`
- `ClesDeType<T, V>` : l'union des clés de `T` dont la valeur est assignable à `V`
- `SeulementType<T, V>` : `T` avec seulement ces clés
@starter

@types `Sans`
type _ = $Expect<$Equal<Sans<'a' | 'b' | 1, string>, 1>>;
@types `SansNul`
type _ = $Expect<$Equal<SansNul<string | null | undefined>, string>>;
@types `ClesDeType`
type _ = $Expect<$Equal<ClesDeType<{ a: string; b: number; c: string }, string>, 'a' | 'c'>>;
@types `SeulementType`
type _ = $Expect<$Equal<SeulementType<{ a: string; b: number; c: 'x' }, string>, { a: string; c: 'x' }>>;
@test Sans les types intégrés
expect($source).not.toMatch(/Exclude|NonNullable/);
@hint
`ClesDeType` : `{ [K in keyof T]: T[K] extends V ? K : never }[keyof T]`.
@solution
type Sans<T, U> = T extends U ? never : T;
type SansNul<T> = T extends null | undefined ? never : T;
type ClesDeType<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];
type SeulementType<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };

@@ code partiel-profond | Récursif | ts
- `PartielProfond<T>` : tout facultatif, à tous les niveaux d'objets (les fonctions et les tableaux restent tels quels)
- `fusionner(base, changements)` : fusionne **en profondeur**, sans rien modifier
@starter

@test Fusionne en profondeur
const b = { a: 1, n: { x: 1, y: { z: 2 } }, l: [1, 2] }; expect(fusionner(b, { n: { y: { z: 9 } } })).toEqual({ a: 1, n: { x: 1, y: { z: 9 } }, l: [1, 2] });
@test Les tableaux sont remplacés
expect(fusionner({ l: [1, 2], a: 1 }, { l: [3] })).toEqual({ l: [3], a: 1 });
@test Ne modifie rien
const b = { n: { x: 1 } }; fusionner(b, { n: { x: 2 } }); expect(b).toEqual({ n: { x: 1 } });
@types `PartielProfond`
interface C { a: number; n: { x: string; m: { y: boolean } }; l: string[] }
const c: PartielProfond<C> = { n: { m: {} } };
// @ts-expect-error
const d: PartielProfond<C> = { n: { m: { y: 'non' } } };
// @ts-expect-error
const e: PartielProfond<C> = { l: [3] };
@types `fusionner`
const r = fusionner({ a: 1, n: { x: 'a' } }, { n: { x: 'b' } }); const s: string = r.n.x;
// @ts-expect-error
fusionner({ a: 1 }, { a: 'x' });
@hint
Dans la fonction, travaille avec `Record<string, unknown>` et une petite garde « est un objet simple », puis une assertion à la fin : le vérificateur ne peut pas suivre une fusion récursive.
@solution
type PartielProfond<T> = T extends ((...args: any[]) => unknown) | readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: PartielProfond<T[K]> }
    : T;

const estObjet = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

function fusionner<T extends object>(base: T, changements: PartielProfond<NoInfer<T>>): T {
  const resultat: Record<string, unknown> = Object.fromEntries(Object.entries(base));
  for (const [cle, valeur] of Object.entries(changements)) {
    const avant = resultat[cle];
    resultat[cle] = estObjet(avant) && estObjet(valeur) ? fusionner(avant, valeur) : valeur;
  }
  return resultat as T;
}

@@ code chemins | Types de textes | ts
- `Decouper<S, Sep>` : `'a.b.c'` avec `'.'` → `['a', 'b', 'c']`
- `EnCamel<S>` : `'ma-super-cle'` → `'maSuperCle'`
- `Params<R>` : les paramètres d'une route : `'/u/:id/p/:n'` → `'id' | 'n'`
@starter

@types `Decouper`
type _ = [$Expect<$Equal<Decouper<'a.b.c', '.'>, ['a', 'b', 'c']>>, $Expect<$Equal<Decouper<'abc', '.'>, ['abc']>>];
@types `EnCamel`
type _ = [$Expect<$Equal<EnCamel<'ma-super-cle'>, 'maSuperCle'>>, $Expect<$Equal<EnCamel<'simple'>, 'simple'>>];
@types `Params`
type _ = [$Expect<$Equal<Params<'/u/:id/p/:n'>, 'id' | 'n'>>, $Expect<$Equal<Params<'/rien'>, never>>];
@hint
`EnCamel` : coupe au premier tiret, garde la tête, et mets une majuscule (`Capitalize`) au reste déjà transformé.
@solution
type Decouper<S extends string, Sep extends string> =
  S extends `${infer Tete}${Sep}${infer Reste}` ? [Tete, ...Decouper<Reste, Sep>] : [S];

type EnCamel<S extends string> =
  S extends `${infer Tete}-${infer Reste}` ? `${Tete}${Capitalize<EnCamel<Reste>>}` : S;

type Params<R extends string> =
  R extends `${string}:${infer P}/${infer Reste}` ? P | Params<Reste>
  : R extends `${string}:${infer P}` ? P
  : never;

@@ predict distribution
Quel est le type `X` ?
```ts
type T<U> = U extends string ? 'texte' : 'autre';
type X = T<'a' | 1>;
```
@answer `'texte' | 'autre'`
@wrong `'texte'`
@wrong `'autre'`
@wrong `never`
@why Le type conditionnel s'applique à chaque membre de l'union.

@@ predict infer
Quel est le type `X` ?
```ts
type T<F> = F extends (a: infer A, ...r: any[]) => any ? A : never;
type X = T<(n: number, s: string) => boolean>;
```
@answer `number`
@wrong `string`
@wrong `boolean`
@wrong `[number, string]`
@why `infer A` capture le type du premier paramètre.

@@ predict never-distribution
Quel est le type `X` ?
```ts
type T<U> = U extends string ? 1 : 2;
type X = T<never>;
```
@answer `never`
@wrong `1`
@wrong `2`
@wrong `1 | 2`
@why `never` est l'union vide : il n'y a rien à distribuer.

@@ card infer-quoi
À quoi sert `infer` ?
@back
À capturer un type à l'intérieur d'un motif, dans un type conditionnel.

@@ card bloquer-distribution
Comment empêcher la distribution sur une union ?
@back
Avec des crochets : `[T] extends [U] ? … : …`

@@ defi analyseur-type | Une calculatrice dans les types | ts
`Calculer<S>` évalue un texte **au niveau des types** : des additions et soustractions d'entiers positifs (résultats intermédiaires entre 0 et 99), de gauche à droite, espaces libres : `'10 + 5 - 3'` → `12`. Un texte mal formé, ou un résultat négatif, donne `never`.
@starter

@types Un nombre
type _ = [$Expect<$Equal<Calculer<'42'>, 42>>, $Expect<$Equal<Calculer<' 7 '>, 7>>];
@types Opérations
type _ = [$Expect<$Equal<Calculer<'1+2'>, 3>>, $Expect<$Equal<Calculer<'10 + 5 - 3'>, 12>>, $Expect<$Equal<Calculer<'50 - 20 - 5 + 1'>, 26>>];
@types Mal formés ou négatifs
type _ = [$Expect<$Equal<Calculer<'a'>, never>>, $Expect<$Equal<Calculer<'1 +'>, never>>, $Expect<$Equal<Calculer<''>, never>>, $Expect<$Equal<Calculer<'3 - 5'>, never>>];
@hint
Garde le résultat sous forme de **tuple**. Lis d'abord un nombre, puis en boucle : un opérateur, un nombre.
@hint
Retire tous les espaces au début. Ensuite, pour lire le nombre suivant, avance caractère par caractère tant que ce sont des chiffres.
@solution
type Chiffre = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type SansEspaces<S extends string> = S extends `${infer D} ${infer F}` ? SansEspaces<`${D}${F}`> : S;

type Repeter<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : Repeter<N, [...Acc, unknown]>;

// '12+3' → ['12', '+3']
type LireNombre<S extends string, Acc extends string = ''> =
  S extends `${infer C extends Chiffre}${infer Reste}` ? LireNombre<Reste, `${Acc}${C}`> : [Acc, S];

type EnTuple<S extends string> = S extends `${infer N extends number}` ? Repeter<N> : never;

type Suite<Total extends unknown[], S extends string> =
  S extends '' ? Total['length']
  : S extends `${infer Op extends '+' | '-'}${infer Reste}`
    ? LireNombre<Reste> extends [infer N extends string, infer Apres extends string]
      ? N extends '' ? never
        : Op extends '+' ? Suite<[...Total, ...EnTuple<N>], Apres>
        : Total extends [...EnTuple<N>, ...infer Moins] ? Suite<Moins, Apres> : never
      : never
    : never;

type Calculer<S extends string> =
  LireNombre<SansEspaces<S>> extends [infer N extends string, infer Reste extends string]
    ? N extends '' ? never : Suite<EnTuple<N>, Reste>
    : never;
