# TypeScript au quotidien
> satisfies, enum, types « marqués », déclarations, projet réel.

@@ lesson pratique | satisfies, enum, types marqués

### satisfies

Vérifie qu'une valeur respecte un type **sans perdre** son type précis :

```ts-run
type Couleur = string | [number, number, number];

const annote: Record<string, Couleur> = { rouge: [255, 0, 0], vert: '#0f0' };
// annote.vert.toUpperCase();  // refusé : peut-être un tableau

const palette = { rouge: [255, 0, 0], vert: '#0f0' } satisfies Record<string, Couleur>;
console.log(palette.vert.toUpperCase(), palette.rouge[0], Object.keys(annote).length);
```

- Annotation `: T` → la valeur **devient** un `T`.
- `satisfies T` → **vérifiée** contre `T`, garde son type.
- `as T` → on te **croit** sur parole.

### enum

```ts-run
enum Etat { Vide, Plein = 5, Casse }
console.log(Etat.Vide, Etat.Casse, Etat[5]);
```

Les enums ajoutent du code à l'exécution. On leur préfère aujourd'hui une union de textes, ou un objet `as const` :

```ts-run
const Niveau = { Facile: 'facile', Dur: 'dur' } as const;
type Niveau = (typeof Niveau)[keyof typeof Niveau]; // 'facile' | 'dur'
const n: Niveau = Niveau.Dur;
console.log(n);
```

### Types marqués (branded)

Le typage étant structurel, deux `number` sont interchangeables. Pour ne pas confondre un id d'utilisateur et un id de commande, on les **marque** :

```ts-run
type IdUser = number & { readonly __marque: 'IdUser' };
type IdCommande = number & { readonly __marque: 'IdCommande' };
const idUser = (n: number): IdUser => n as IdUser;

function lireUser(id: IdUser) { return `user ${id}`; }
console.log(lireUser(idUser(3)));
// lireUser(3) est refusé, lireUser(idCommande) aussi
```

@@ lesson projet | Un vrai projet

### Installer et compiler

```sh
npm init -y
npm install -D typescript
npx tsc --init      # crée tsconfig.json
npx tsc             # vérifie et compile
npx tsc --noEmit    # vérifie seulement
```

