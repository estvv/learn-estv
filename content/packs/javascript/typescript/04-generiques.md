# Génériques
> Des types en paramètres.

@@ lesson generiques | Les génériques

Un **paramètre de type** retient un type pour le réutiliser :

```ts-run
function premier<T>(liste: T[]): T | undefined {
  return liste[0];
}
const a = premier([1, 2]);       // T = number, déduit
const b = premier(['x']);        // T = string
const c = premier<boolean>([]);  // T donné
console.log(a, b, c);
```

Avec `any`, on perdrait le lien entre l'entrée et la sortie. C'est tout l'intérêt : **relier** des types.

> Un paramètre de type qui n'apparaît qu'une fois ne relie rien : il est probablement inutile.

### Plusieurs paramètres, contraintes

`extends` exige une forme minimale ; `keyof T` est l'union des clés de `T` :

```ts-run
function lire<T, K extends keyof T>(objet: T, cle: K): T[K] {
  return objet[cle];
}
const user = { nom: 'Ada', age: 36 };
console.log(lire(user, 'nom').toUpperCase(), lire(user, 'age') + 1);

function plusLong<T extends { length: number }>(x: T, y: T): T {
  return x.length >= y.length ? x : y;
}
console.log(plusLong('abc', 'de'), plusLong([1], [2, 3]));
```

### Types, interfaces et classes génériques

```ts-run
interface Boite<T> { contenu: T }
type Paire<A, B = A> = [A, B];   // B vaut A par défaut
type Resultat<T, E = string> = { ok: true; valeur: T } | { ok: false; erreur: E };

class File<T> {
  #elements: T[] = [];
  ajouter(x: T): this { this.#elements.push(x); return this; }
  retirer(): T | undefined { return this.#elements.shift(); }
}
const f = new File<number>().ajouter(1).ajouter(2);
const p: Paire<number> = [1, 2];
const b: Boite<string> = { contenu: 'x' };
console.log(f.retirer(), p, b);
```

### Garder les littéraux

`const T` demande le type le plus précis possible :

```ts-run
function choix<const T extends readonly string[]>(...valeurs: T): T[number] {
  return valeurs[0]!;
}
const c = choix('rouge', 'vert'); // 'rouge' | 'vert'
console.log(c);
```

`NoInfer<T>` empêche un paramètre de participer à la déduction :

```ts
function creer<E extends string>(etats: E[], initial: NoInfer<E>) {}
creer(['a', 'b'], 'a');   // initial doit être 'a' ou 'b'
```

@@ code utilitaires | Les classiques, typés | ts
Écris en génériques :

- `dernier(liste)` : le dernier élément, ou `undefined`
- `monMap(liste, f)` : comme `map`
- `grouper(liste, cleDe)` : une `Map` de la clé vers la liste des éléments
@starter

@test `dernier`
expect([dernier([1, 2]), dernier([])]).toEqual([2, undefined]);
@test `monMap`
expect(monMap([1, 2], (n) => `n${n}`)).toEqual(['n1', 'n2']);
@test `grouper`
expect(grouper(['ab', 'c', 'de'], (s) => s.length)).toEqual(new Map([[2, ['ab', 'de']], [1, ['c']]]));
@types `dernier`
const a: number | undefined = dernier([1]); type _ = $Expect<$Equal<typeof a, number | undefined>>; const r = dernier(['x']); type _2 = $Expect<$Equal<typeof r, string | undefined>>;
@types `monMap`
const r = monMap([1, 2], (n) => n > 1); type _ = $Expect<$Equal<typeof r, boolean[]>>;
@types `grouper`
const r = grouper([{ age: 3 }], (x) => x.age); type _ = $Expect<$Equal<typeof r, Map<number, { age: number }[]>>>;
@solution
function dernier<T>(liste: T[]): T | undefined {
  return liste.at(-1);
}

function monMap<T, R>(liste: T[], f: (element: T) => R): R[] {
  const resultat: R[] = [];
  for (const x of liste) resultat.push(f(x));
  return resultat;
}

function grouper<T, K>(liste: T[], cleDe: (element: T) => K): Map<K, T[]> {
  const groupes = new Map<K, T[]>();
  for (const x of liste) {
    const cle = cleDe(x);
    const groupe = groupes.get(cle) ?? [];
    groupe.push(x);
    groupes.set(cle, groupe);
  }
  return groupes;
}

@@ code pluck | Choisir des clés | ts
- `extraire(liste, cle)` : la valeur de cette clé pour chaque objet
- `choisir(objet, ...cles)` : une copie avec seulement ces clés, de type `Pick<T, K>`
@starter

