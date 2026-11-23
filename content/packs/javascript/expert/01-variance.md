# Assignabilité et variance
> Comprendre vraiment quand un type en remplace un autre.

@@ lesson assignable | Les types sont des ensembles

Un type est un **ensemble de valeurs**. `A` est assignable à `B` si A est inclus dans B.

| | Ensemble |
|---|---|
| `never` | vide |
| `'a'` | une seule valeur |
| `string` | tous les textes |
| `A \| B` | réunion |
| `A & B` | intersection |
| `unknown` | tout |

Plus un objet a de propriétés exigées, plus l'ensemble est **petit** : `{ a; b }` est assignable à `{ a }`. D'où le paradoxe : `keyof (A | B)` est l'intersection des clés, `keyof (A & B)` leur réunion.

```ts-run
type A = { x: number; commun: string };
type B = { y: number; commun: string };
type ClesUnion = keyof (A | B);        // 'commun'
type ClesInter = keyof (A & B);        // 'x' | 'y' | 'commun'
const u: ClesUnion = 'commun';
const i: ClesInter = 'x';
console.log(u, i);
```

### Littéraux et élargissement

`let x = 'a'` s'élargit en `string` ; `const`, `as const` ou une contrainte `T extends string` gardent le littéral.

### Types objets pièges

- `{}` : tout sauf `null` et `undefined` (même `3` !).
- `object` : tout ce qui n'est pas primitif.
- `Record<string, never>` : un objet vide.

@@ lesson variance | La variance

Si `Chien` est assignable à `Animal`, qu'en est-il de `F<Chien>` et `F<Animal>` ?

| | Position de T | Sens |
|---|---|---|
| **Covariant** | sortie (lu) | `F<Chien>` → `F<Animal>` |
| **Contravariant** | entrée (paramètre) | `F<Animal>` → `F<Chien>` |
| **Invariant** | les deux | aucun |

```ts-run
interface Animal { nom: string }
interface Chien extends Animal { race: string }

type Producteur<T> = () => T;
type Consommateur<T> = (x: T) => void;

const unChien: Producteur<Chien> = () => ({ nom: 'Rex', race: 'berger' });
const unAnimal: Producteur<Animal> = unChien;          // covariant : OK

const avecAnimal: Consommateur<Animal> = (a) => console.log(a.nom);
const avecChien: Consommateur<Chien> = avecAnimal;     // contravariant : OK
avecChien(unChien());
console.log(unAnimal().nom);
```

Qui sait traiter **tout** animal sait traiter un chien ; l'inverse est faux.

### Deux trous volontaires

Les **méthodes** (`f(x: T): void`) sont vérifiées moins strictement que les **propriétés** fonctions (`f: (x: T) => void`). Préfère la seconde forme si tu veux la rigueur.

Les **tableaux** sont covariants bien qu'on puisse y écrire :

```ts-run
interface Animal { nom: string }
interface Chien extends Animal { race: string }
const chiens: Chien[] = [];
const animaux: Animal[] = chiens;  // accepté…
animaux.push({ nom: 'Chat' });     // …et un chat est chez les chiens
console.log(chiens[0].race);
```

`readonly Animal[]` évite le problème.

### Annoter

`interface Boite<in out T>` : `out` covariant, `in` contravariant, `in out` invariant. TypeScript vérifie l'annotation.

@@ code classer-variance | Classer | ts
Pour chaque type, dis sa variance par rapport à `T` : remplace `'?'` par `'co'`, `'contra'`, `'inv'` ou `'bi'` (T inutilisé).
@starter
type F1<T> = () => T;
type F2<T> = (x: T) => void;
type F3<T> = (x: T) => T;
type F4<T> = (f: (x: T) => void) => void;
type F5<T> = { readonly valeur: T };
type F6<T> = { lire: () => T; ecrire: (x: T) => void };
type F7<T> = () => void;
type F8<T> = (f: () => T) => void;

const reponses = { F1: '?', F2: '?', F3: '?', F4: '?', F5: '?', F6: '?', F7: '?', F8: '?' };
@test Sorties et entrées simples
expect([reponses.F1, reponses.F2, reponses.F3]).toEqual(['co', 'contra', 'inv']);
@test Callbacks
expect([reponses.F4, reponses.F8]).toEqual(['co', 'contra']);
@test Objets, et T inutilisé
expect([reponses.F5, reponses.F6, reponses.F7]).toEqual(['co', 'inv', 'bi']);
@hint
Compte les « entrées » traversées : une entrée inverse le sens, deux entrées le rétablissent (F4).
@solution
type F1<T> = () => T;
type F2<T> = (x: T) => void;
type F3<T> = (x: T) => T;
type F4<T> = (f: (x: T) => void) => void;
type F5<T> = { readonly valeur: T };
type F6<T> = { lire: () => T; ecrire: (x: T) => void };
type F7<T> = () => void;
type F8<T> = (f: () => T) => void;

const reponses = { F1: 'co', F2: 'contra', F3: 'inv', F4: 'co', F5: 'co', F6: 'inv', F7: 'bi', F8: 'contra' };

@@ code evenement-strict | Corriger une API trop permissive | ts
`Canal<T>` laisse passer des erreurs : un `Canal<string>` est accepté là où l'on attend un `Canal<string | number>`, alors qu'on y écrirait un nombre. Change **seulement l'interface** pour la rendre **invariante**, sans ajouter de propriété. Puis écris `creerCanal`.
@starter
interface Canal<T> {
  abonner(f: (x: T) => void): void;
  envoyer(x: T): void;
}

