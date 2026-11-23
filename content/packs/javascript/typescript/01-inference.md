# Le système de types
> Inférence, any, unknown, never, et ce que TypeScript vérifie vraiment.

@@ lesson inference | Annoter ou laisser deviner

TypeScript **infère** presque tout. Règle simple :

- **annote** les paramètres de fonction et, de préférence, les retours des fonctions exportées ;
- **laisse deviner** les variables locales.

```ts-run
const nom = 'Ada';              // type 'Ada' : une constante ne changera pas
let ville = 'Séoul';            // type string : élargi
const notes = [12, 15];         // number[]
const user = { nom, age: 36 };  // { nom: string; age: number }
console.log(nom, ville, notes, user);
```

Survole les noms après avoir cliqué **Modifier** : `const nom` a le type **littéral** `'Ada'`, `let ville` le type `string`.

### Typage structurel

Ce qui compte, c'est la **forme**, pas le nom du type :

```ts-run
interface Point { x: number; y: number }
function afficher(p: Point) { console.log(p.x, p.y); }

const ville3D = { x: 1, y: 2, z: 3 };
afficher(ville3D);              // a au moins x et y : accepté
```

Exception : un objet écrit **directement** à l'endroit du type est vérifié strictement (*excess property check*), pour attraper les fautes de frappe : `afficher({ x: 1, y: 2, z: 3 })` est refusé.

### TypeScript n'est pas là à l'exécution

Il n'y a aucun contrôle pendant l'exécution. Des données venues de l'extérieur (API, JSON, formulaire) peuvent mentir : il faut les vérifier toi-même.

@@ lesson speciaux | any, unknown, never, void

| Type | Veut dire | Utilisation |
|---|---|---|
| `any` | « ne vérifie plus rien » | à éviter : il contamine tout |
| `unknown` | « n'importe quoi, à vérifier » | données externes, erreurs |
| `never` | « impossible » | fonction qui ne revient jamais, cas épuisé |
| `void` | « retour sans intérêt » | callbacks, fonctions à effet |

```ts-run
const a: any = 'texte';
try { a.methodeInventee(); } catch { console.log('any : aucune protection'); }

const u: unknown = 'texte';
// u.length;                    // refusé : il faut vérifier d'abord
if (typeof u === 'string') console.log(u.length);

function echouer(m: string): never { throw new Error(m); }
function valeur(x: string | null): string {
  return x ?? echouer('absent'); // string | never = string
}
console.log(valeur('ok'));
```

### null et undefined

Avec `strict`, `null` et `undefined` ne vont que là où on les accepte.

```ts-run
function longueur(s?: string): number { // s : string | undefined
  return s === undefined ? 0 : s.length;
}
console.log(longueur(), longueur('abc'));
```

L'opérateur `!` (`x!.length`) affirme « pas null, promis » **sans vérifier** : dernier recours. De même, `as` (assertion) fait taire le vérificateur :

```ts-run
const brut: unknown = { nom: 'Ada' };
const user = brut as { nom: string }; // aucune vérification !
console.log(user.nom);
```

### Les options

Un projet TypeScript a un `tsconfig.json`. L'essentiel : `"strict": true`. Très utiles ensuite : `noUncheckedIndexedAccess` (`liste[0]` devient `T | undefined`), `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`.

@@ code sans-any | Bannir any | ts
Remplace **tous** les `any` par le bon type, sans toucher au code.
@starter
function total(articles: any): any {
  return articles.reduce((s: any, a: any) => s + a.prix * a.quantite, 0);
}

const noms: any = new Map([['a', 'Ada']]);

function saluer(id: any): any {
  return noms.get(id)?.toUpperCase() ?? 'inconnu';
}
@test Le code marche toujours
expect(total([{ prix: 2, quantite: 3 }])).toBe(6); expect([saluer('a'), saluer('z')]).toEqual(['ADA', 'inconnu']);
@test Plus de `any`
expect($source).not.toMatch(/\bany\b/);
@types `total`
const n: number = total([{ prix: 1, quantite: 2 }]);
// @ts-expect-error
total([{ prix: 'a', quantite: 2 }]);
@types `noms` et `saluer`
type _ = [$Expect<$Equal<typeof noms, Map<string, string>>>, $Expect<$Equal<typeof saluer, (id: string) => string>>];
@solution
interface Article {
  prix: number;
  quantite: number;
}

function total(articles: Article[]): number {
  return articles.reduce((s, a) => s + a.prix * a.quantite, 0);
}

const noms: Map<string, string> = new Map([['a', 'Ada']]);

function saluer(id: string): string {
  return noms.get(id)?.toUpperCase() ?? 'inconnu';
}

@@ code additionner-inconnu | Apprivoiser unknown | ts
`sommeInconnue(x: unknown): number` : si `x` est un nombre, lui-même ; si c'est un tableau, la somme de ses éléments (traités pareil, donc imbriqués) ; sinon 0.
@starter
function sommeInconnue(x: unknown): number {
  return x;
}
@test Un nombre
expect(sommeInconnue(4)).toBe(4);
@test Un tableau, même imbriqué
expect(sommeInconnue([1, 'a', [2, [3, null]], {}])).toBe(6);
@test Le reste
expect([sommeInconnue('5'), sommeInconnue(null), sommeInconnue({ a: 1 })]).toEqual([0, 0, 0]);
@test Ni `any` ni `as`
expect($source).not.toMatch(/\bany\b|\bas\b/);
@hint
`Array.isArray(x)` réduit le type ; puis `reduce<number>` avec un appel récursif, ou une simple boucle `for…of`.
@solution
function sommeInconnue(x: unknown): number {
  if (typeof x === 'number') return x;
  if (!Array.isArray(x)) return 0;
  let total = 0;
  for (const element of x) total += sommeInconnue(element);
  return total;
}

