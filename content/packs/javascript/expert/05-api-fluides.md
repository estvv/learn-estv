# API fluides et états dans les types
> Des builders qui retiennent ce qui a été fait.

@@ lesson builder | Accumuler des types

Un **builder** renvoie à chaque étape un objet du type **enrichi** :

```ts-run
class Constructeur<T extends object = {}> {
  constructor(private readonly valeurs: T) {}
  avec<K extends string, V>(cle: K, valeur: V): Constructeur<T & Record<K, V>> {
    return new Constructeur({ ...this.valeurs, [cle]: valeur } as T & Record<K, V>);
  }
  fini(): T { return this.valeurs; }
}
const c = new Constructeur({}).avec('nom', 'Ada').avec('age', 36).fini();
console.log(c.nom.toUpperCase(), c.age + 1);
```

### Interdire ce qui n'a pas de sens

Un type **fantôme** (*phantom*) garde un état qui n'existe pas à l'exécution :

```ts
class Requete<Etat extends 'vide' | 'prete' = 'vide'> {
  declare private readonly etat: Etat;
  url(u: string): Requete<'prete'> { … }
  // Le paramètre this n'est satisfait que si l'état est 'prete'
  envoyer(this: Requete<'prete'>): Promise<Response> { … }
}
new Requete().envoyer();            // refusé
new Requete().url('/x').envoyer();  // accepté
```

### Inférer depuis une configuration

Le plus agréable pour l'utilisateur : il écrit un objet, TypeScript déduit tout.

```ts-run
function definir<const T extends Record<string, readonly string[]>>(config: T) {
  return {
    estValable<K extends keyof T>(cle: K, valeur: string): valeur is T[K][number] {
      return config[cle].includes(valeur);
    },
  };
}
const d = definir({ couleur: ['rouge', 'vert'], taille: ['S', 'M'] });
console.log(d.estValable('couleur', 'vert'), d.estValable('taille', 'XL'));
```

`const T` évite à l'utilisateur d'écrire `as const`.

### Inférence en plusieurs temps

Une fonction ne peut pas recevoir **certains** types et déduire les autres. Solution : deux appels, `creer<Etat>()(…)`, ou un builder.

### Des erreurs lisibles

Remplace un `never` par un message : `T extends string ? T : 'Attendu : un texte'`. Le message apparaît dans l'erreur.

@@ code builder-requete | Un builder de requête | ts
`requete()` renvoie un builder avec `.table(nom)`, `.champs(...cles)`, `.ou(condition)` et `.sql()`.

- `sql()` donne `SELECT a, b FROM t WHERE c1 AND c2` (`*` sans champs, pas de WHERE sans condition)
- le builder est **immuable** : chaque méthode renvoie un nouveau builder
- `sql()` et `champs()` sont **refusés par TypeScript** tant que `table` n'a pas été appelé
- `table` n'accepte que les tables de `BD`, `champs` que leurs colonnes
@starter
interface BD {
  users: { id: number; nom: string };
  posts: { id: number; titre: string };
}

@test SQL
expect(requete().table('users').sql()).toBe('SELECT * FROM users'); expect(requete().table('users').champs('id', 'nom').ou('id > 1').ou('nom = 2').sql()).toBe('SELECT id, nom FROM users WHERE id > 1 AND nom = 2');
@test Immuable
const a = requete().table('users'); a.ou('x'); a.champs('id'); expect(a.sql()).toBe('SELECT * FROM users');
@test Condition avant la table
expect(requete().ou('x').table('posts').sql()).toBe('SELECT * FROM posts WHERE x');
@types Ordre vérifié
requete().table('users').champs('nom').sql();
// @ts-expect-error
requete().sql();
// @ts-expect-error
requete().champs('id');
@types Noms vérifiés
// @ts-expect-error
requete().table('zut');
// @ts-expect-error
requete().table('users').champs('titre');
@hint
Une classe `Requete<T extends keyof BD = never>`, et `sql(this: [T] extends [never] ? never : this)`… ou plus simple : deux interfaces, « sans table » et « avec table ».
@solution
interface BD {
  users: { id: number; nom: string };
  posts: { id: number; titre: string };
}

