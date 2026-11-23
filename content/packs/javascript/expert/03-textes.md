# Textes au niveau des types
> Analyser des chaînes : chemins, requêtes, routes, formats.

@@ lesson textes-types | Analyser des textes

Un template literal type peut **découper** un texte :

```ts
type Tete<S> = S extends `${infer C}${infer Reste}` ? C : never;  // premier caractère
type Trim<S extends string> =
  S extends ` ${infer R}` ? Trim<R> : S extends `${infer R} ` ? Trim<R> : S;
type Remplacer<S extends string, A extends string, B extends string> =
  S extends `${infer D}${A}${infer F}` ? `${D}${B}${Remplacer<F, A, B>}` : S;
```

Deux règles d'inférence à retenir :

- deux `infer` **collés** : le premier prend **un** caractère ;
- un `infer` suivi d'un texte : il s'arrête à la **première** occurrence.

On peut convertir : `S extends \`${infer N extends number}\` ? N : never` donne un vrai nombre.

```ts-run
type EnNombre<S extends string> = S extends `${infer N extends number}` ? N : never;
const n: EnNombre<'42'> = 42;

type Evenement<T extends string> = `on${Capitalize<T>}`;
const e: Evenement<'clic' | 'focus'> = 'onFocus';
console.log(n, e);
```

### Des usages réels

- Chemins d'objets : `'user.adresse.ville'`
- Routes : `'/users/:id'`
- Clés d'événements : `'nomChange'`
- Requêtes SQL ou GraphQL analysées
- Clés CSS : `${number}px`

```ts-run
type Taille = `${number}px` | `${number}%`;
const t: Taille = '12px';
console.log(t);
```

### Limites

Récursion limitée (~50 niveaux, ~1000 si elle est terminale), unions limitées à 100 000 membres. Un type trop malin ralentit l'éditeur et donne des erreurs illisibles : reste sobre.

@@ code chaines-types | Manipuler des textes | ts
- `Trim<S>` : retire les espaces au début et à la fin
- `RemplacerTout<S, A, B>`
- `Separer<S, Sep>` et `Joindre<T, Sep>`
- `EnNombre<S>` : `'42'` → `42`, sinon `never`
@starter

@types `Trim`
type _ = [$Expect<$Equal<Trim<'  a b '>, 'a b'>>, $Expect<$Equal<Trim<' '>, ''>>];
@types `RemplacerTout`
type _ = [$Expect<$Equal<RemplacerTout<'a-b-c', '-', '+'>, 'a+b+c'>>, $Expect<$Equal<RemplacerTout<'aaa', 'a', 'aa'>, 'aaaaaa'>>];
@types `Separer` et `Joindre`
type _ = [$Expect<$Equal<Separer<'a,b,c', ','>, ['a', 'b', 'c']>>, $Expect<$Equal<Joindre<['a', 'b'], '/'>, 'a/b'>>, $Expect<$Equal<Joindre<[], '/'>, ''>>];
@types `EnNombre`
type _ = [$Expect<$Equal<EnNombre<'42'>, 42>>, $Expect<$Equal<EnNombre<'x'>, never>>];
@solution
type Trim<S extends string> =
  S extends ` ${infer R}` ? Trim<R> : S extends `${infer R} ` ? Trim<R> : S;
type RemplacerTout<S extends string, A extends string, B extends string> =
  S extends `${infer D}${A}${infer F}` ? `${D}${B}${RemplacerTout<F, A, B>}` : S;
type Separer<S extends string, Sep extends string> =
  S extends `${infer D}${Sep}${infer F}` ? [D, ...Separer<F, Sep>] : [S];
type Joindre<T extends string[], Sep extends string> =
  T extends [infer H extends string, ...infer Q extends string[]]
    ? Q extends [] ? H : `${H}${Sep}${Joindre<Q, Sep>}`
    : '';
type EnNombre<S extends string> = S extends `${infer N extends number}` ? N : never;

