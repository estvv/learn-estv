# Interfaces et types d'objets
> interface, type, optionnel, readonly, extension et intersection.

@@ lesson interface-type | interface ou type

Deux façons de nommer la forme d'un objet :

```ts
interface User {
  readonly id: number;
  nom: string;
  email?: string;               // facultatif
  saluer(): string;             // méthode
  surConnexion: (d: Date) => void; // propriété fonction
}

type Point = { x: number; y: number };
type Id = string | number;      // type sait nommer n'importe quoi
```

| | `interface` | `type` |
|---|---|---|
| Objets | oui | oui |
| Unions, tuples, primitifs, types calculés | non | oui |
| Étendre | `extends` | `&` |
| Se compléter en se redéclarant | oui (*declaration merging*) | non |

Choisis l'un des deux pour les objets et reste constant. Pour tout le reste : `type`.

### Étendre, combiner

```ts-run
interface Animal { nom: string }
interface Chien extends Animal { race: string }

type Date2 = { cree: Date };
type Article = { titre: string } & Date2; // intersection : les deux à la fois

const rex: Chien = { nom: 'Rex', race: 'berger' };
const a: Article = { titre: 'A', cree: new Date(0) };
console.log(rex.nom, a.titre);
```

Une intersection impossible donne `never` : `string & number`.

### Clés inconnues

```ts-run
interface Scores { [joueur: string]: number } // signature d'index
const s: Scores = { ada: 3 };
s.linus = 5;

const parNom: Record<string, number> = s;     // pareil
const langues: Record<'fr' | 'ko', string> = { fr: 'Bonjour', ko: 'Annyeong' }; // toutes les clés exigées
console.log(parNom, langues.ko);
```

Avec `Record<string, number>`, TypeScript croit que **toute** clé existe. Plus sûr : `Partial<Record<string, number>>`.

### readonly

`readonly` empêche de réaffecter la propriété ; `readonly T[]` (ou `ReadonlyArray<T>`) interdit `push`, `sort`… Ce sont des protections à la **compilation** seulement.

### Types d'appel et de construction

Un objet peut être appelable :

```ts-run
interface Compteur {
  (): number;        // appelable
  valeur: number;    // avec une propriété
}
const creer = (): Compteur => {
  const c = (() => ++c.valeur) as Compteur;
  c.valeur = 0;
  return c;
};
const c = creer();
c();
console.log(c(), c.valeur);
```

@@ code modele | Modéliser un blog | ts
Déclare :

- `Entite` : `id` (nombre, lecture seule) et `cree` (`Date`, lecture seule)
- `Auteur` : une `Entite` avec `nom` et `email` facultatif
- `Article` : une `Entite` avec `titre`, `auteur` (un `Auteur`) et `tags`, un tableau de textes en **lecture seule**

Puis `resume(article)`, qui renvoie `'<titre> par <nom> [tag1, tag2]'` (sans les crochets s'il n'y a pas de tag).
@starter

@test `resume`
const auteur = { id: 1, cree: new Date(0), nom: 'Ada' };
expect(resume({ id: 2, cree: new Date(0), titre: 'TS', auteur, tags: ['a', 'b'] })).toBe('TS par Ada [a, b]');
expect(resume({ id: 2, cree: new Date(0), titre: 'TS', auteur, tags: [] })).toBe('TS par Ada');
@types Un article valable
const au: Auteur = { id: 1, cree: new Date(), nom: 'A' };
const ar: Article = { id: 1, cree: new Date(), titre: 'T', auteur: au, tags: ['x'] };
const e: Entite = ar;
@types `id` est en lecture seule
const a = null! as Article;
// @ts-expect-error
a.id = 3;
@types `tags` ne se modifie pas
const a = null! as Article;
// @ts-expect-error
a.tags.push('x');
@types `email` est facultatif et textuel
type _ = $Expect<$Equal<Auteur['email'], string | undefined>>;
@solution
interface Entite {
  readonly id: number;
  readonly cree: Date;
}

interface Auteur extends Entite {
  nom: string;
  email?: string;
}

interface Article extends Entite {
  titre: string;
  auteur: Auteur;
  tags: readonly string[];
}

function resume({ titre, auteur, tags }: Article): string {
  const base = `${titre} par ${auteur.nom}`;
  return tags.length > 0 ? `${base} [${tags.join(', ')}]` : base;
}

@@ code traductions | Un dictionnaire complet | ts
Déclare `Langue` (`'fr' | 'en' | 'ko'`) et `Textes` : un objet dont chaque langue a **obligatoirement** une traduction, avec les clés `bonjour` et `merci`. Puis `traduire(textes, langue, cle)`.
@starter

@test `traduire`
const t = { fr: { bonjour: 'Bonjour', merci: 'Merci' }, en: { bonjour: 'Hello', merci: 'Thanks' }, ko: { bonjour: 'Annyeong', merci: 'Gomawo' } };
expect([traduire(t, 'ko', 'merci'), traduire(t, 'en', 'bonjour')]).toEqual(['Gomawo', 'Hello']);
@types Il faut toutes les langues
// @ts-expect-error
const t: Textes = { fr: { bonjour: 'a', merci: 'b' }, en: { bonjour: 'a', merci: 'b' } };
@types Il faut toutes les clés
// @ts-expect-error
const t: Textes = { fr: { bonjour: 'a' }, en: { bonjour: 'a', merci: 'b' }, ko: { bonjour: 'a', merci: 'b' } };
@types Langue ou clé inconnue : refusée
const t = null! as Textes;
// @ts-expect-error
traduire(t, 'es', 'merci');
// @ts-expect-error
traduire(t, 'fr', 'zut');
@solution
type Langue = 'fr' | 'en' | 'ko';
type Cle = 'bonjour' | 'merci';
type Textes = Record<Langue, Record<Cle, string>>;

