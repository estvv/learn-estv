# Mini-projets : TypeScript
> Une calculatrice, un validateur façon zod, un client d'API typé.

@@ code calculatrice | Une calculatrice | ts
Tu écris un interpréteur : `'2 * (3 + 4)'` → `14`. Trois étapes classiques : découper, construire un arbre, évaluer.
@starter
type Operateur = '+' | '-' | '*' | '/';

type Jeton =
  | { type: 'nombre'; valeur: number }
  | { type: 'op'; op: Operateur }
  | { type: 'parenthese'; sens: '(' | ')' };

type Arbre =
  | { type: 'nombre'; valeur: number }
  | { type: 'calcul'; op: Operateur; gauche: Arbre; droite: Arbre };

@part Découper
`decouper(texte): Jeton[]` transforme le texte en jetons. Les espaces sont ignorés, les nombres peuvent avoir des décimales. Un caractère inconnu lance `new SyntaxError(…)`.
@test Nombres et opérateurs
expect(decouper('12 + 3.5')).toEqual([{ type: 'nombre', valeur: 12 }, { type: 'op', op: '+' }, { type: 'nombre', valeur: 3.5 }]);
@test Parenthèses, sans espaces
expect(decouper('(1)')).toEqual([{ type: 'parenthese', sens: '(' }, { type: 'nombre', valeur: 1 }, { type: 'parenthese', sens: ')' }]);
@test Caractère inconnu
expect(() => decouper('2 $ 3')).toThrow(SyntaxError);
@types Signature
type _ = $Expect<$Equal<typeof decouper, (texte: string) => Jeton[]>>;
@part Évaluer un arbre
`evaluer(arbre): number`. Une division par zéro lance `new RangeError('Division par zéro')`.
@test Un nombre
expect(evaluer({ type: 'nombre', valeur: 7 })).toBe(7);
@test Un calcul imbriqué
const n = (valeur) => ({ type: 'nombre', valeur }); expect(evaluer({ type: 'calcul', op: '*', gauche: n(2), droite: { type: 'calcul', op: '-', gauche: n(10), droite: n(4) } })).toBe(12);
@test Division par zéro
const n = (valeur) => ({ type: 'nombre', valeur }); expect(() => evaluer({ type: 'calcul', op: '/', gauche: n(1), droite: n(0) })).toThrow(RangeError);
@part Construire l'arbre
`analyser(jetons): Arbre`, en respectant les priorités. La méthode : trois fonctions qui s'appellent.

- **expression** : un terme, puis tant qu'on voit `+` ou `-`, un autre terme
- **terme** : un facteur, puis tant qu'on voit `*` ou `/`, un autre facteur
- **facteur** : un nombre, ou `(` expression `)`

Toute erreur (jeton inattendu, parenthèse oubliée, reste à la fin) lance une `SyntaxError`.
@test Priorités
expect(evaluer(analyser(decouper('2 + 3 * 4')))).toBe(14); expect(evaluer(analyser(decouper('2 * 3 + 4')))).toBe(10);
@test De gauche à droite
expect(evaluer(analyser(decouper('10 - 3 - 2')))).toBe(5); expect(evaluer(analyser(decouper('16 / 4 / 2')))).toBe(2);
@test Parenthèses
expect(evaluer(analyser(decouper('2 * (3 + (4 - 1))')))).toBe(12);
@test Erreurs de syntaxe
for (const t of ['', '2 +', '(2', '2 3', '* 2', '2)']) expect(() => analyser(decouper(t)), t).toThrow(SyntaxError);
@part Tout assembler
`calculer(texte)` renvoie `{ ok: true, valeur }`, ou `{ ok: false, erreur }` avec le message : elle ne lance jamais.
@test Réussite
expect(calculer('(1 + 2) * 3')).toEqual({ ok: true, valeur: 9 });
@test Échecs
expect(calculer('1 / 0')).toEqual({ ok: false, erreur: 'Division par zéro' }); expect(calculer('1 +').ok).toBe(false);
@types Union discriminée
const r = calculer('1'); if (r.ok) { const n: number = r.valeur; } else { const s: string = r.erreur; }
// @ts-expect-error
calculer('1').valeur;
@hint
Découper : une boucle avec une position `i`, ou `texte.matchAll(/\s*(\d+(?:\.\d+)?|[-+*/()])|\s*(\S)/g)`.
@hint
Analyser : une variable `position` partagée par les trois fonctions ; `jetons[position]` est le jeton courant, `position++` le consomme.
@solution
type Operateur = '+' | '-' | '*' | '/';