@@ code chemins-objet | Les chemins d'un objet | ts
- `Chemins<T>` : l'union de tous les chemins (`'a' | 'a.b' | …`) d'un objet imbriqué (tableaux et fonctions ne sont pas explorés)
- `Valeur<T, P>` : le type au bout du chemin
- `lire(objet, chemin)` : la valeur, bien typée
@starter

@test `lire`
const o = { a: 1, b: { c: { d: 'x' }, l: [1] } }; expect([lire(o, 'a'), lire(o, 'b.c.d'), lire(o, 'b.c')]).toEqual([1, 'x', { d: 'x' }]);
@types `Chemins`
type _ = $Expect<$Equal<Chemins<{ a: 1; b: { c: { d: 1 }; l: number[] } }>, 'a' | 'b' | 'b.c' | 'b.c.d' | 'b.l'>>;
@types `Valeur`
type T = { a: 1; b: { c: { d: Date } } }; type _ = [$Expect<$Equal<Valeur<T, 'b.c.d'>, Date>>, $Expect<$Equal<Valeur<T, 'a'>, 1>>];
@types `lire` est typée
const o = { a: 1, b: { c: 'x' } }; const s: string = lire(o, 'b.c');
// @ts-expect-error
lire(o, 'b.z');
// @ts-expect-error
const n: number = lire(o, 'b.c');
@hint
Pour chaque clé : `K`, ou `` `${K}.${Chemins<T[K]>}` `` si la valeur est un objet simple.
@solution
type Feuille = readonly unknown[] | ((...args: never[]) => unknown) | Date;

type Chemins<T> = {
  [K in keyof T & string]: T[K] extends Feuille ? K : T[K] extends object ? K | `${K}.${Chemins<T[K]>}` : K;
}[keyof T & string];

type Valeur<T, P extends string> =
  P extends `${infer K}.${infer Reste}`
    ? K extends keyof T ? Valeur<T[K], Reste> : never
    : P extends keyof T ? T[P] : never;

function lire<T extends object, P extends Chemins<T>>(objet: T, chemin: P): Valeur<T, P> {
  let valeur: unknown = objet;
  for (const cle of chemin.split('.')) valeur = (valeur as Record<string, unknown>)[cle];
  return valeur as Valeur<T, P>;
}

@@ code printf | Un format typé | ts
`formater(modele, ...args)` remplace `%s` (texte), `%d` (nombre) et `%b` (booléen, `oui`/`non`) par les arguments, dont le nombre **et** les types sont vérifiés d'après le modèle. `%%` donne `%`.
@starter

@test Remplace
expect([formater('%s a %d ans', 'Ada', 36), formater('rien'), formater('%b, 100%%', true)]).toEqual(['Ada a 36 ans', 'rien', 'oui, 100%']);
@types Arguments vérifiés
formater('%s a %d ans', 'Ada', 36); formater('rien'); formater('100%% de %s', 'x');
@types Mauvais type
// @ts-expect-error
formater('%d', 'x');
@types Mauvais nombre
// @ts-expect-error
formater('%s');
// @ts-expect-error
formater('%s', 'a', 'b');
@hint
Lis le modèle de gauche à droite : `` S extends `${string}%${infer C}${infer Reste}` `` donne la lettre qui suit le premier `%`.
@solution
interface Formats {
  s: string;
  d: number;
  b: boolean;
}

type Arguments<S extends string> =
  S extends `${string}%${infer C}${infer Reste}`
    ? C extends keyof Formats ? [Formats[C], ...Arguments<Reste>] : Arguments<Reste>
    : [];

function formater<S extends string>(modele: S, ...args: Arguments<S>): string {
  const valeurs: unknown[] = [...args];
  return modele.replace(/%([sdb%])/g, (_, c: string) => {
    if (c === '%') return '%';
    const v = valeurs.shift();
    return c === 'b' ? (v ? 'oui' : 'non') : String(v);
  });
}