@@ code exiger | Une fonction qui n'échoue pas en silence | ts
- `echouer(message)` lance une `Error` ; son retour est `never`
- `exiger(valeur, nom)` reçoit `string | null | undefined` et un nom ; renvoie le texte (type `string`), ou échoue avec `<nom> est obligatoire` s'il est absent **ou vide**
@starter
function echouer(message) {
}

function exiger(valeur, nom) {
}
@test Renvoie le texte
expect(exiger('ok', 'champ')).toBe('ok');
@test Échoue
for (const v of [null, undefined, '']) expect(() => exiger(v, 'email')).toThrow('email est obligatoire');
@types Types
type _ = [$Expect<$Equal<ReturnType<typeof echouer>, never>>, $Expect<$Equal<typeof exiger, (valeur: string | null | undefined, nom: string) => string>>];
@solution
function echouer(message: string): never {
  throw new Error(message);
}

function exiger(valeur: string | null | undefined, nom: string): string {
  return valeur || echouer(`${nom} est obligatoire`);
}

@@ predict const-litteral
Quel est le type de `a` ?
```ts
const a = 'oui';
```
@answer `'oui'`
@wrong `string`
@wrong `String`
@wrong `any`
@why Une `const` ne change jamais : TypeScript garde le type littéral. Avec `let`, ce serait `string`.

@@ predict structurel
Que dit TypeScript ?
```ts
interface P { x: number }
const o = { x: 1, y: 2 };
const p: P = o;
```
@answer Rien : c'est accepté
@wrong Erreur : `y` n'existe pas dans `P`
@wrong Erreur : `o` n'est pas déclaré `P`
@wrong Erreur : il manque `as P`
@why Typage structurel : `o` a au moins `x`. La vérification stricte ne vise que les objets écrits sur place.

@@ predict unknown-acces
Que dit TypeScript ?
```ts
const u: unknown = 'abc';
console.log(u.length);
```
@answer Erreur : `u` est `unknown`
@wrong Rien : c'est accepté
@wrong Erreur : `length` n'existe pas sur `string`
@wrong Un avertissement seulement
@why On ne peut rien faire d'un `unknown` avant d'avoir vérifié ce qu'il est.

@@ card any-unknown
`any` ou `unknown` ?
@back
`any` désactive les vérifications ; `unknown` accepte tout mais oblige à vérifier avant usage.

@@ card never
Deux endroits où l'on voit `never` ?
@back
Le retour d'une fonction qui lance toujours ; une variable dont tous les cas ont été éliminés.

@@ card assertion
Que vérifie `x as T` ?
@back
Rien à l'exécution : c'est toi qui affirmes le type.

@@ defi config-sure | Lire une configuration inconnue | ts
`lireConfig(x: unknown): Config` vérifie une valeur quelconque, **sans** `any` ni `as`. Elle lance une `TypeError` dont le message contient le nom du champ fautif (ou `config` si ce n'est pas un objet). `port` vaut 80 par défaut ; `hotes` doit contenir au moins un texte.
@starter
interface Config {
  nom: string;
  port: number;
  hotes: [string, ...string[]];
  mode: 'dev' | 'prod';
}

@test Une bonne configuration
expect(lireConfig({ nom: 'a', port: 3, hotes: ['x', 'y'], mode: 'dev', zut: 1 })).toEqual({ nom: 'a', port: 3, hotes: ['x', 'y'], mode: 'dev' }); expect(lireConfig({ nom: 'a', hotes: ['x'], mode: 'prod' }).port).toBe(80);
@test Pas un objet
for (const x of [null, 3, 'a', undefined]) expect(() => lireConfig(x)).toThrow('config');
@test Champs fautifs
const ok = { nom: 'a', port: 3, hotes: ['x'], mode: 'dev' }; for (const [champ, v] of [['nom', 3], ['port', '3'], ['port', NaN], ['hotes', []], ['hotes', ['x', 3]], ['hotes', 'x'], ['mode', 'test']]) expect(() => lireConfig({ ...ok, [champ]: v }), champ).toThrow(champ);
@test Ni `any` ni `as`
expect($source).not.toMatch(/\bany\b|\bas\b/);
@types Signature
type _ = $Expect<$Equal<typeof lireConfig, (x: unknown) => Config>>;
@hint
Pour lire un champ d'un `object` sans assertion : `'nom' in x ? x.nom : undefined`.
@hint
Pour le tuple : `const [premier, ...reste] = liste;`, puis vérifie que `premier` est un texte.
@solution
interface Config {
  nom: string;
  port: number;
  hotes: [string, ...string[]];
  mode: 'dev' | 'prod';
}

function echouer(champ: string): never {
  throw new TypeError(`${champ} : valeur incorrecte`);
}

const estTexte = (x: unknown): x is string => typeof x === 'string';

function lireConfig(x: unknown): Config {
  if (typeof x !== 'object' || x === null) return echouer('config');
  const nom = 'nom' in x ? x.nom : undefined;
  const port = 'port' in x ? x.port : 80;
  const hotes = 'hotes' in x ? x.hotes : undefined;
  const mode = 'mode' in x ? x.mode : undefined;

  if (!estTexte(nom)) return echouer('nom');
  if (typeof port !== 'number' || Number.isNaN(port)) return echouer('port');
  if (!Array.isArray(hotes)) return echouer('hotes');
  const [premier, ...reste]: unknown[] = hotes;
  if (!estTexte(premier) || !reste.every(estTexte)) return echouer('hotes');
  if (mode !== 'dev' && mode !== 'prod') return echouer('mode');
  return { nom, port, hotes: [premier, ...reste], mode };
}