type Jeton =
  | { type: 'nombre'; valeur: number }
  | { type: 'op'; op: Operateur }
  | { type: 'parenthese'; sens: '(' | ')' };

type Arbre =
  | { type: 'nombre'; valeur: number }
  | { type: 'calcul'; op: Operateur; gauche: Arbre; droite: Arbre };

function decouper(texte: string): Jeton[] {
  const jetons: Jeton[] = [];
  let i = 0;
  while (i < texte.length) {
    const c = texte[i];
    if (c === ' ') {
      i++;
    } else if (c === '+' || c === '-' || c === '*' || c === '/') {
      jetons.push({ type: 'op', op: c });
      i++;
    } else if (c === '(' || c === ')') {
      jetons.push({ type: 'parenthese', sens: c });
      i++;
    } else {
      const nombre = /^\d+(\.\d+)?/.exec(texte.slice(i))?.[0];
      if (nombre === undefined) throw new SyntaxError(`Caractère inattendu : ${c}`);
      jetons.push({ type: 'nombre', valeur: Number(nombre) });
      i += nombre.length;
    }
  }
  return jetons;
}

function evaluer(arbre: Arbre): number {
  if (arbre.type === 'nombre') return arbre.valeur;
  const a = evaluer(arbre.gauche);
  const b = evaluer(arbre.droite);
  switch (arbre.op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      if (b === 0) throw new RangeError('Division par zéro');
      return a / b;
  }
}

function analyser(jetons: Jeton[]): Arbre {
  let position = 0;

  const operateur = (...ops: Operateur[]): Operateur | null => {
    const jeton = jetons.at(position);
    if (jeton?.type !== 'op' || !ops.includes(jeton.op)) return null;
    position++;
    return jeton.op;
  };

  const parenthese = (sens: '(' | ')'): boolean => {
    const jeton = jetons.at(position);
    if (jeton?.type !== 'parenthese' || jeton.sens !== sens) return false;
    position++;
    return true;
  };

  const facteur = (): Arbre => {
    if (parenthese('(')) {
      const dedans = expression();
      if (!parenthese(')')) throw new SyntaxError('Parenthèse fermante attendue');
      return dedans;
    }
    const jeton = jetons.at(position);
    if (jeton?.type !== 'nombre') throw new SyntaxError('Nombre attendu');
    position++;
    return { type: 'nombre', valeur: jeton.valeur };
  };

  const suite = (element: () => Arbre, ...ops: Operateur[]): Arbre => {
    let gauche = element();
    for (let op = operateur(...ops); op; op = operateur(...ops)) {
      gauche = { type: 'calcul', op, gauche, droite: element() };
    }
    return gauche;
  };

  const terme = (): Arbre => suite(facteur, '*', '/');
  const expression = (): Arbre => suite(terme, '+', '-');

  const arbre = expression();
  if (position < jetons.length) throw new SyntaxError('Suite inattendue');
  return arbre;
}

type Resultat = { ok: true; valeur: number } | { ok: false; erreur: string };

function calculer(texte: string): Resultat {
  try {
    return { ok: true, valeur: evaluer(analyser(decouper(texte))) };
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : String(e) };
  }
}

@@ code schema | Un validateur typé | ts
Des données externes peuvent mentir. Tu écris un mini-zod : un **schéma** vérifie une valeur à l'exécution **et** donne son type TypeScript, sans l'écrire deux fois.

```ts
const User = objet({ nom: texte(), age: nombre(), tags: tableau(texte()) });
type User = Infer<typeof User>; // { nom: string; age: number; tags: string[] }
const u = User.lire(JSON.parse(reponse)); // vérifié
```
@starter
interface Schema<T> {
  // Renvoie la valeur vérifiée, ou lance une TypeError
  lire(x: unknown): T;
}