function creerCanal<T>(): Canal<T> {
}
@test Marche
const c = creerCanal(); const l = []; c.abonner((x) => l.push(x)); c.abonner((x) => l.push(-x)); c.envoyer(3); expect(l).toEqual([3, -3]);
@types Ni dans un sens
const a = creerCanal<string>();
// @ts-expect-error
const b: Canal<string | number> = a;
@types Ni dans l'autre
const a = creerCanal<string | number>();
// @ts-expect-error
const b: Canal<string> = a;
@types Les mêmes membres
type _ = $Expect<$Equal<keyof Canal<1>, 'abonner' | 'envoyer'>>;
@hint
Les méthodes sont bivariantes : écris `envoyer: (x: T) => void`.
@solution
interface Canal<T> {
  abonner: (f: (x: T) => void) => void;
  envoyer: (x: T) => void;
}

function creerCanal<T>(): Canal<T> {
  const abonnes: ((x: T) => void)[] = [];
  return {
    abonner: (f) => {
      abonnes.push(f);
    },
    envoyer: (x) => {
      for (const f of abonnes) f(x);
    },
  };
}

@@ code exact | Refuser les propriétés en trop | ts
TypeScript ne refuse les propriétés en trop que pour les objets écrits sur place. Écris `strict<T>()`, qui renvoie une fonction acceptant un objet dont le type a **exactement** les clés de `T` (même passé par une variable), et le renvoie tel quel.
@starter
interface Config {
  hote: string;
  port: number;
}

@test Renvoie l'objet
const o = { hote: 'a', port: 1 }; expect(strict()(o)).toBe(o);
@types Accepte le bon type
const o = { hote: 'a', port: 1 }; const c: Config = strict<Config>()(o);
@types Refuse une clé en trop, même dans une variable
const o = { hote: 'a', port: 1, pourt: 2 };
// @ts-expect-error
strict<Config>()(o);
@types Refuse une clé manquante ou un mauvais type
// @ts-expect-error
strict<Config>()({ hote: 'a' });
// @ts-expect-error
strict<Config>()({ hote: 'a', port: 'x' });
@hint
Le paramètre : `X & Record<Exclude<keyof X, keyof T>, never>` avec `X extends T` : toute clé en trop devrait être un `never`.
@solution
interface Config {
  hote: string;
  port: number;
}

function strict<T>() {
  return <X extends T>(objet: X & Record<Exclude<keyof X, keyof T>, never>): X => objet;
}

@@ defi egalite | Comparer des types | ts
Écris, sans `$Equal` :

- `EstNever<T>`, `EstAny<T>`, `EstUnknown<T>`
- `Egal<A, B>` : vrai seulement pour des types **identiques** (`any` n'est égal qu'à `any` ; `readonly` et facultatif comptent)
@starter

@types `EstNever`
type _ = [$Expect<$Equal<EstNever<never>, true>>, $Expect<$Equal<EstNever<1>, false>>, $Expect<$Equal<EstNever<any>, false>>];
@types `EstAny`
type _ = [$Expect<$Equal<EstAny<any>, true>>, $Expect<$Equal<EstAny<unknown>, false>>, $Expect<$Equal<EstAny<never>, false>>, $Expect<$Equal<EstAny<string>, false>>];
@types `EstUnknown`
type _ = [$Expect<$Equal<EstUnknown<unknown>, true>>, $Expect<$Equal<EstUnknown<any>, false>>, $Expect<$Equal<EstUnknown<{}>, false>>];
@types `Egal`
type _ = [$Expect<$Equal<Egal<1, 1>, true>>, $Expect<$Equal<Egal<any, 1>, false>>, $Expect<$Equal<Egal<{ a: 1 }, { readonly a: 1 }>, false>>, $Expect<$Equal<Egal<{ a?: 1 }, { a: 1 | undefined }>, false>>, $Expect<$Equal<Egal<1 | 2, 1>, false>>, $Expect<$Equal<Egal<never, any>, false>>];
@hint
`[T] extends [never]` évite la distribution. `0 extends 1 & T` n'est vrai que pour `any`.
@hint
Deux fonctions génériques sont comparées **par identité** : `(<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)`.
@solution
type EstNever<T> = [T] extends [never] ? true : false;
type EstAny<T> = 0 extends 1 & T ? true : false;
type EstUnknown<T> = EstAny<T> extends true ? false : unknown extends T ? true : false;
type Egal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

@@ predict keyof-union
Quel est `keyof ({ a: 1; b: 2 } | { b: 3; c: 4 })` ?
@answer `'b'`
@wrong `'a' | 'b' | 'c'`
@wrong `'a' | 'c'`
@wrong `never`
@why D'une union, on ne peut lire sans vérifier que les clés communes.

@@ predict contra
`f` attend une fonction `(c: Chien) => void`. Peut-on lui donner une `(a: Animal) => void` ?
@answer Oui
@wrong Non
@wrong Seulement avec `as`
@wrong Seulement si `Chien` est une classe
@why Contravariance des paramètres : qui traite tout animal traite un chien.

@@ card variances
Covariant, contravariant, invariant ?
@back
Covariant : T en sortie. Contravariant : T en entrée. Invariant : les deux.

@@ card methode-propriete
Pourquoi `f: (x: T) => void` plutôt que `f(x: T): void` dans une interface ?
@back
Les méthodes sont vérifiées de façon bivariante, moins stricte.
