# Déclarations et modules
> Compléter des types existants, écrire des .d.ts, publier.

@@ lesson declarations | Déclarer et compléter

Une **déclaration** (`declare`) décrit une valeur qui existe ailleurs : elle ne produit aucun code.

```ts
declare const VERSION: string;                 // variable globale
declare function $(selecteur: string): Element; // fonction globale
declare module 'vieux-paquet' {                 // paquet sans types
  export function faire(x: string): number;
}
declare module '*.svg' {                        // import de fichiers
  const url: string;
  export default url;
}
```

Un fichier `.d.ts` ne contient que des déclarations.

### La fusion

Deux `interface` de même nom **fusionnent**. C'est le point d'extension officiel des bibliothèques :

```ts-run
interface Evenements { connexion: { user: string } }
interface Evenements { achat: { prix: number } } // ailleurs, un plugin ajoute le sien

function emettre<K extends keyof Evenements>(nom: K, donnees: Evenements[K]) {
  console.log(nom, JSON.stringify(donnees));
}
emettre('achat', { prix: 3 });
```

### Compléter le global

Dans un **module**, il faut `declare global` :

```ts-run
declare global {
  interface Array<T> {
    dernier(): T | undefined;
  }
}
Array.prototype.dernier = function () { return this.at(-1); };
console.log([1, 2, 3].dernier());
```

Étendre les types natifs est rarement une bonne idée dans une bibliothèque : tout le monde en hérite.

### Compléter un module

```ts
declare module 'express' {
  interface Request { user?: { id: number } }
}
```

### Publier une bibliothèque

Dans `tsconfig` : `"declaration": true` génère les `.d.ts`. Dans `package.json` :

```json
{
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "files": ["dist"]
}
```

`isolatedDeclarations` demande d'annoter les exports : des `.d.ts` plus rapides à produire, et une API publique explicite.

### Surcharges ou génériques ?

Une surcharge par cas si les liens sont irréguliers ; un générique si un lien simple relie entrée et sortie.

@@ code plugins | Un système de plugins | ts
Les plugins ajoutent leurs commandes à l'interface `Commandes` par **fusion**.

1. Déclare l'interface `Commandes` avec `aide: () => string`
2. Complète-la (dans une seconde déclaration) avec `additionner: (a: number, b: number) => number`
3. `enregistrer(nom, f)` : vérifie le type de `f` d'après `Commandes`
4. `lancer(nom, ...args)` : arguments et retour typés ; lance une `Error` contenant le nom si la commande n'est pas enregistrée
@starter

@test Enregistre et lance
enregistrer('aide', () => 'ok'); enregistrer('additionner', (a, b) => a + b); expect([lancer('aide'), lancer('additionner', 2, 3)]).toEqual(['ok', 5]);
@test Commande non enregistrée
expect(() => lancer('inconnue')).toThrow('inconnue');
@test Deux déclarations
expect($source.match(/interface Commandes/g)).toHaveLength(2);
@types Types vérifiés
const n: number = lancer('additionner', 1, 2); const s: string = lancer('aide');
// @ts-expect-error
lancer('additionner', 1);
// @ts-expect-error
lancer('zut');
// @ts-expect-error
enregistrer('aide', () => 3);
@hint
`lancer<K extends keyof Commandes>(nom: K, ...args: Parameters<Commandes[K]>): ReturnType<Commandes[K]>`. Dans le corps, une `Map<string, (...args: any[]) => any>` suffit.
@solution
interface Commandes {
  aide: () => string;
}

interface Commandes {
  additionner: (a: number, b: number) => number;
}

const commandes = new Map<string, (...args: any[]) => any>();

function enregistrer<K extends keyof Commandes>(nom: K, f: Commandes[K]): void {
  commandes.set(nom, f);
}

function lancer<K extends keyof Commandes>(nom: K, ...args: Parameters<Commandes[K]>): ReturnType<Commandes[K]> {
  const f = commandes.get(nom);
  if (!f) throw new Error(`Commande inconnue : ${nom}`);
  return f(...args);
}

@@ code etendre-natif | Compléter un type natif | ts
Ajoute (types **et** code) :