@part Les primitifs
`texte()`, `nombre()` et `booleen()` renvoient des schémas. Une mauvaise valeur lance une `TypeError` ; `nombre()` refuse `NaN`.
@test Acceptent le bon type
expect([texte().lire('a'), nombre().lire(0), booleen().lire(false)]).toEqual(['a', 0, false]);
@test Refusent le reste
expect(() => texte().lire(3)).toThrow(TypeError); expect(() => nombre().lire('3')).toThrow(TypeError); expect(() => nombre().lire(NaN)).toThrow(TypeError); expect(() => booleen().lire(null)).toThrow(TypeError);
@types Types des schémas
const a: Schema<string> = texte(); const b: Schema<number> = nombre(); const c: Schema<boolean> = booleen();
@part Infer
`type Infer<S>` : le type que donne un schéma.
@types `Infer`
type _ = [$Expect<$Equal<Infer<Schema<string>>, string>>, $Expect<$Equal<Infer<Schema<number[]>>, number[]>>];
@part Les tableaux
`tableau(schema)` vérifie chaque élément.
@test Vérifie les éléments
expect(tableau(nombre()).lire([1, 2])).toEqual([1, 2]); expect(() => tableau(nombre()).lire([1, 'a'])).toThrow(TypeError); expect(() => tableau(nombre()).lire('ab')).toThrow(TypeError);
@types Type déduit
const s = tableau(tableau(texte())); type _ = $Expect<$Equal<Infer<typeof s>, string[][]>>;
@part Les objets
`objet(forme)` vérifie chaque propriété. Les propriétés en trop sont **retirées** du résultat.
@test Vérifie et nettoie
const s = objet({ nom: texte(), age: nombre() }); expect(s.lire({ nom: 'A', age: 3, pirate: true })).toEqual({ nom: 'A', age: 3 });
@test Refuse
const s = objet({ nom: texte() }); for (const x of [null, 'a', {}, { nom: 3 }]) expect(() => s.lire(x)).toThrow(TypeError);
@types Type déduit
const s = objet({ nom: texte(), adresse: objet({ cp: nombre() }) }); type T = Infer<typeof s>; const t: T = { nom: 'a', adresse: { cp: 1 } }; const n: number = t.adresse.cp;
// @ts-expect-error
const u: T = { nom: 'a', adresse: { cp: 'x' } };
@part Options et unions
- `optionnel(schema)` : accepte aussi `undefined`
- `litteral('a', 'b')` : seulement ces textes, de type `'a' | 'b'`
- `union(s1, s2)` : l'un ou l'autre
@test `optionnel` et `litteral`
expect(optionnel(nombre()).lire(undefined)).toBe(undefined); expect(litteral('a', 'b').lire('b')).toBe('b'); expect(() => litteral('a').lire('z')).toThrow(TypeError);
@test `union`
const s = union(texte(), nombre()); expect([s.lire('a'), s.lire(1)]).toEqual(['a', 1]); expect(() => s.lire(true)).toThrow(TypeError);
@types Types déduits
const a = optionnel(nombre()); const b = litteral('x', 'y'); const c = union(texte(), nombre());
type _ = [$Expect<$Equal<Infer<typeof a>, number | undefined>>, $Expect<$Equal<Infer<typeof b>, 'x' | 'y'>>, $Expect<$Equal<Infer<typeof c>, string | number>>];
@part Des erreurs utiles
Le message d'erreur contient le **chemin** : pour `{ users: [{ age: 'x' }] }`, il contient `users.0.age`. Propriétés et indices sont séparés par des points.
@test Chemin dans un objet
expect(() => objet({ a: objet({ b: nombre() }) }).lire({ a: { b: 'x' } })).toThrow('a.b');
@test Chemin dans un tableau
expect(() => objet({ users: tableau(objet({ age: nombre() })) }).lire({ users: [{ age: 1 }, { age: 'x' }] })).toThrow('users.1.age');
@hint
Une fonction `schema(test, nom)` évite de répéter les primitifs : `test` est une garde `(x: unknown) => x is T`.
@hint
`objet<F extends Record<string, Schema<unknown>>>(forme: F): Schema<{ [K in keyof F]: Infer<F[K]> }>`
@hint
Pour le chemin : une fonction `dans(cle, f)` qui attrape la `TypeError` de `f` et en relance une avec la clé devant.
@solution
interface Schema<T> {
  // Renvoie la valeur vérifiée, ou lance une TypeError
  lire(x: unknown): T;
}

