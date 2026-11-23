# Unions et objets avancés
> Retourner les unions, fusionner, transformer en profondeur.

@@ lesson unions-pro | Jouer avec les unions

### Distribution

Un type conditionnel sur un paramètre **nu** s'applique membre par membre. C'est un `map` sur l'union ; `never` fait office de `filter`.

```ts
type Filtrer<U, X> = U extends X ? U : never;
type ParType<U, T> = U extends { type: T } ? U : never; // extraire une variante
```

### Union vers intersection

Le tour le plus célèbre : en position **contravariante**, plusieurs candidats pour un `infer` donnent une **intersection**.

```ts
type EnIntersection<U> =
  (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;
type X = EnIntersection<{ a: 1 } | { b: 2 }>; // { a: 1 } & { b: 2 }
```

### Aplatir l'affichage

Une intersection s'affiche mal au survol. Un mapped type la « calcule » :

```ts
type Plat<T> = { [K in keyof T]: T[K] } & {};
```

### Union vers objet, objet vers union

```ts-run
type Actions = { ajouter: { n: number }; vider: undefined };

// Objet → union discriminée
type Action = { [K in keyof Actions]: { type: K; donnees: Actions[K] } }[keyof Actions];

// Union → objet indexé par variante
type ParNom = { [A in Action as A['type']]: A['donnees'] };

const a: Action = { type: 'ajouter', donnees: { n: 1 } };
const p: ParNom = { ajouter: { n: 2 }, vider: undefined };
console.log(a.type, p.ajouter.n);
```

### Exactement un, au moins un

```ts
type Exclusif<A, B> =
  | (A & { [K in Exclude<keyof B, keyof A>]?: never })
  | (B & { [K in Exclude<keyof A, keyof B>]?: never });
```

### Omit et les unions

`Omit<A | B, 'x'>` **écrase** l'union (il ne garde que les clés communes). Version distributive :

```ts
type OmitDistributif<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
```

@@ code unions-outils | La boîte à outils | ts
- `EnIntersection<U>`
- `Variante<U, T>` : le membre de l'union discriminée dont `type` est `T`
- `OmitDist<T, K>` : `Omit` qui garde les unions
- `Fusion<A, B>` : les propriétés de `B` **remplacent** celles de `A`, en un objet plat
@starter

@types `EnIntersection`
type _ = [$Expect<$Equal<EnIntersection<{ a: 1 } | { b: 2 }>, { a: 1 } & { b: 2 }>>, $Expect<$Equal<EnIntersection<'a'>, 'a'>>];
@types `Variante`
type F = { type: 'a'; x: 1 } | { type: 'b'; y: 2 }; type _ = [$Expect<$Equal<Variante<F, 'b'>, { type: 'b'; y: 2 }>>, $Expect<$Equal<Variante<F, 'z'>, never>>];
@types `OmitDist`
type F = { id: 1; a: 1 } | { id: 1; b: 2 }; const x: OmitDist<F, 'id'> = { a: 1 }; const y: OmitDist<F, 'id'> = { b: 2 };
// @ts-expect-error
const z: OmitDist<F, 'id'> = {};
@types `Fusion`
type _ = $Expect<$Equal<Fusion<{ a: 1; b: 2 }, { b: 'x'; c: 3 }>, { a: 1; b: 'x'; c: 3 }>>;
@solution
type EnIntersection<U> =
  (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;
type Variante<U extends { type: unknown }, T> = U extends { type: T } ? U : never;
type OmitDist<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type Fusion<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B ? B[K] : K extends keyof A ? A[K] : never;
};

@@ code exclusif | Exactement une option | ts
- `Exclusif<A, B>` : l'un **ou** l'autre, jamais les deux
- `AuMoinsUn<T>` : toutes les propriétés facultatives, mais **au moins une** présente
- `envoyer(options)` : `to` (texte) **ou** `groupe` (nombre), jamais les deux ; renvoie `'à <to>'` ou `'au groupe <n>'`
@starter