Dans la vraie vie, un outil (Vite, esbuild, Node récent…) retire les types très vite, et `tsc --noEmit` vérifie à part. Node sait exécuter un `.ts` directement, tant qu'on n'utilise que des types effaçables (pas d'`enum`, ni de champs dans les paramètres du constructeur).

### tsconfig : un bon départ

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

### Bibliothèques sans types

Beaucoup fournissent leurs types (`.d.ts`). Pour les autres : `npm i -D @types/nom`. Sinon, écris une **déclaration** :

```ts
// types.d.ts
declare module 'vieille-lib' {
  export function faire(x: string): number;
}
declare const VERSION: string;        // une variable globale qui existe déjà
declare global {
  interface Array<T> { dernier(): T | undefined } // compléter un type existant
}
```

### Commentaires utiles

- `// @ts-expect-error raison` : l'erreur de la ligne suivante est attendue (et signalée si elle disparaît). Toujours préférable à `// @ts-ignore`.
- JSDoc (`/** … */`) : s'affiche au survol. `@deprecated` barre le nom.

### Bonnes habitudes

1. `strict` toujours ; jamais `any`, `unknown` à la place.
2. Annote les frontières (paramètres, exports), laisse deviner le reste.
3. Rends les états impossibles **impossibles à écrire** (unions discriminées).
4. Valide les données externes à l'entrée, puis fais confiance aux types.
5. Dérive les types les uns des autres plutôt que de les recopier.
6. Si un type devient illisible, simplifie le **code**.

@@ code theme | satisfies | ts
Le type `Theme` est donné. Crée `theme` avec : `fond` `'#fff'`, `texte` `[0, 0, 0]`, `accent` `'#f80'`, de façon à ce que :

- une clé manquante ou en trop soit refusée
- `theme.fond` soit utilisable comme un **texte**, et `theme.texte` comme un **tableau**, sans vérification

Puis `accentMajuscule`, l'accent en majuscules.
@starter
type Couleur = string | [number, number, number];
type Theme = Record<'fond' | 'texte' | 'accent', Couleur>;

const theme: Theme = { fond: '#fff', texte: [0, 0, 0] };
@test Les valeurs
expect(theme).toEqual({ fond: '#fff', texte: [0, 0, 0], accent: '#f80' }); expect(accentMajuscule).toBe('#F80');
@types Le type précis est gardé
const s: string = theme.fond; const n: number = theme.texte[0];
@test Utilise `satisfies`, sans assertion
expect($source).toMatch(/satisfies Theme/); expect($source).not.toMatch(/\bas\b/);
@solution
type Couleur = string | [number, number, number];
type Theme = Record<'fond' | 'texte' | 'accent', Couleur>;

const theme = { fond: '#fff', texte: [0, 0, 0], accent: '#f80' } satisfies Theme;

const accentMajuscule = theme.accent.toUpperCase();

@@ code sans-enum | Remplacer un enum | ts
Remplace l'`enum` par un objet constant `Priorite` et un type `Priorite` du même nom, **sans changer** le reste. Les valeurs restent `'basse'`, `'moyenne'`, `'haute'`. Ajoute `estPriorite(x: string)`, une garde de type.
@starter
enum Priorite {
  Basse = 'basse',
  Moyenne = 'moyenne',
  Haute = 'haute',
}

function poids(p: Priorite): number {
  if (p === Priorite.Haute) return 3;
  return p === Priorite.Moyenne ? 2 : 1;
}
@test `poids` marche toujours
expect([poids(Priorite.Haute), poids(Priorite.Moyenne), poids('basse')]).toEqual([3, 2, 1]);
@test `estPriorite`
expect([estPriorite('haute'), estPriorite('Haute'), estPriorite('')]).toEqual([true, false, false]);
@test Plus d'`enum`
expect($source).not.toMatch(/\benum\b/);
@types Le type `Priorite`
type _ = $Expect<$Equal<Priorite, 'basse' | 'moyenne' | 'haute'>>;
poids('moyenne');
@types `estPriorite` est une garde
const s = 'x' as string;
if (estPriorite(s)) poids(s);
@hint
`Object.values(Priorite)` a le type `Priorite[]` : pour chercher un `string` dedans, `some((v) => v === x)` ne demande aucune assertion.
@solution
const Priorite = {
  Basse: 'basse',
  Moyenne: 'moyenne',
  Haute: 'haute',
} as const;
type Priorite = (typeof Priorite)[keyof typeof Priorite];

function estPriorite(x: string): x is Priorite {
  return Object.values(Priorite).some((v) => v === x);
}

function poids(p: Priorite): number {
  if (p === Priorite.Haute) return 3;
  return p === Priorite.Moyenne ? 2 : 1;
}

@@ code marques | Types marqués | ts
Crée `Email` (un `string` marqué) et `Euros` (un `number` marqué) :

- `lireEmail(texte)` : `Email`, ou `null` s'il n'a pas la forme `x@y.z`
- `euros(n)` : `Euros`, arrondi au centime
- `payer(email: Email, montant: Euros)` : `'a@b.c paie 12.50 €'`
@starter

@test `lireEmail`
expect([lireEmail('a@b.c'), lireEmail('zut'), lireEmail('a@b')]).toEqual(['a@b.c', null, null]);
@test `euros` et `payer`
expect(euros(12.499)).toBe(12.5); expect(payer(lireEmail('a@b.c'), euros(12.5))).toBe('a@b.c paie 12.50 €');
@types Retours
const e: Email | null = lireEmail('x'); const m: Euros = euros(3); const s: string | null = e; const n: number = m;
@types Valeurs brutes refusées
// @ts-expect-error
payer('a@b.c', euros(1));
// @ts-expect-error
payer(lireEmail('a@b.c')!, 12);
@solution
type Email = string & { readonly __marque: 'Email' };
type Euros = number & { readonly __marque: 'Euros' };

function lireEmail(texte: string): Email | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texte) ? (texte as Email) : null;
}