type Infer<S> = S extends Schema<infer T> ? T : never;

class ErreurSchema extends TypeError {
  constructor(readonly chemin: string, readonly detail: string) {
    super(chemin ? `${chemin} : ${detail}` : detail);
  }
}

// Ajoute une clé devant le chemin des erreurs de f
function dans<T>(cle: string | number, f: () => T): T {
  try {
    return f();
  } catch (e) {
    if (!(e instanceof ErreurSchema)) throw e;
    throw new ErreurSchema([cle, e.chemin].filter((c) => c !== '').join('.'), e.detail);
  }
}

function schema<T>(test: (x: unknown) => x is T, nom: string): Schema<T> {
  return {
    lire(x) {
      if (!test(x)) throw new ErreurSchema('', `${nom} attendu`);
      return x;
    },
  };
}

const texte = () => schema((x): x is string => typeof x === 'string', 'texte');
const nombre = () => schema((x): x is number => typeof x === 'number' && !Number.isNaN(x), 'nombre');
const booleen = () => schema((x): x is boolean => typeof x === 'boolean', 'booléen');

function tableau<T>(element: Schema<T>): Schema<T[]> {
  return {
    lire(x) {
      if (!Array.isArray(x)) throw new ErreurSchema('', 'tableau attendu');
      return x.map((e: unknown, i) => dans(i, () => element.lire(e)));
    },
  };
}

function objet<F extends Record<string, Schema<unknown>>>(forme: F): Schema<{ [K in keyof F]: Infer<F[K]> }> {
  return {
    lire(x) {
      if (typeof x !== 'object' || x === null) throw new ErreurSchema('', 'objet attendu');
      const source = x as Record<string, unknown>;
      const entrees = Object.entries(forme).map(([cle, s]) => [cle, dans(cle, () => s.lire(source[cle]))]);
      return Object.fromEntries(entrees) as { [K in keyof F]: Infer<F[K]> };
    },
  };
}

function optionnel<T>(s: Schema<T>): Schema<T | undefined> {
  return { lire: (x) => (x === undefined ? undefined : s.lire(x)) };
}

function litteral<const V extends readonly string[]>(...valeurs: V): Schema<V[number]> {
  return schema((x): x is V[number] => valeurs.some((v) => v === x), valeurs.join(' ou '));
}

function union<A, B>(a: Schema<A>, b: Schema<B>): Schema<A | B> {
  return {
    lire(x) {
      try {
        return a.lire(x);
      } catch {
        return b.lire(x);
      }
    },
  };
}

@@ code api | Un client d'API typé | ts
Les routes sont décrites **une fois** dans l'interface `Api`, et tout en découle : chemins proposés, paramètres exigés, réponses typées.
@starter
interface User { id: number; nom: string }
interface Post { id: number; titre: string; auteur: number }

interface Api {
  '/users': User[];
  '/users/:id': User;
  '/users/:id/posts/:post': Post;
}