@test `envoyer`
expect([envoyer({ to: 'ada' }), envoyer({ groupe: 3 })]).toEqual(['à ada', 'au groupe 3']);
@types `Exclusif`
const a: Exclusif<{ x: 1 }, { y: 2 }> = { x: 1 }; const b: Exclusif<{ x: 1 }, { y: 2 }> = { y: 2 };
// @ts-expect-error
const c: Exclusif<{ x: 1 }, { y: 2 }> = { x: 1, y: 2 };
// @ts-expect-error
const d: Exclusif<{ x: 1 }, { y: 2 }> = {};
@types `AuMoinsUn`
type T = AuMoinsUn<{ a: 1; b: 2; c: 3 }>; const x: T = { a: 1 }; const y: T = { b: 2, c: 3 };
// @ts-expect-error
const z: T = {};
// @ts-expect-error
const w: T = { a: 2 };
@types `envoyer` vérifie
envoyer({ to: 'a' });
// @ts-expect-error
envoyer({ to: 'a', groupe: 1 });
// @ts-expect-error
envoyer({});
@hint
`AuMoinsUn` : pour chaque clé K, « K obligatoire, les autres facultatives », puis l'union de tout cela.
@solution
type Exclusif<A, B> =
  | (A & { [K in Exclude<keyof B, keyof A>]?: never })
  | (B & { [K in Exclude<keyof A, keyof B>]?: never });

type AuMoinsUn<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];

function envoyer(options: Exclusif<{ to: string }, { groupe: number }>): string {
  return options.to !== undefined ? `à ${options.to}` : `au groupe ${options.groupe}`;
}

@@ code reducteur-type | Un réducteur sans répétition | ts
`creerReducteur(initial, actions)` : `actions` est un objet `{ nom: (etat, donnees) => etat }`. Renvoie `{ initial, reduire(etat, action), creer }` où :

- une **action** est `{ type: nom, donnees }`, type **déduit** de l'objet
- `creer.nom(donnees)` fabrique l'action ; sans argument si la fonction n'en prend pas (elle a alors `donnees: undefined`)
- une action inconnue laisse l'état tel quel
@starter

@test Réduit
const r = creerReducteur(0, { plus: (e, n) => e + n, zero: () => 0 }); let e = r.reduire(r.initial, r.creer.plus(5)); e = r.reduire(e, { type: 'plus', donnees: 2 }); expect([e, r.reduire(e, r.creer.zero()), r.reduire(e, { type: 'zut' })]).toEqual([7, 0, 7]);
@test Les actions
const r = creerReducteur(0, { plus: (e, n) => e + n, zero: () => 0 }); expect([r.creer.plus(5), r.creer.zero()]).toEqual([{ type: 'plus', donnees: 5 }, { type: 'zero', donnees: undefined }]);
@types Types déduits
const r = creerReducteur({ n: 0 }, { plus: (e, x: number) => ({ n: e.n + x }), zero: () => ({ n: 0 }) });
r.creer.plus(1); r.creer.zero(); r.reduire({ n: 1 }, { type: 'plus', donnees: 3 }); r.reduire({ n: 1 }, r.creer.zero());
// @ts-expect-error
r.creer.plus('x');
// @ts-expect-error
r.creer.zero(1);
// @ts-expect-error
r.reduire({ n: 1 }, { type: 'plus', donnees: 'x' });
// @ts-expect-error
r.reduire({ n: 1 }, { type: 'zut', donnees: 1 });
@hint
`type Donnees<F> = F extends (etat: any, ...args: infer A) => unknown ? A : never` donne `[]` ou `[number]`.
@solution
type Cas<E> = Record<string, (etat: E, donnees: any) => E>;
type Args<F> = F extends (etat: any, ...args: infer A) => unknown ? A : never;
type ActionDe<C> = { [K in keyof C & string]: { type: K; donnees: Args<C[K]>[0] } }[keyof C & string];
type Createurs<C> = {
  [K in keyof C & string]: (...args: Args<C[K]>) => { type: K; donnees: Args<C[K]>[0] };
};