@test `extraire`
expect(extraire([{ a: 1, b: 'x' }, { a: 2, b: 'y' }], 'b')).toEqual(['x', 'y']);
@test `choisir`
expect(choisir({ a: 1, b: 2, c: 3 }, 'a', 'c')).toEqual({ a: 1, c: 3 });
@types `extraire`
const r = extraire([{ a: 1, b: 'x' }], 'b'); type _ = $Expect<$Equal<typeof r, string[]>>;
// @ts-expect-error
extraire([{ a: 1 }], 'zut');
@types `choisir`
const r = choisir({ a: 1, b: 'x', c: true }, 'a', 'b'); const n: number = r.a; const s: string = r.b;
// @ts-expect-error
r.c;
// @ts-expect-error
choisir({ a: 1 }, 'z');
@hint
`K extends keyof T`. Pour construire le résultat vide, une assertion est nécessaire : `const r = {} as Pick<T, K>;`
@solution
function extraire<T, K extends keyof T>(liste: T[], cle: K): T[K][] {
  return liste.map((x) => x[cle]);
}

function choisir<T extends object, K extends keyof T>(objet: T, ...cles: K[]): Pick<T, K> {
  const resultat = {} as Pick<T, K>;
  for (const cle of cles) resultat[cle] = objet[cle];
  return resultat;
}

@@ code resultat | Un type Resultat | ts
- `type Resultat<T, E = string>` : `{ ok: true; valeur: T }` ou `{ ok: false; erreur: E }`
- `reussi(valeur)` et `echec(erreur)` : les fabriquent
- `transformer(r, f)` : applique `f` à la valeur si c'est un succès, sinon laisse passer l'échec
@starter

@test Fabriquer
expect([reussi(3), echec('non')]).toEqual([{ ok: true, valeur: 3 }, { ok: false, erreur: 'non' }]);
@test Transformer
expect(transformer(reussi(3), (n) => n * 2)).toEqual({ ok: true, valeur: 6 }); expect(transformer(echec('non'), (n) => n * 2)).toEqual({ ok: false, erreur: 'non' });
@types `E` vaut `string` par défaut
const r: Resultat<number> = { ok: false, erreur: 'x' };
const s: Resultat<number, Error> = { ok: false, erreur: new Error() };
@types Transformer change le type de la valeur
const r = null! as Resultat<number>;
const s: Resultat<string> = transformer(r, (n) => n.toFixed(1));
@types Il faut vérifier `ok` avant de lire
const r = null! as Resultat<number>;
// @ts-expect-error
r.valeur;
if (r.ok) { const n: number = r.valeur; }
@hint
`reussi<T>(valeur: T): Resultat<T, never>` : un succès ne contient aucune erreur, `never` convient partout.
@solution
type Resultat<T, E = string> = { ok: true; valeur: T } | { ok: false; erreur: E };

const reussi = <T>(valeur: T): Resultat<T, never> => ({ ok: true, valeur });
const echec = <E>(erreur: E): Resultat<never, E> => ({ ok: false, erreur });

function transformer<T, R, E>(r: Resultat<T, E>, f: (valeur: T) => R): Resultat<R, E> {
  return r.ok ? reussi(f(r.valeur)) : r;
}

@@ code emetteur-type | Un émetteur typé | ts
`class Emetteur<E>` où `E` décrit les événements, par exemple `{ message: string; fin: undefined }` :

- `on(nom, f)` : `f` reçoit la donnée de **cet** événement ; renvoie le désabonnement
- `emit(nom, donnee)`
@starter

@test Marche
const e = new Emetteur(); const l = []; const off = e.on('message', (m) => l.push(m)); e.emit('message', 'a'); off(); e.emit('message', 'b'); expect(l).toEqual(['a']);
@test Événement sans abonné
new Emetteur().emit('rien', 1);
@types La donnée dépend de l'événement
const e = new Emetteur<{ message: string; nombre: number }>();
e.on('message', (m) => { const s: string = m; }); e.on('nombre', (n) => n.toFixed(1)); e.emit('nombre', 3);
@types Erreurs refusées
const e = new Emetteur<{ message: string }>();
// @ts-expect-error
e.emit('message', 3);
// @ts-expect-error
e.on('zut', () => {});
@hint
`on<K extends keyof E>(nom: K, f: (donnee: E[K]) => void)`. Pour ranger les abonnés : `{ [K in keyof E]?: ((donnee: E[K]) => void)[] } `, ou une `Map<keyof E, …>` avec une fonction qui reçoit `never`.
@solution
class Emetteur<E> {
  #abonnes: { [K in keyof E]?: ((donnee: E[K]) => void)[] } = {};

  on<K extends keyof E>(nom: K, f: (donnee: E[K]) => void): () => void {
    this.#abonnes[nom] = [...(this.#abonnes[nom] ?? []), f];
    return () => {
      this.#abonnes[nom] = this.#abonnes[nom]?.filter((g) => g !== f);
    };
  }