interface SansTable {
  table<T extends keyof BD>(nom: T): AvecTable<T>;
  ou(condition: string): SansTable;
}

interface AvecTable<T extends keyof BD> {
  champs(...cles: (keyof BD[T] & string)[]): AvecTable<T>;
  ou(condition: string): AvecTable<T>;
  sql(): string;
}

function avecTable<T extends keyof BD>(table: T, champs: string[], conditions: string[]): AvecTable<T> {
  return {
    champs: (...cles) => avecTable(table, cles, conditions),
    ou: (condition) => avecTable(table, champs, [...conditions, condition]),
    sql() {
      const ou = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
      return `SELECT ${champs.join(', ') || '*'} FROM ${table}${ou}`;
    },
  };
}

function requete(conditions: string[] = []): SansTable {
  return {
    table: (nom) => avecTable(nom, [], conditions),
    ou: (condition) => requete([...conditions, condition]),
  };
}

@@ code formulaire-type | Un formulaire déduit | ts
`formulaire(config)` : chaque champ est `{ type: 'texte' | 'nombre' | 'choix', obligatoire?: true, choix?: [...] }`. Renvoie `{ lire(brut: Record<string, string>) }`, qui donne un objet **typé d'après la config** :

- `texte` → `string`, `nombre` → `number`, `choix` → l'union de ses choix
- un champ non obligatoire absent ou vide donne `undefined` (et `| undefined` dans le type)
- `lire` lance une `Error` contenant le nom du champ si une valeur est absente (obligatoire), n'est pas un nombre, ou n'est pas dans les choix
@starter

@test Lit et convertit
const f = formulaire({ nom: { type: 'texte', obligatoire: true }, age: { type: 'nombre' }, role: { type: 'choix', choix: ['a', 'b'], obligatoire: true } }); expect(f.lire({ nom: 'Ada', age: '36', role: 'b', zut: 'x' })).toEqual({ nom: 'Ada', age: 36, role: 'b' }); expect(f.lire({ nom: 'Ada', age: '', role: 'a' }).age).toBe(undefined);
@test Erreurs
const f = formulaire({ nom: { type: 'texte', obligatoire: true }, age: { type: 'nombre' }, role: { type: 'choix', choix: ['a'] } }); expect(() => f.lire({})).toThrow('nom'); expect(() => f.lire({ nom: 'x', age: 'abc' })).toThrow('age'); expect(() => f.lire({ nom: 'x', role: 'z' })).toThrow('role');
@types Type déduit
const f = formulaire({ nom: { type: 'texte', obligatoire: true }, age: { type: 'nombre' }, role: { type: 'choix', choix: ['a', 'b'], obligatoire: true } });
const v = f.lire({}); const nom: string = v.nom; const age: number | undefined = v.age; const role: 'a' | 'b' = v.role;
// @ts-expect-error
const n: number = v.age;
// @ts-expect-error
v.zut;
@types Config vérifiée
// @ts-expect-error
formulaire({ a: { type: 'zut' } });
// @ts-expect-error
formulaire({ a: { type: 'choix' } });
@solution
type Champ = { obligatoire?: true } & (
  | { type: 'texte' }
  | { type: 'nombre' }
  | { type: 'choix'; choix: readonly string[] }
);

type Brut<C> =
  C extends { type: 'nombre' } ? number
  : C extends { type: 'choix'; choix: readonly (infer V)[] } ? V
  : string;

type Valeurs<F> = {
  -readonly [K in keyof F]: F[K] extends { obligatoire: true } ? Brut<F[K]> : Brut<F[K]> | undefined;
};

function lireChamp(nom: string, champ: Champ, texte: string): unknown {
  if (texte === '') {
    if (champ.obligatoire) throw new Error(`${nom} est obligatoire`);
    return undefined;
  }
  if (champ.type === 'nombre') {
    const n = Number(texte);
    if (Number.isNaN(n)) throw new Error(`${nom} doit être un nombre`);
    return n;
  }
  if (champ.type === 'choix' && !champ.choix.includes(texte)) throw new Error(`${nom} : choix inconnu`);
  return texte;
}