function euros(n: number): Euros {
  return (Math.round(n * 100) / 100) as Euros;
}

function payer(email: Email, montant: Euros): string {
  return `${email} paie ${montant.toFixed(2)} €`;
}

@@ predict satisfies
Quel est le type de `c.a` ?
```ts
const c = { a: 'x' } satisfies Record<string, string | number>;
```
@answer `string`
@wrong `string | number`
@wrong `any`
@wrong `unknown`
@why `satisfies` vérifie, mais garde le type déduit de la valeur.

@@ predict enum
Qu'affiche ce code ?
```ts
enum E { A, B = 4, C }
console.log(E.A, E.C);
```
@answer `0 5`
@wrong `0 2`
@wrong `A C`
@wrong `1 5`
@why La numérotation part de 0 et continue après la dernière valeur donnée.

@@ card satisfies-as
Annotation, `satisfies`, `as` ?
@back
`: T` impose le type ; `satisfies T` vérifie et garde le type précis ; `as T` fait confiance sans vérifier.

@@ card expect-error
Pourquoi `@ts-expect-error` plutôt que `@ts-ignore` ?
@back
Il signale une erreur si la ligne devient correcte : il ne traîne pas.

@@ card strict
Le premier réglage d'un tsconfig ?
@back
`"strict": true`

@@ defi unites | Des unités impossibles à confondre | ts
Des nombres marqués par leur unité, dans un type **générique** `Mesure<U>` :

- `metres(n)`, `secondes(n)`, `kilometres(n)` : fabriquent ; `enMetres(km)` convertit
- `plus(a, b)` : seulement si les unités sont **identiques** ; garde l'unité
- `diviser(a, b)` : donne l'unité `` `${A}/${B}` ``
- `afficher(x, unite)` : l'unité donnée doit être **celle** de la mesure ; `'5 m/s'`
@starter

@test Calculs
expect([plus(metres(2), metres(3)), enMetres(kilometres(1.5)), diviser(metres(10), secondes(2)), afficher(diviser(metres(10), secondes(2)), 'm/s')]).toEqual([5, 1500, 5, '5 m/s']);
@types Unités suivies
const v = diviser(metres(1), secondes(2)); const w: Mesure<'m/s'> = plus(v, v); const n: number = w; afficher(v, 'm/s');
@types Mélanges refusés
// @ts-expect-error
plus(metres(1), secondes(1));
// @ts-expect-error
plus(metres(1), kilometres(1));
// @ts-expect-error
plus(metres(1), 3);
// @ts-expect-error
enMetres(metres(3));
// @ts-expect-error
afficher(metres(3), 'km');
@hint
`type Mesure<U extends string> = number & { readonly __unite: U }`. Pour `plus`, `NoInfer` empêche de déduire l'union des deux unités.
@solution
type Mesure<U extends string> = number & { readonly __unite: U };

const fabriquer = <U extends string>() => (n: number): Mesure<U> => n as Mesure<U>;
const metres = fabriquer<'m'>();
const kilometres = fabriquer<'km'>();
const secondes = fabriquer<'s'>();

const enMetres = (km: Mesure<'km'>): Mesure<'m'> => metres(km * 1000);

function plus<U extends string>(a: Mesure<U>, b: Mesure<NoInfer<U>>): Mesure<U> {
  return (a + b) as Mesure<U>;
}

function diviser<A extends string, B extends string>(a: Mesure<A>, b: Mesure<B>): Mesure<`${A}/${B}`> {
  return (a / b) as Mesure<`${A}/${B}`>;
}

function afficher<U extends string>(x: Mesure<U>, unite: NoInfer<U>): string {
  return `${x} ${unite}`;
}