function creerReducteur<E, C extends Cas<E>>(initial: E, actions: C & Cas<E>) {
  const creer = Object.fromEntries(
    Object.keys(actions).map((type) => [type, (donnees?: unknown) => ({ type, donnees })]),
  ) as unknown as Createurs<C>;
  return {
    initial,
    creer,
    reduire(etat: E, action: ActionDe<C>): E {
      return Object.hasOwn(actions, action.type) ? actions[action.type](etat, action.donnees) : etat;
    },
  };
}

@@ defi union-tuple | Une union en tuple | ts
- `DernierDe<U>` : un membre de l'union (le dernier choisi par TypeScript)
- `EnTuple<U>` : un tuple de tous les membres
- `Taille<U>` : leur nombre
- `Permutations<U>` : l'union de tous les tuples possibles : `['a', 'b'] | ['b', 'a']`
@starter

@types `EnTuple` et `Taille`
type _ = [$Expect<$Equal<EnTuple<'a' | 'b' | 'c'>[number], 'a' | 'b' | 'c'>>, $Expect<$Equal<Taille<'a' | 'b' | 'c'>, 3>>, $Expect<$Equal<Taille<never>, 0>>, $Expect<$Equal<EnTuple<'x'>, ['x']>>];
@types `DernierDe`
type D = DernierDe<'a' | 'b'>; type _ = [$Expect<D extends 'a' | 'b' ? true : false>, $Expect<$Equal<DernierDe<'z'>, 'z'>>];
@types `Permutations`
type _ = [$Expect<$Equal<Permutations<'a' | 'b'>, ['a', 'b'] | ['b', 'a']>>, $Expect<$Equal<Permutations<'x'>, ['x']>>, $Expect<$Equal<Permutations<1 | 2 | 3>['length'], 3>>];
@hint
Une intersection de **fonctions** est une surcharge, et `infer` n'en lit que la **dernière** : transforme l'union en intersection de `() => membre`.
@hint
`Permutations` : pour chaque membre K (distribution), `[K, ...Permutations<Exclude<U, K>>]`. Attention au cas `never`.
@solution
type EnIntersection<U> =
  (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;
type DernierDe<U> =
  EnIntersection<U extends unknown ? () => U : never> extends () => infer D ? D : never;
type EnTuple<U, Acc extends unknown[] = []> =
  [U] extends [never] ? Acc : EnTuple<Exclude<U, DernierDe<U>>, [DernierDe<U>, ...Acc]>;
type Taille<U> = EnTuple<U> extends infer T extends unknown[] ? T['length'] : never;
type Permutations<U, K = U> =
  [U] extends [never] ? [] : K extends unknown ? [K, ...Permutations<Exclude<U, K>>] : never;

@@ predict omit-union
Que vaut `keyof Omit<{ id: 1; a: 1 } | { id: 1; b: 2 }, 'id'>` ?
@answer `never`
@wrong `'a' | 'b'`
@wrong `'a'`
@wrong `'id'`
@why `Omit` n'est pas distributif : seule la clé commune `id` est vue, puis retirée.

@@ predict contra-infer
Plusieurs candidats pour un `infer` en position de **paramètre** donnent :
@answer Une intersection
@wrong Une union
@wrong `never`
@wrong Le dernier
@why En sortie (covariant) : une union. En entrée (contravariant) : une intersection.

@@ card extraire-variante
Extraire une variante d'une union discriminée ?
@back
`Extract<U, { type: 'a' }>`

@@ card objet-union
D'un objet à l'union de ses entrées ?
@back
`{ [K in keyof T]: { type: K; donnees: T[K] } }[keyof T]`