function formulaire<const F extends Record<string, Champ>>(config: F) {
  return {
    lire(brut: Record<string, string>): Valeurs<F> {
      const entrees = Object.entries<Champ>(config).map(([nom, champ]) => [nom, lireChamp(nom, champ, brut[nom] ?? '')]);
      return Object.fromEntries(entrees) as Valeurs<F>;
    },
  };
}

@@ code fichier-etat | Des états impossibles à mélanger | ts
Classe `Connexion` avec un état dans le type : `'fermee'` au départ, `'ouverte'` après `ouvrir()`, `'fermee'` après `fermer()`. Chaque méthode renvoie la connexion au **nouveau type**.

- `ouvrir()` : seulement si fermée
- `envoyer(message)` et `fermer()` : seulement si ouverte ; `envoyer` renvoie la connexion
- `journal` : la liste des messages envoyés

TypeScript doit refuser les appels interdits.
@starter
class Connexion {
}
@test Le parcours
const c = new Connexion().ouvrir().envoyer('a').envoyer('b').fermer(); expect(c.journal).toEqual(['a', 'b']);
@types Appels permis
new Connexion().ouvrir().envoyer('x').fermer().ouvrir();
@types Appels interdits
// @ts-expect-error
new Connexion().envoyer('x');
// @ts-expect-error
new Connexion().ouvrir().ouvrir();
// @ts-expect-error
new Connexion().fermer();
// @ts-expect-error
new Connexion().ouvrir().fermer().envoyer('x');
@hint
`class Connexion<E extends 'fermee' | 'ouverte' = 'fermee'>`, un champ `declare readonly etat: E;` (sans quoi E n'est pas utilisé), et un paramètre `this: Connexion<'ouverte'>`.
@solution
class Connexion<E extends 'fermee' | 'ouverte' = 'fermee'> {
  declare readonly etat: E;
  readonly journal: string[] = [];

  ouvrir(this: Connexion<'fermee'>): Connexion<'ouverte'> {
    return this as Connexion<'fermee' | 'ouverte'> as Connexion<'ouverte'>;
  }

  envoyer(this: Connexion<'ouverte'>, message: string): Connexion<'ouverte'> {
    this.journal.push(message);
    return this;
  }

  fermer(this: Connexion<'ouverte'>): Connexion<'fermee'> {
    return this as Connexion<'fermee' | 'ouverte'> as Connexion<'fermee'>;
  }
}

@@ defi routeur | Un routeur typé | ts
`creerRouteur()` a une méthode `.route(motif, gestionnaire)` qui s'enchaîne, et `.aller(chemin)`.

- motif : `'/users/:id'` ; le gestionnaire reçoit `{ id: string }`, **type déduit du motif**
- `'/fichiers/*'` : `*` (à la fin) capture tout le reste dans la propriété `reste`
- `aller(chemin)` appelle le premier motif qui correspond et renvoie son résultat (valeurs décodées avec `decodeURIComponent`), ou `null`
- le type de `aller` est l'union des retours des gestionnaires, ou `null`
- `.lien(motif, params)` construit un chemin ; seuls les motifs **déjà déclarés** sont acceptés
@starter

@test Trouve la route
const r = creerRouteur().route('/', () => 'accueil').route('/users/:id', (p) => `user ${p.id}`).route('/users/:id/posts/:post', (p) => `${p.id}-${p.post}`); expect([r.aller('/'), r.aller('/users/5'), r.aller('/users/5/posts/9'), r.aller('/zut'), r.aller('/users/')]).toEqual(['accueil', 'user 5', '5-9', null, null]);
@test Décode, et capture le reste
const r = creerRouteur().route('/f/*', (p) => p.reste).route('/q/:a', (p) => p.a); expect([r.aller('/f/a/b.txt'), r.aller('/q/a%20b')]).toEqual(['a/b.txt', 'a b']);
@test Les points ne sont pas des jokers
const r = creerRouteur().route('/a.b', () => 1); expect([r.aller('/a.b'), r.aller('/axb')]).toEqual([1, null]);
@test Liens
const r = creerRouteur().route('/u/:id', () => 1).route('/f/*', () => 2); expect([r.lien('/u/:id', { id: 'a b' }), r.lien('/f/*', { reste: 'x/y' })]).toEqual(['/u/a%20b', '/f/x/y']);
@types Paramètres déduits
creerRouteur().route('/u/:id/p/:n', (p) => { const a: string = p.id; const b: string = p.n; return 1; });
// @ts-expect-error
creerRouteur().route('/u/:id', (p) => p.zut);
@types Retour de `aller`
const r = creerRouteur().route('/', () => 1).route('/x', () => 'a'); const v = r.aller('/'); type _ = $Expect<$Equal<typeof v, string | number | null>>;
@types Liens vérifiés
const r = creerRouteur().route('/u/:id', () => 1); r.lien('/u/:id', { id: '1' });
// @ts-expect-error
r.lien('/zut', {});
// @ts-expect-error
r.lien('/u/:id', {});
@hint
`interface Routeur<R = never, M extends string = never>` : `route` renvoie `Routeur<R | Retour, M | Motif>`.
@solution
type Noms<M extends string> =
  M extends `${string}:${infer P}/${infer Reste}` ? P | Noms<Reste>
  : M extends `${string}:${infer P}` ? P
  : M extends `${string}/*` ? 'reste'
  : never;

type Params<M extends string> = { [K in Noms<M>]: string };

interface Routeur<R = never, M extends string = never> {
  route<N extends string, T>(motif: N, gestionnaire: (params: Params<N>) => T): Routeur<R | T, M | N>;
  aller(chemin: string): R | null;
  lien<N extends M>(motif: N, params: Params<N>): string;
}

interface Route {
  regex: RegExp;
  gestionnaire: (params: never) => unknown;
}

const echapper = (texte: string): string => texte.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

function enRegex(motif: string): RegExp {
  const source = echapper(motif)
    .replace(/:(\w+)/g, '(?<$1>[^/]+)')
    .replace(/\*$/, '(?<reste>.+)');
  return new RegExp(`^${source}$`);
}

function routeur<R, M extends string>(routes: Route[]): Routeur<R, M> {
  return {
    route: (motif, gestionnaire) => routeur([...routes, { regex: enRegex(motif), gestionnaire }]),
    aller(chemin) {
      for (const { regex, gestionnaire } of routes) {
        const m = regex.exec(chemin);
        if (!m) continue;
        const params = Object.fromEntries(Object.entries(m.groups ?? {}).map(([k, v]) => [k, decodeURIComponent(v)]));
        return gestionnaire(params as never) as R;
      }
      return null;
    },
    lien(motif, params) {
      const valeurs: Record<string, string> = params;
      return motif
        .replace(/:(\w+)/g, (_, nom: string) => encodeURIComponent(valeurs[nom]))
        .replace(/\*$/, () => valeurs.reste);
    },
  };
}

const creerRouteur = (): Routeur => routeur<never, never>([]);

@@ predict phantom
À quoi sert un type fantôme ?
@answer À suivre un état à la compilation, sans valeur à l'exécution
@wrong À cacher une propriété privée
@wrong À accélérer le code
@wrong À créer un type vide
@why Il distingue deux objets identiques à l'exécution.

@@ predict const-generique
Pourquoi `<const T>` dans une fonction de configuration ?
@answer Pour déduire des littéraux sans `as const` chez l'appelant
@wrong Pour interdire la modification de l'objet
@wrong Pour que `T` soit un nombre
@wrong Pour rendre le paramètre obligatoire
@why Sans lui, `['a', 'b']` serait déduit comme `string[]`.

@@ card this-param
Autoriser une méthode seulement dans un certain état ?
@back
Avec un paramètre `this` : `envoyer(this: Requete<'prete'>)`

@@ card deux-temps
Fixer un type et déduire les autres ?
@back
Deux appels : `creer<Etat>()(config)`, ou un builder.