@@ defi requete-sql | Une requête analysée | ts
Déduis le type du résultat d'une requête **à partir de son texte** :

- `Resultat<BD, S>` : `'SELECT nom, age FROM users'` donne `{ nom: string; age: number }[]`
- `SELECT *` donne toutes les colonnes
- `colonne AS alias` renomme
- une table ou une colonne inconnue donne `never`

Espaces libres autour des virgules.
@starter
interface BD {
  users: { id: number; nom: string; age: number };
  posts: { id: number; titre: string };
}

@types Colonnes choisies
type _ = [$Expect<$Equal<Resultat<BD, 'SELECT nom, age FROM users'>, { nom: string; age: number }[]>>, $Expect<$Equal<Resultat<BD, 'SELECT  titre  FROM posts'>, { titre: string }[]>>];
@types Étoile
type _ = $Expect<$Equal<Resultat<BD, 'SELECT * FROM posts'>, { id: number; titre: string }[]>>;
@types Alias
type _ = $Expect<$Equal<Resultat<BD, 'SELECT id AS cle, nom FROM users'>, { cle: number; nom: string }[]>>;
@types Inconnus
type _ = [$Expect<$Equal<Resultat<BD, 'SELECT id FROM zut'>, never>>, $Expect<$Equal<Resultat<BD, 'SELECT zut FROM users'>, never>>];
@hint
Sépare les colonnes en tuple, transforme chacune en `{ [alias]: type }`, puis assemble. Un dernier mapped type (`{ [K in keyof X]: X[K] }`) aplatit l'intersection.
@solution
interface BD {
  users: { id: number; nom: string; age: number };
  posts: { id: number; titre: string };
}

type Trim<S extends string> =
  S extends ` ${infer R}` ? Trim<R> : S extends `${infer R} ` ? Trim<R> : S;
type Separer<S extends string> =
  S extends `${infer D},${infer F}` ? [Trim<D>, ...Separer<F>] : [Trim<S>];
type Plat<T> = { [K in keyof T]: T[K] };

// 'id AS cle' → ['id', 'cle']
type Colonne<S extends string> =
  S extends `${infer C} AS ${infer A}` ? [Trim<C>, Trim<A>] : [S, S];

type Ligne<T, C extends string[], Acc = {}> =
  C extends [infer H extends string, ...infer Q extends string[]]
    ? Colonne<H> extends [infer Nom, infer Alias extends string]
      ? Nom extends keyof T ? Ligne<T, Q, Acc & { [K in Alias]: T[Nom] }> : never
      : never
    : Plat<Acc>;

type EnTableau<T> = [T] extends [never] ? never : T[];

type Resultat<B, S extends string> =
  Trim<S> extends `SELECT ${infer C} FROM ${infer N}`
    ? Trim<N> extends keyof B
      ? Trim<C> extends '*' ? B[Trim<N>][] : EnTableau<Ligne<B[Trim<N>], Separer<C>>>
      : never
    : never;

@@ predict infer-colles
Quel est `A` dans `'abc' extends \`${infer A}${infer B}\`` ?
@answer `'a'`
@wrong `'abc'`
@wrong `'ab'`
@wrong `''`
@why Deux `infer` collés : le premier prend un seul caractère.

@@ predict capitalize
Quel est le type `T` ?
```ts
type T = `${'get' | 'set'}${Capitalize<'nom'>}`;
```
@answer `'getNom' | 'setNom'`
@wrong `'getnom' | 'setnom'`
@wrong `string`
@wrong `'get' | 'set' | 'Nom'`
@why Les template types se distribuent sur les unions.

@@ card texte-nombre
Convertir le type `'42'` en `42` ?
@back
`S extends \`${infer N extends number}\` ? N : never`

@@ card limites-types
Pourquoi rester sobre avec les types récursifs ?
@back
Limites de récursion, éditeur lent, messages d'erreur illisibles.