@setup
const bdd = { '/users': [{ id: 1, nom: 'Ada' }, { id: 2, nom: 'Linus' }], '/users/1': { id: 1, nom: 'Ada' }, '/users/1/posts/9': { id: 9, titre: 'TS', auteur: 1 } };
globalThis.$appels = 0;
globalThis.fetch = async (url) => {
  globalThis.$appels++;
  await new Promise((r) => setTimeout(r, 2));
  return url in bdd ? { ok: true, status: 200, json: async () => bdd[url], text: async () => '' } : { ok: false, status: 404, json: async () => ({}), text: async () => '' };
};
@part Les paramètres d'une route
`type Params<R extends string>` : l'union des paramètres (`:nom`) d'une route, ou `never`.
@types `Params`
type _ = [$Expect<$Equal<Params<'/users'>, never>>, $Expect<$Equal<Params<'/users/:id'>, 'id'>>, $Expect<$Equal<Params<'/users/:id/posts/:post'>, 'id' | 'post'>>];
@part Construire l'adresse
`chemin(route, params)` remplace chaque paramètre par sa valeur (texte ou nombre), encodée avec `encodeURIComponent`.
@test Remplace
expect(chemin('/users/:id/posts/:post', { id: 1, post: 'a b' })).toBe('/users/1/posts/a%20b'); expect(chemin('/users', {})).toBe('/users');
@types Paramètres exigés
chemin('/users/:id', { id: 3 });
// @ts-expect-error
chemin('/users/:id', {});
// @ts-expect-error
chemin('/users/:id', { nom: 3 });
@part Appeler
`lire(route, params)` appelle l'API et renvoie une promesse du **bon type**. Les routes sans paramètre s'appellent sans deuxième argument. Une réponse non `ok` lance `new ErreurApi(statut)`, une classe d'erreur avec `statut`.
@test Appelle
expect(await lire('/users')).toHaveLength(2); expect(await lire('/users/:id', { id: 1 })).toEqual({ id: 1, nom: 'Ada' });
@test Erreur 404
try { await lire('/users/:id', { id: 50 }); expect('erreur').toBe('attendue'); } catch (e) { expect(e).toBeInstanceOf(ErreurApi); expect(e.statut).toBe(404); }
@types Réponses typées
const a: Promise<User[]> = lire('/users'); const b: Promise<Post> = lire('/users/:id/posts/:post', { id: 1, post: 2 });
// @ts-expect-error
const c: Promise<User> = lire('/users/:id/posts/:post', { id: 1, post: 2 });
@types Appels incorrects refusés
// @ts-expect-error
lire('/zut');
// @ts-expect-error
lire('/users/:id');
@part Un cache
`creerCache()` renvoie une fonction `lireAvecCache` de **même signature** que `lire`, qui ne refait pas un appel déjà fait (même adresse). Un échec n'est pas gardé.
@test Un seul appel
const l = creerCache(); $appels = 0; await l('/users/:id', { id: 1 }); await l('/users/:id', { id: 1 }); await l('/users'); expect($appels).toBe(2);
@test Un échec est réessayé
const l = creerCache(); $appels = 0; await l('/users/:id', { id: 50 }).catch(() => {}); await l('/users/:id', { id: 50 }).catch(() => {}); expect($appels).toBe(2);
@types Même signature
const l = creerCache(); const s: typeof lire = l; const p: Promise<User> = l('/users/:id', { id: 1 });
@hint
Arguments facultatifs selon la route : `...args: Args<R>` avec `type Args<R extends string> = [Params<R>] extends [never] ? [] : [params: Valeurs<R>]`.
@hint
Le cache : une `Map<string, Promise<unknown>>`, et une assertion sur la promesse renvoyée.
@solution
interface User { id: number; nom: string }
interface Post { id: number; titre: string; auteur: number }

interface Api {
  '/users': User[];
  '/users/:id': User;
  '/users/:id/posts/:post': Post;
}

type Params<R extends string> =
  R extends `${string}:${infer P}/${infer Reste}` ? P | Params<Reste>
  : R extends `${string}:${infer P}` ? P
  : never;

type Valeurs<R extends string> = Record<Params<R>, string | number>;

function chemin<R extends string>(route: R, params: Valeurs<R>): string {
  const valeurs: Record<string, string | number> = params;
  return route.replace(/:(\w+)/g, (_, nom: string) => encodeURIComponent(valeurs[nom]));
}

class ErreurApi extends Error {
  constructor(readonly statut: number) {
    super(`Erreur ${statut}`);
    this.name = 'ErreurApi';
  }
}

type Args<R extends string> = [Params<R>] extends [never] ? [] : [params: Valeurs<R>];

const adresse = (route: string, params: object = {}): string =>
  chemin(route, params as Record<string, string | number>);

async function lire<R extends keyof Api>(route: R, ...args: Args<R>): Promise<Api[R]> {
  const reponse = await fetch(adresse(route, args[0]));
  if (!reponse.ok) throw new ErreurApi(reponse.status);
  return reponse.json();
}

function creerCache(): typeof lire {
  const cache = new Map<string, Promise<unknown>>();
  return <R extends keyof Api>(route: R, ...args: Args<R>) => {
    const cle = adresse(route, args[0]);
    let promesse = cache.get(cle) as Promise<Api[R]> | undefined;
    if (!promesse) {
      promesse = lire(route, ...args);
      cache.set(cle, promesse);
      promesse.catch(() => cache.delete(cle));
    }
    return promesse;
  };
}