  emit<K extends keyof E>(nom: K, donnee: E[K]): void {
    for (const f of this.#abonnes[nom] ?? []) f(donnee);
  }
}

@@ predict deduction
Quel est le type de `r` ?
```ts
const id = <T>(x: T): T => x;
let r = id('a');
```
@answer `string`
@wrong `'a'`
@wrong `unknown`
@wrong `T`
@why `T` est déduit, puis élargi à `string` car `r` est un `let`.

@@ predict keyof-acces
Quel est le type de `T[K]` si `T = { a: string; b: number }` et `K = 'a' | 'b'` ?
@answer `string | number`
@wrong `'a' | 'b'`
@wrong `string & number`
@wrong `unknown`
@why Un accès indexé avec une union de clés donne l'union des types.

@@ card contrainte
Comment exiger que `T` ait une propriété `length` numérique ?
@back
`<T extends { length: number }>`

@@ card cle-objet
Signature d'une fonction qui lit une propriété d'un objet, bien typée ?
@back
`function lire<T, K extends keyof T>(o: T, k: K): T[K]`

@@ defi option | Une Option chaînable | ts
Classe `Option<T>` (une valeur, ou rien), avec :

- `Option.de(x)` : rien si `x` est `null` ou `undefined` (le type les **retire**) ; `Option.rien()` (assignable à toute `Option`)
- `.map(f)` (si `f` renvoie `null` ou `undefined`, donne rien), `.flatMap(f)`, `.filtrer(test)` — avec une **garde de type**, le type se réduit
- `.ou(defaut)` : la valeur, ou `defaut` (d'un type éventuellement différent)
- `.match({ oui, non })` ; `Option.toutes([a, b])` : une Option du tuple de valeurs
@starter

@test Valeur ou rien
expect([Option.de(5).map((n) => n * 2).ou(0), Option.de(null).map((n) => n * 2).ou('x'), Option.de(0).ou(9), Option.rien().ou(1)]).toEqual([10, 'x', 0, 1]);
@test `map` vers rien, `flatMap`, `filtrer`
expect([Option.de({}).map((o) => o.zut).ou('vide'), Option.de(4).flatMap((n) => Option.de(n + 1)).ou(0), Option.de(4).filtrer((n) => n > 10).ou(-1)]).toEqual(['vide', 5, -1]);
@test `match` et `toutes`
expect([Option.de(1).match({ oui: (n) => `a${n}`, non: () => 'b' }), Option.rien().match({ oui: () => 'a', non: () => 'b' }), Option.toutes([Option.de(1), Option.de('x')]).ou(null), Option.toutes([Option.de(1), Option.rien()]).ou('rien')]).toEqual(['a1', 'b', [1, 'x'], 'rien']);
@types `de` retire null et undefined
const x = null! as string | null | undefined; const o = Option.de(x); type _ = $Expect<$Equal<typeof o, Option<string>>>;
@types Types suivis
const n: number = Option.de('a').map((s) => s.length).ou(0); const u: number | string = Option.de(1).ou('x'); const r: Option<number> = Option.rien();
const d = Option.de([1, undefined].at(0)).map((v) => (v > 1 ? v : null)); type _ = $Expect<$Equal<typeof d, Option<number>>>;
@types Garde de type
const o = Option.de(null! as string | number).filtrer((x) => typeof x === 'string'); type _ = $Expect<$Equal<typeof o, Option<string>>>;
@types `toutes` donne un tuple
const o = Option.toutes([Option.de(1), Option.de('x')]); type _ = $Expect<$Equal<typeof o, Option<[number, string]>>>;
@hint
`NonNullable<T>` pour `de` et `map`. `filtrer` a deux surcharges, dont une avec `test: (x: T) => x is S`.
@hint
`toutes<const T extends readonly Option<any>[]>(…): Option<{ -readonly [I in keyof T]: T[I] extends Option<infer V> ? V : never }>`.
@solution
class Option<T> {
  private constructor(private readonly contenu: { valeur: T } | null) {}

  static de<T>(x: T): Option<NonNullable<T>> {
    return new Option<NonNullable<T>>(x === null || x === undefined ? null : { valeur: x });
  }

  static rien(): Option<never> {
    return new Option<never>(null);
  }

  static toutes<const T extends readonly Option<any>[]>(
    options: T,
  ): Option<{ -readonly [I in keyof T]: T[I] extends Option<infer V> ? V : never }> {
    const valeurs: unknown[] = [];
    for (const { contenu } of options) {
      if (!contenu) return Option.rien();
      valeurs.push(contenu.valeur);
    }
    return new Option<any>({ valeur: valeurs });
  }

  map<R>(f: (valeur: T) => R): Option<NonNullable<R>> {
    return this.contenu ? Option.de(f(this.contenu.valeur)) : Option.rien();
  }

  flatMap<R>(f: (valeur: T) => Option<R>): Option<R> {
    return this.contenu ? f(this.contenu.valeur) : Option.rien();
  }

  filtrer<S extends T>(test: (valeur: T) => valeur is S): Option<S>;
  filtrer(test: (valeur: T) => boolean): Option<T>;
  filtrer(test: (valeur: T) => boolean): Option<T> {
    return this.contenu && test(this.contenu.valeur) ? this : Option.rien();
  }

  ou<D>(defaut: D): T | D {
    return this.contenu ? this.contenu.valeur : defaut;
  }

  match<R>({ oui, non }: { oui: (valeur: T) => R; non: () => R }): R {
    return this.contenu ? oui(this.contenu.valeur) : non();
  }
}