- `Array.prototype.grouperPar(f)` : un `Map` de la clé vers les éléments
- `String.prototype.enTitre()` : première lettre en majuscule

Les méthodes ne doivent pas apparaître dans un `for…in`.
@starter

@test `grouperPar`
expect([1, 2, 3].grouperPar((x) => x % 2)).toEqual(new Map([[1, [1, 3]], [0, [2]]]));
@test `enTitre`
expect(['ada'.enTitre(), ''.enTitre()]).toEqual(['Ada', '']);
@test Invisibles dans `for…in`
const c = []; for (const k in [1]) c.push(k); expect(c).toEqual(['0']);
@types Types
const m: Map<string, number[]> = [1].grouperPar((n) => String(n)); const s: string = 'a'.enTitre();
// @ts-expect-error
[1].grouperPar(3);
@hint
`declare global { interface Array<T> { … } }`, et `Object.defineProperty(Array.prototype, 'grouperPar', { value: function … })` : non énumérable par défaut.
@solution
declare global {
  interface Array<T> {
    grouperPar<K>(f: (element: T) => K): Map<K, T[]>;
  }
  interface String {
    enTitre(): string;
  }
}

Object.defineProperty(Array.prototype, 'grouperPar', {
  configurable: true,
  value: function <T, K>(this: T[], f: (element: T) => K): Map<K, T[]> {
    const groupes = new Map<K, T[]>();
    for (const x of this) {
      const cle = f(x);
      const groupe = groupes.get(cle);
      if (groupe) groupe.push(x);
      else groupes.set(cle, [x]);
    }
    return groupes;
  },
});

Object.defineProperty(String.prototype, 'enTitre', {
  configurable: true,
  value: function (this: string): string {
    return this.slice(0, 1).toUpperCase() + this.slice(1);
  },
});

export {};

@@ code typer-existant | Typer du code existant | ts
`biblio.js` est du vieux JavaScript (en lecture seule). Écris, dans `main.ts`, le type `Biblio` qui la décrit **précisément**, et exporte `lib`, la bibliothèque avec ce type :

- `creer(nom)` renvoie `{ nom, tags: string[] }` ; `creer(nom, tag1, tag2…)` les ajoute
- `trouver(id)` renvoie un article ou `null` ; `trouver([ids])` renvoie un **tableau** d'articles
- `options(cle)` lit une option ; `options(cle, valeur)` l'écrit et renvoie la bibliothèque. Options : `langue` (texte) et `limite` (nombre)
@starter main.ts
import brut from './biblio.js';

export const lib = brut;
@starter biblio.js readonly
const reglages = { langue: 'fr', limite: 10 };
const biblio = {
  creer(nom, ...tags) { return { nom, tags }; },
  trouver(x) { return Array.isArray(x) ? x.map((id) => ({ nom: `a${id}`, tags: [] })) : x > 0 ? { nom: `a${x}`, tags: [] } : null; },
  options(cle, ...v) { if (v.length === 0) return reglages[cle]; reglages[cle] = v[0]; return biblio; },
};
export default biblio;
@test Marche toujours
expect([lib.creer('a', 'x').tags, lib.trouver([1, 2]).length, lib.options('limite', 5).options('limite')]).toEqual([['x'], 2, 5]);
@types `creer`
const a: { nom: string; tags: string[] } = lib.creer('a', 'b', 'c');
// @ts-expect-error
lib.creer(3);
@types `trouver`
const a = lib.trouver(1); const b = lib.trouver([1]); const n: string = b[0].nom;
// @ts-expect-error
a.nom;
// @ts-expect-error
b.zut;
@types `options`
const l: string = lib.options('langue'); const n: number = lib.options('limite'); lib.options('langue', 'ko').options('limite', 3).creer('x');
// @ts-expect-error
lib.options('limite', 'x');
// @ts-expect-error
lib.options('zut');
@solution main.ts
import brut from './biblio.js';

interface Article {
  nom: string;
  tags: string[];
}

interface Options {
  langue: string;
  limite: number;
}