function traduire(textes: Textes, langue: Langue, cle: Cle): string {
  return textes[langue][cle];
}

@@ code fusion | Intersections | ts
`avecHorodatage(objet)` renvoie une copie de l'objet avec une propriété `date: Date` en plus. Le type de l'objet reçu doit être gardé : utilise un paramètre de type `T extends object` et le retour `T & { date: Date }`.
@starter
function avecHorodatage(objet) {
}
@test Ajoute une date
const r = avecHorodatage({ a: 1 }); expect(r.a).toBe(1); expect(r.date).toBeInstanceOf(Date);
@test Ne modifie pas l'original
const o = { a: 1 }; avecHorodatage(o); expect(o).toEqual({ a: 1 });
@types Les deux types sont là
const r = avecHorodatage({ a: 1 }); const n: number = r.a; const d: Date = r.date;
@types Refuse un primitif
// @ts-expect-error
avecHorodatage(5);
@solution
function avecHorodatage<T extends object>(objet: T): T & { date: Date } {
  return { ...objet, date: new Date() };
}

@@ predict excess
Que dit TypeScript ?
```ts
interface P { x: number }
const p: P = { x: 1, y: 2 };
```
@answer Erreur : `y` n'existe pas dans `P`
@wrong Rien : c'est accepté
@wrong Erreur : il manque `z`
@wrong Erreur : `P` doit être un `type`
@why Un objet écrit sur place est vérifié strictement.

@@ predict readonly-tableau
Que dit TypeScript ?
```ts
const l: readonly number[] = [3, 1];
l.sort();
```
@answer Erreur : `sort` n'existe pas sur `readonly number[]`
@wrong Rien : c'est accepté
@wrong Erreur à l'exécution seulement
@wrong Erreur : `l` est une constante
@why `sort` modifie le tableau. `toSorted` est permis.

@@ predict intersection
Quel est le type de `X` ?
```ts
type X = string & number;
```
@answer `never`
@wrong `string | number`
@wrong `unknown`
@wrong `any`
@why Aucune valeur n'est à la fois un texte et un nombre.

@@ card interface-ou-type
Que sait faire `type` que `interface` ne sait pas ?
@back
Nommer des unions, tuples, primitifs et types calculés.

@@ card index
Signature d'index : clés texte, valeurs nombres ?
@back
`{ [cle: string]: number }` ou `Record<string, number>`

@@ defi json-type | Le type de JSON | ts
1. `type Json` : toute valeur JSON (récursif) ; ni `undefined`, ni fonction, ni `Date`
2. `estJson(x: unknown): x is Json` : vérifie à l'exécution (nombres finis seulement, objets simples seulement, pas de cycle)
3. `fusionnerJson(a: Json, b: Json): Json` : objets fusionnés en profondeur ; sinon `b` gagne
@starter

@test `estJson` accepte
expect([null, 1, 'a', true, [], {}, { a: [1, { b: null }] }].map(estJson)).toEqual(new Array(7).fill(true));
@test `estJson` refuse
const c = {}; c.c = c; expect([undefined, NaN, Infinity, () => 1, new Date(), { a: undefined }, [new Map()], c, 1n].map(estJson)).toEqual(new Array(9).fill(false));
@test Un objet partagé n'est pas un cycle
const x = { n: 1 }; expect(estJson({ a: x, b: [x, x] })).toBe(true);
@test `fusionnerJson`
const a = { x: 1, n: { y: 1, z: 2 } }; expect([fusionnerJson(a, { n: { y: 5 }, w: [1] }), fusionnerJson([1], [2]), fusionnerJson({ a: 1 }, null)]).toEqual([{ x: 1, n: { y: 5, z: 2 }, w: [1] }, [2], null]); expect(a.n.y).toBe(1);
@types `Json`
const a: Json = { a: [1, 'x', null, { b: true }] };
// @ts-expect-error
const b: Json = { a: undefined };
// @ts-expect-error
const c: Json = { a: new Date() };
// @ts-expect-error
const d: Json = () => 1;
@solution
type Json = null | boolean | number | string | Json[] | { [cle: string]: Json };

const estObjet = (x: Json): x is { [cle: string]: Json } =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

function verifier(x: unknown, parents: unknown[]): boolean {
  if (x === null || typeof x === 'string' || typeof x === 'boolean') return true;
  if (typeof x === 'number') return Number.isFinite(x);
  if (typeof x !== 'object' || parents.includes(x)) return false;
  const simple = Array.isArray(x) || Object.getPrototypeOf(x) === Object.prototype;
  return simple && Object.values(x).every((v) => verifier(v, [...parents, x]));
}

function estJson(x: unknown): x is Json {
  return verifier(x, []);
}

function fusionnerJson(a: Json, b: Json): Json {
  if (!estObjet(a) || !estObjet(b)) return b;
  const resultat = { ...a };
  for (const [cle, valeur] of Object.entries(b)) {
    resultat[cle] = Object.hasOwn(a, cle) ? fusionnerJson(a[cle], valeur) : valeur;
  }
  return resultat;
}
