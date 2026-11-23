# Mini-projets : TypeScript expert
> Un ORM typé, une API de bout en bout, un moteur réactif.

@@ code orm | Un mini-ORM | ts
Une base en mémoire dont **tous** les types viennent du schéma.
@starter

@part Le schéma
`texte()`, `nombre()`, `booleen()` créent des colonnes, avec `.facultatif()` (accepte `null`) et `.defaut(valeur)`. `table(colonnes)` les regroupe. `type Ligne<T>` donne le type d'une ligne, avec en plus `id: number`.
@test Les colonnes existent
const t = table({ nom: texte(), age: nombre().facultatif(), actif: booleen().defaut(true) }); expect(Object.keys(t.colonnes)).toEqual(['nom', 'age', 'actif']);
@types `Ligne`
const t = table({ nom: texte(), age: nombre().facultatif(), actif: booleen().defaut(true) });
type L = Ligne<typeof t>; const l: L = { id: 1, nom: 'a', age: null, actif: true };
type _ = [$Expect<$Equal<L['nom'], string>>, $Expect<$Equal<L['age'], number | null>>, $Expect<$Equal<L['actif'], boolean>>, $Expect<$Equal<L['id'], number>>];
@types Valeur par défaut vérifiée
// @ts-expect-error
nombre().defaut('x');
@part Insérer
`type Nouvelle<T>` : sans `id`, et les colonnes facultatives ou avec défaut peuvent manquer. `creerBase({ users: table(…) })` renvoie un objet avec, par table, `.inserer(nouvelle)`, qui renvoie la ligne complète (id à partir de 1, défauts appliqués, `null` pour les facultatives), et `.tout()` (une copie).
@test Insère
const db = creerBase({ users: table({ nom: texte(), age: nombre().facultatif(), actif: booleen().defaut(true) }) }); expect(db.users.inserer({ nom: 'Ada' })).toEqual({ id: 1, nom: 'Ada', age: null, actif: true }); expect(db.users.inserer({ nom: 'L', age: 3, actif: false })).toEqual({ id: 2, nom: 'L', age: 3, actif: false }); expect(db.users.tout()).toHaveLength(2);
@test Tables indépendantes, et copies
const db = creerBase({ a: table({ x: nombre() }), b: table({ x: nombre() }) }); db.a.inserer({ x: 1 }); db.a.tout()[0].x = 99; expect([db.a.tout()[0].x, db.b.tout(), db.b.inserer({ x: 5 }).id]).toEqual([1, [], 1]);
@types Insertion vérifiée
const db = creerBase({ users: table({ nom: texte(), age: nombre().facultatif() }) }); db.users.inserer({ nom: 'a' }); const n: string = db.users.inserer({ nom: 'a', age: null }).nom;
// @ts-expect-error
db.users.inserer({});
// @ts-expect-error
db.users.inserer({ nom: 3 });
// @ts-expect-error
db.users.inserer({ nom: 'a', zut: 1 });
// @ts-expect-error
db.zut;
@part Chercher
`.ou(filtre)` renvoie une requête avec `.ou(…)` (cumulable), `.trier(colonne, 'asc' | 'desc')`, `.limite(n)`, `.liste()` et `.premier()` (`undefined` si rien). Un filtre est un objet : une valeur (égalité) ou `{ gt }`, `{ lt }`, `{ dans: [...] }`. `.choisir(...colonnes)` ne garde que certaines colonnes (types compris).
@test Filtres
const db = creerBase({ u: table({ nom: texte(), age: nombre() }) }); for (const [nom, age] of [['a', 10], ['b', 30], ['c', 20]]) db.u.inserer({ nom, age }); const noms = (q) => q.liste().map((x) => x.nom).join(''); expect([noms(db.u.ou({ nom: 'b' })), noms(db.u.ou({ age: { gt: 10 } })), noms(db.u.ou({ age: { gt: 5, lt: 25 } })), noms(db.u.ou({ nom: { dans: ['a', 'c'] } }).ou({ age: 20 })), noms(db.u.ou({}))]).toEqual(['b', 'bc', 'ac', 'c', 'abc']);
@test Trier, limiter, premier
const db = creerBase({ u: table({ nom: texte(), age: nombre() }) }); for (const [nom, age] of [['a', 10], ['b', 30], ['c', 20]]) db.u.inserer({ nom, age }); expect([db.u.ou({}).trier('age', 'desc').limite(2).liste().map((x) => x.nom), db.u.ou({}).trier('nom', 'asc').premier().nom, db.u.ou({ nom: 'z' }).premier()]).toEqual([['b', 'c'], 'a', undefined]);
@test Choisir
const db = creerBase({ u: table({ nom: texte(), age: nombre() }) }); db.u.inserer({ nom: 'a', age: 1 }); expect(db.u.ou({}).choisir('nom').liste()).toEqual([{ nom: 'a' }]);
@types Requêtes vérifiées
const db = creerBase({ u: table({ nom: texte(), age: nombre() }) }); const q = db.u.ou({ age: { gt: 3 } }).trier('nom', 'asc').choisir('nom', 'id').liste(); type _ = $Expect<$Equal<typeof q, { nom: string; id: number }[]>>;
// @ts-expect-error
db.u.ou({ zut: 1 });
// @ts-expect-error
db.u.ou({ nom: 3 });
// @ts-expect-error
db.u.ou({}).trier('zut', 'asc');
@part Modifier
`.modifier(id, changements)` et `.supprimer(id)` renvoient un booléen (l'id existait-il ?). L'`id` ne se modifie pas.
@test Modifier et supprimer
const db = creerBase({ u: table({ nom: texte() }) }); db.u.inserer({ nom: 'a' }); expect([db.u.modifier(1, { nom: 'z' }), db.u.modifier(9, { nom: 'z' }), db.u.tout()[0].nom, db.u.supprimer(1), db.u.supprimer(1), db.u.inserer({ nom: 'b' }).id]).toEqual([true, false, 'z', true, false, 2]);
@types Changements vérifiés
const db = creerBase({ u: table({ nom: texte() }) }); db.u.modifier(1, {});
// @ts-expect-error
db.u.modifier(1, { id: 3 });
// @ts-expect-error
db.u.modifier(1, { nom: 3 });
@hint
Une colonne : `class Colonne<T, F extends boolean>` où `F` dit si elle peut manquer à l'insertion. `Nouvelle` sépare les clés en deux avec `as`.
@hint
Dans le code de la base, travaille avec `Record<string, unknown>` et fais **une** assertion à la sortie.
@solution
class Colonne<T, Absente extends boolean = false> {
  // Sans valeur à l'exécution : garde le type
  declare readonly type: T;
  declare readonly absente: Absente;

  constructor(readonly valeurDefaut?: unknown) {}

  facultatif(): Colonne<T | null, true> {
    return new Colonne<T | null, true>(null);
  }

  defaut(valeur: T): Colonne<T, true> {
    return new Colonne<T, true>(valeur);
  }
}

const texte = () => new Colonne<string>();
const nombre = () => new Colonne<number>();
const booleen = () => new Colonne<boolean>();

type Colonnes = Record<string, Colonne<any, boolean>>;

interface Table<C extends Colonnes> {
  colonnes: C;
}

const table = <C extends Colonnes>(colonnes: C): Table<C> => ({ colonnes });

type Plat<T> = { [K in keyof T]: T[K] };
type ColonnesDe<T> = T extends Table<infer C> ? C : never;
type Champs<C extends Colonnes> = { [K in keyof C]: C[K]['type'] };
type Ligne<T> = Plat<{ id: number } & Champs<ColonnesDe<T>>>;
type Nouvelle<T, C extends Colonnes = ColonnesDe<T>> = Plat<
  & { [K in keyof C as C[K]['absente'] extends true ? never : K]: C[K]['type'] }
  & { [K in keyof C as C[K]['absente'] extends true ? K : never]?: C[K]['type'] }
>;

type Condition<V> = V | { gt?: V; lt?: V; dans?: V[] };
type Filtre<L> = { [K in keyof L]?: Condition<L[K]> };

interface Requete<L, R = L> {
  ou(filtre: Filtre<L>): Requete<L, R>;
  trier(colonne: keyof L, sens: 'asc' | 'desc'): Requete<L, R>;
  limite(n: number): Requete<L, R>;
  choisir<K extends keyof L>(...colonnes: K[]): Requete<L, Pick<L, K>>;
  liste(): R[];
  premier(): R | undefined;
}

type Brute = Record<string, unknown>;

function correspond(valeur: unknown, condition: unknown): boolean {
  if (typeof condition !== 'object' || condition === null) return valeur === condition;
  const { gt, lt, dans } = condition as { gt?: number; lt?: number; dans?: unknown[] };
  const n = valeur as number;
  return (gt === undefined || n > gt) && (lt === undefined || n < lt) && (dans === undefined || dans.includes(valeur));
}

function requete(lignes: () => Brute[]): Requete<Brute, any> {
  const suite = (f: (l: Brute[]) => Brute[]) => requete(() => f(lignes()));
  return {
    ou: (filtre) => suite((l) => l.filter((x) => Object.entries(filtre).every(([k, c]) => correspond(x[k], c)))),
    trier: (colonne, sens) => suite((l) => l.toSorted((x, y) => {
      const [a, b] = [x[colonne], y[colonne]] as [number, number];
      const ordre = a < b ? -1 : a > b ? 1 : 0;
      return sens === 'asc' ? ordre : -ordre;
    })),
    limite: (n) => suite((l) => l.slice(0, n)),
    choisir: (...colonnes) => suite((l) => l.map((x) => Object.fromEntries(colonnes.map((c) => [c, x[c]])))),
    liste: lignes,
    premier: () => lignes()[0],
  };
}

interface Depot<T> {
  inserer(nouvelle: Nouvelle<T>): Ligne<T>;
  tout(): Ligne<T>[];
  ou(filtre: Filtre<Ligne<T>>): Requete<Ligne<T>>;
  modifier(id: number, changements: Partial<Omit<Ligne<T>, 'id'>>): boolean;
  supprimer(id: number): boolean;
}

function depot({ colonnes }: Table<Colonnes>) {
  const lignes = new Map<number, Brute>();
  let dernier = 0;
  const copies = () => [...lignes.values()].map((l) => ({ ...l }));
  return {
    inserer(nouvelle: Brute) {
      const id = ++dernier;
      const ligne: Brute = { id };
      for (const [nom, colonne] of Object.entries(colonnes)) ligne[nom] = nouvelle[nom] ?? colonne.valeurDefaut;
      lignes.set(id, ligne);
      return { ...ligne };
    },
    tout: copies,
    ou: (filtre: Brute) => requete(copies).ou(filtre),
    modifier(id: number, changements: Brute) {
      const ligne = lignes.get(id);
      if (ligne) lignes.set(id, { ...ligne, ...changements });
      return ligne !== undefined;
    },
    supprimer: (id: number) => lignes.delete(id),
  };
}

function creerBase<S extends Record<string, Table<any>>>(schema: S): { [K in keyof S]: Depot<S[K]> } {
  const depots = Object.entries(schema).map(([nom, t]) => [nom, depot(t)]);
  return Object.fromEntries(depots) as { [K in keyof S]: Depot<S[K]> };
}

@@ code rpc | Une API de bout en bout | ts
L'idée de tRPC : le **serveur** déclare des procédures, et le **client** en tire ses types, sans rien générer.
@starter
type Lecteur<T> = (x: unknown) => T;

@part Déclarer
`procedure` a deux méthodes : `.entree(lecteur)` (vérifie et type l'entrée) et `.requete(f)`, qui termine : `f({ entree })` peut être asynchrone. Sans `entree`, `entree` est `undefined`. `routeur({ … })` regroupe des procédures ou d'autres routeurs.

Fournis aussi `texte` et `nombre`, des lecteurs qui lancent une `TypeError` si la valeur ne convient pas.
@test Lecteurs
expect([texte('a'), nombre(3)]).toEqual(['a', 3]); expect(() => texte(3)).toThrow(TypeError); expect(() => nombre('3')).toThrow(TypeError);
@test Un routeur
const r = routeur({ salut: procedure.entree(texte).requete(({ entree }) => `Salut ${entree}`) }); expect(typeof r).toBe('object');
@types Entrée typée
routeur({ a: procedure.entree(nombre).requete(({ entree }) => entree.toFixed(1)) });
// @ts-expect-error
routeur({ a: procedure.entree(nombre).requete(({ entree }) => entree.toUpperCase()) });
@part Exécuter
`executer(routeur, chemin, entree)` (asynchrone) trouve la procédure (`'users.lire'`), vérifie l'entrée, l'appelle. Chemin inconnu : `Error` contenant le chemin.
@test Exécute
const r = routeur({ users: routeur({ lire: procedure.entree(nombre).requete(async ({ entree }) => ({ id: entree })) }), ping: procedure.requete(() => 'pong') }); expect([await executer(r, 'users.lire', 5), await executer(r, 'ping', undefined)]).toEqual([{ id: 5 }, 'pong']);
@test Entrée refusée
const r = routeur({ a: procedure.entree(nombre).requete(() => 1) }); await expect(executer(r, 'a', 'x')).toReject(TypeError);
@test Chemin inconnu
const r = routeur({ a: routeur({ b: procedure.requete(() => 1) }) }); for (const c of ['zut', 'a', 'a.b.c', 'toString']) await expect(executer(r, c, 1)).toReject(c);
@part Le client
`creerClient<typeof monRouteur>(transport)` : `transport(chemin, entree)` renvoie une promesse. Le client imite la forme du routeur : `client.users.lire(5)`. Utilise un `Proxy`. Les types viennent **seulement** de `typeof`.
@test Appelle le transport
const l = []; const c = creerClient(async (chemin, entree) => { l.push([chemin, entree]); return 'r'; }); expect(await c.users.lire(5)).toBe('r'); await c.ping(); expect(l).toEqual([['users.lire', 5], ['ping', undefined]]);
@test De bout en bout
const r = routeur({ maths: routeur({ double: procedure.entree(nombre).requete(({ entree }) => entree * 2) }) }); const c = creerClient((chemin, entree) => executer(r, chemin, JSON.parse(JSON.stringify(entree)))); expect(await c.maths.double(21)).toBe(42);
@types Client typé
const r = routeur({ users: routeur({ lire: procedure.entree(nombre).requete(async ({ entree }) => ({ id: entree })) }), ping: procedure.requete(() => 'pong') });
const c = creerClient<typeof r>(async () => null); const u: Promise<{ id: number }> = c.users.lire(5); const p: Promise<string> = c.ping();
// @ts-expect-error
c.users.lire('x');
// @ts-expect-error
c.users.lire();
// @ts-expect-error
c.zut();
@part Les middlewares
`procedure.avec(m)` ajoute un middleware `(ctx) => ajouts` (éventuellement asynchrone) : ses ajouts sont **fusionnés** au contexte reçu par `f({ entree, ctx })` et par les middlewares suivants. `executer` prend un 4e paramètre facultatif, le contexte de départ (`{}` par défaut). Un middleware qui lance une erreur empêche l'appel. `procedure` n'est jamais modifiée.
@test Contexte
const priv = procedure.avec((ctx) => { if (!ctx.user) throw new Error('interdit'); return { user: ctx.user }; }).avec(async (ctx) => ({ nom: ctx.user + '!' })); const r = routeur({ moi: priv.requete(({ ctx }) => ctx.nom), ping: procedure.requete(() => 1) }); expect([await executer(r, 'moi', undefined, { user: 'ada' }), await executer(r, 'ping', undefined)]).toEqual(['ada!', 1]); await expect(executer(r, 'moi', undefined)).toReject('interdit');
@test Avec une entrée
const r = routeur({ a: procedure.avec(() => ({ x: 10 })).entree(nombre).requete(({ entree, ctx }) => entree + ctx.x) }); expect(await executer(r, 'a', 5)).toBe(15);
@types Contexte typé
routeur({ a: procedure.avec(() => ({ x: 1 })).avec((ctx) => ({ y: ctx.x.toFixed(1) })).requete(({ ctx }) => ctx.y.length + ctx.x) });
// @ts-expect-error
routeur({ a: procedure.avec(() => ({ x: 1 })).requete(({ ctx }) => ctx.x.toUpperCase()) });
@hint
Le contexte de départ n'est pas typé : un middleware sans précédent reçoit un `Record<string, any>`. Après un `avec`, le contexte est `C & Ajouts`.
@hint
Le type du client : `P extends Procedure<infer E, infer S> ? (...args: [E] extends [undefined] ? [] : [E]) => Promise<S> : { [K in keyof P]: Client<P[K]> }`.
@solution
type Lecteur<T> = (x: unknown) => T;

const texte: Lecteur<string> = (x) => {
  if (typeof x !== 'string') throw new TypeError('Texte attendu');
  return x;
};

const nombre: Lecteur<number> = (x) => {
  if (typeof x !== 'number') throw new TypeError('Nombre attendu');
  return x;
};

type Contexte = Record<string, any>;

class Procedure<E, S> {
  declare readonly sortie: S;
  declare readonly recue: E;

  constructor(readonly appeler: (entree: unknown, ctx: Contexte) => Promise<unknown>) {}
}

type Middleware = (ctx: any) => object | Promise<object>;

class Constructeur<E, C extends object> {
  constructor(
    private readonly lecteur: Lecteur<E>,
    private readonly middlewares: Middleware[],
  ) {}

  entree<T>(lecteur: Lecteur<T>): Constructeur<T, C> {
    return new Constructeur<T, C>(lecteur, this.middlewares);
  }

  avec<A extends object>(m: (ctx: C) => A | Promise<A>): Constructeur<E, C & A> {
    return new Constructeur<E, C & A>(this.lecteur, [...this.middlewares, m]);
  }

  requete<S>(f: (appel: { entree: E; ctx: C }) => S): Procedure<E, Awaited<S>> {
    return new Procedure(async (brut, depart) => {
      let ctx = depart;
      for (const m of this.middlewares) ctx = { ...ctx, ...(await m(ctx)) };
      return f({ entree: this.lecteur(brut), ctx: ctx as C });
    });
  }
}

const procedure = new Constructeur<undefined, Contexte>(() => undefined, []);

interface Routes {
  [nom: string]: Procedure<any, any> | Routes;
}

const routeur = <R extends Routes>(routes: R): R => routes;

async function executer(routes: Routes, chemin: string, entree: unknown, ctx: Contexte = {}): Promise<unknown> {
  let courant: Procedure<unknown, unknown> | Routes | undefined = routes;
  for (const nom of chemin.split('.')) {
    courant = courant && !(courant instanceof Procedure) && Object.hasOwn(courant, nom) ? courant[nom] : undefined;
  }
  if (!(courant instanceof Procedure)) throw new Error(`Procédure inconnue : ${chemin}`);
  return courant.appeler(entree, ctx);
}

type Client<P> =
  P extends Procedure<infer E, infer S>
    ? (...args: [E] extends [undefined] ? [] : [entree: E]) => Promise<S>
    : { [K in keyof P]: Client<P[K]> };

type Transport = (chemin: string, entree: unknown) => Promise<unknown>;

function creerClient<R>(transport: Transport): Client<R> {
  const suivre = (chemin: string[]): unknown => new Proxy(() => {}, {
    get: (_, nom) => suivre([...chemin, String(nom)]),
    apply: (_, __, [entree]: unknown[]) => transport(chemin.join('.'), entree),
  });
  return suivre([]) as Client<R>;
}

@@ code signaux | Un moteur réactif | ts
Les **signaux** (Solid, Vue, Angular, Preact) : des valeurs qui savent qui dépend d'elles.
@starter

@part Signal et effet
`signal(valeur)` renvoie `{ lire(), ecrire(x | (ancien) => x) }`. `effet(f)` exécute `f` tout de suite, puis à chaque changement d'un signal **lu** pendant sa dernière exécution. Écrire une valeur identique (`Object.is`) ne fait rien.
@test Réagit
const n = signal(1); const l = []; effet(() => { l.push(n.lire()); }); n.ecrire(2); n.ecrire((x) => x * 10); expect(l).toEqual([1, 2, 20]);
@test Valeur identique
const n = signal(1); let fois = 0; effet(() => { n.lire(); fois++; }); n.ecrire(1); expect(fois).toBe(1);
@test Dépendances dynamiques
const oui = signal(true); const a = signal('a'); const b = signal('b'); const l = []; effet(() => { l.push(oui.lire() ? a.lire() : b.lire()); }); b.ecrire('b2'); oui.ecrire(false); a.ecrire('a2'); b.ecrire('b3'); expect(l).toEqual(['a', 'b2', 'b3']);
@types Types
const n = signal(1); const x: number = n.lire(); n.ecrire((a) => a + 1);
// @ts-expect-error
n.ecrire('x');
@part Arrêter
`effet` renvoie une fonction d'arrêt. Si `f` renvoie une fonction, c'est un **nettoyage**, appelé avant chaque réexécution et à l'arrêt.
@test Arrêt
const n = signal(1); let fois = 0; const stop = effet(() => { n.lire(); fois++; }); stop(); n.ecrire(2); expect(fois).toBe(1);
@test Nettoyage
const n = signal(1); const l = []; const stop = effet(() => { const v = n.lire(); return () => l.push(`fin ${v}`); }); n.ecrire(2); stop(); stop(); expect(l).toEqual(['fin 1', 'fin 2']);
@part Valeurs calculées
`calcul(f)` renvoie `{ lire() }` : **paresseux** (rien tant qu'on ne lit pas) et **mémorisé** (recalculé seulement si une dépendance a changé). Utilisable dans un effet ou un autre calcul. Un effet ne se relance pas si la valeur calculée n'a **pas changé**.
@test Paresseux et mémorisé
const n = signal(2); let fois = 0; const c = calcul(() => { fois++; return n.lire() * 10; }); expect(fois).toBe(0); expect([c.lire(), c.lire(), fois]).toEqual([20, 20, 1]); n.ecrire(3); expect([fois, c.lire(), fois]).toEqual([1, 30, 2]);
@test Dans un effet, et en chaîne
const n = signal(1); const a = calcul(() => n.lire() + 1); const b = calcul(() => a.lire() * 2); const l = []; effet(() => { l.push(b.lire()); }); n.ecrire(4); expect(l).toEqual([4, 10]);
@test Pas de réexécution inutile
const n = signal(1); const pair = calcul(() => n.lire() % 2 === 0); let fois = 0; effet(() => { pair.lire(); fois++; }); n.ecrire(3); n.ecrire(5); expect(fois).toBe(1); n.ecrire(6); expect(fois).toBe(2);
@test Le losange : une seule exécution
const n = signal(1); const a = calcul(() => n.lire() + 1); const b = calcul(() => n.lire() * 10); const l = []; effet(() => { l.push(a.lire() + b.lire()); }); n.ecrire(2); expect(l).toEqual([12, 23]);
@part Regrouper
`lot(f)` : les effets ne s'exécutent qu'**à la fin** de `f`, une fois chacun. Les lots s'imbriquent. `sansSuivre(f)` lit des signaux sans s'y abonner.
@test Lot
const a = signal(1); const b = signal(2); const l = []; effet(() => { l.push(a.lire() + b.lire()); }); lot(() => { a.ecrire(10); lot(() => b.ecrire(20)); expect(l).toEqual([3]); }); expect(l).toEqual([3, 30]);
@test Lot qui échoue
const a = signal(1); const l = []; effet(() => { l.push(a.lire()); }); try { lot(() => { a.ecrire(2); throw new Error('x'); }); } catch {} a.ecrire(3); expect(l).toEqual([1, 2, 3]);
@test `sansSuivre`
const a = signal(1); const b = signal(1); let fois = 0; effet(() => { a.lire(); sansSuivre(() => b.lire()); fois++; }); b.ecrire(2); expect(fois).toBe(1);
@hint
Une variable globale `actif` (celui qui s'exécute). Lire un signal relie les deux : le signal retient l'observateur, l'observateur retient ses sources (pour se désabonner avant de se réexécuter).
@hint
Pour les calculs : écrire un signal marque les calculs **« peut-être périmés »** et met les effets en file. Avant d'exécuter un effet, vérifie si une de ses sources a **vraiment** changé, avec un numéro de version par source.
@solution
interface Source {
  version: number;
  observateurs: Set<Observateur>;
  // Met à jour une valeur calculée, si besoin
  rafraichir(): void;
}

interface Observateur {
  sources: Map<Source, number>;
  prevenir(): void;
}

let actif: Observateur | null = null;
let profondeur = 0;
const enAttente = new Set<() => void>();

function suivre(source: Source): void {
  if (!actif) return;
  source.observateurs.add(actif);
  actif.sources.set(source, source.version);
}

function detacher(o: Observateur): void {
  for (const source of o.sources.keys()) source.observateurs.delete(o);
  o.sources.clear();
}

// Exécute f en notant ce qu'elle lit pour o
function observer<T>(o: Observateur | null, f: () => T): T {
  const avant = actif;
  actif = o;
  try {
    return f();
  } finally {
    actif = avant;
  }
}

function aChange(o: Observateur): boolean {
  for (const [source, version] of o.sources) {
    source.rafraichir();
    if (source.version !== version) return true;
  }
  return false;
}

function lot<T>(f: () => T): T {
  profondeur++;
  try {
    return f();
  } finally {
    if (profondeur === 1) {
      for (const executer of enAttente) {
        enAttente.delete(executer);
        executer();
      }
    }
    profondeur--;
  }
}

const sansSuivre = <T>(f: () => T): T => observer(null, f);

function signal<T>(initiale: T) {
  let valeur = initiale;
  const source: Source = { version: 0, observateurs: new Set(), rafraichir() {} };
  return {
    lire(): T {
      suivre(source);
      return valeur;
    },
    ecrire(x: T | ((ancien: T) => T)): void {
      const nouvelle = x instanceof Function ? x(valeur) : x;
      if (Object.is(nouvelle, valeur)) return;
      valeur = nouvelle;
      source.version++;
      lot(() => {
        for (const o of [...source.observateurs]) o.prevenir();
      });
    },
  };
}

function calcul<T>(f: () => T) {
  let valeur: T;
  let etat: 'jamais' | 'a-verifier' | 'a-jour' = 'jamais';
  const source: Source = {
    version: 0,
    observateurs: new Set(),
    rafraichir() {
      if (etat === 'a-jour') return;
      if (etat === 'a-verifier' && !aChange(observateur)) {
        etat = 'a-jour';
        return;
      }
      detacher(observateur);
      const nouvelle = observer(observateur, f);
      if (etat === 'jamais' || !Object.is(nouvelle, valeur)) {
        valeur = nouvelle;
        source.version++;
      }
      etat = 'a-jour';
    },
  };
  const observateur: Observateur = {
    sources: new Map(),
    prevenir() {
      if (etat !== 'a-jour') return;
      etat = 'a-verifier';
      for (const o of [...source.observateurs]) o.prevenir();
    },
  };
  return {
    lire(): T {
      source.rafraichir();
      suivre(source);
      return valeur;
    },
  };
}

function effet(f: () => void | (() => void)): () => void {
  let nettoyage: void | (() => void);
  let arrete = false;
  const nettoyer = () => {
    const n = nettoyage;
    nettoyage = undefined;
    if (n) sansSuivre(n);
  };
  const executer = () => {
    nettoyer();
    detacher(observateur);
    nettoyage = observer(observateur, f);
  };
  const verifier = () => {
    if (!arrete && aChange(observateur)) executer();
  };
  const observateur: Observateur = {
    sources: new Map(),
    prevenir: () => void enAttente.add(verifier),
  };
  executer();
  return () => {
    if (arrete) return;
    arrete = true;
    detacher(observateur);
    nettoyer();
  };
}