interface Biblio {
  creer(nom: string, ...tags: string[]): Article;
  trouver(id: number): Article | null;
  trouver(ids: number[]): Article[];
  options<K extends keyof Options>(cle: K): Options[K];
  options<K extends keyof Options>(cle: K, valeur: Options[K]): Biblio;
}

export const lib = brut as unknown as Biblio;

@@ defi promisifier | Promisifier une API à callbacks | ts
L'API donnée utilise des callbacks `(erreur, resultat) => void` en **dernier** paramètre. `promisifier(api)` renvoie un objet où chaque **fonction à callback** devient une fonction qui renvoie une promesse, et où le reste est **inchangé**. Les types doivent suivre : paramètres sans le callback, promesse du résultat (`void` si le callback n'a pas de résultat). Une fonction à callback se reconnaît, à l'exécution, à son nom terminé par `Async`, et le nouveau nom n'a plus ce suffixe.
@starter
type Retour<R> = (erreur: Error | null, resultat?: R) => void;

@test Résultats
const api = { base: 10, lireAsync(id, cb) { setTimeout(() => (id < 0 ? cb(new Error('non')) : cb(null, this.base + id)), 2); }, ecrireAsync(a, b, cb) { setTimeout(() => cb(null), 1); }, nom: (x) => x + '!', version: 3 }; const p = promisifier(api); expect([await p.lire(5), await p.ecrire(1, 2), p.nom('a'), p.version]).toEqual([15, undefined, 'a!', 3]);
@test Erreurs
const p = promisifier({ lireAsync(id, cb) { cb(new Error('non')); } }); await expect(p.lire(1)).toReject('non');
@test Plus de suffixe
expect(Object.keys(promisifier({ aAsync: (cb) => cb(null), b: 1 }))).toEqual(['a', 'b']);
@types Types suivis
const p = promisifier({ lireAsync(id: number, cb: Retour<string>) {}, finAsync(cb: Retour<void>) {}, version: 3, nom: (x: string) => x });
const a: Promise<string> = p.lire(1); const b: Promise<void> = p.fin(); const v: number = p.version; const n: string = p.nom('a');
// @ts-expect-error
p.lire('x');
// @ts-expect-error
p.lireAsync;
@hint
Les clés : `` [K in keyof A as K extends `${infer N}Async` ? N : K] ``. Une valeur : `F extends (...args: [...infer P, Retour<infer R>]) => void ? (...args: P) => Promise<R> : F`.
@solution
type Retour<R> = (erreur: Error | null, resultat?: R) => void;

type Promisifiee<F> =
  F extends (...args: [...infer P, Retour<infer R>]) => void ? (...args: P) => Promise<R> : F;

type Promisifie<A> = {
  [K in keyof A as K extends `${infer N}Async` ? N : K]: K extends `${string}Async` ? Promisifiee<A[K]> : A[K];
};

function promisifier<A extends object>(api: A): Promisifie<A> {
  const entrees = Object.entries(api).map(([nom, valeur]: [string, unknown]) => {
    if (!nom.endsWith('Async') || typeof valeur !== 'function') return [nom, valeur];
    const f = (...args: unknown[]) => new Promise((resolve, reject) => {
      const retour: Retour<unknown> = (erreur, resultat) => (erreur ? reject(erreur) : resolve(resultat));
      valeur.call(api, ...args, retour);
    });
    return [nom.slice(0, -'Async'.length), f];
  });
  return Object.fromEntries(entrees) as Promisifie<A>;
}

@@ predict declare
Que produit `declare const X: string;` à l'exécution ?
@answer Rien
@wrong Une variable `X` vide
@wrong Une erreur
@wrong `X = undefined`
@why `declare` décrit une valeur qui existe ailleurs.

@@ predict fusion-type
Peut-on compléter un `type` en le redéclarant ?
@answer Non : seules les interfaces fusionnent
@wrong Oui
@wrong Oui, avec `declare global`
@wrong Seulement dans un `.d.ts`
@why C'est une raison de choisir `interface` pour un point d'extension.

@@ card declare-global
Ajouter une méthode au type `Array` depuis un module ?
@back
`declare global { interface Array<T> { … } }`

@@ card dts
Que contient un fichier `.d.ts` ?
@back
Seulement des déclarations de types, aucun code.
