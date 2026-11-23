# Types calculés
> keyof, typeof, accès indexé, types utilitaires et mapped types.

@@ lesson calculer | Fabriquer un type à partir d'un autre

### keyof, typeof, T[K]

```ts
const config = { port: 80, hote: 'a.fr', debug: false };

type Config = typeof config;      // { port: number; hote: string; debug: boolean }
type Cle = keyof Config;          // 'port' | 'hote' | 'debug'
type Port = Config['port'];       // number
type Valeurs = Config[keyof Config]; // string | number | boolean
```

`typeof` dans un **type** donne le type d'une valeur (rien à voir avec le `typeof` de JavaScript).

### as const

Fige une valeur : propriétés `readonly`, types littéraux.

```ts-run
const TAILLES = ['S', 'M', 'L'] as const;
type Taille = (typeof TAILLES)[number]; // 'S' | 'M' | 'L'

function estTaille(x: string): x is Taille {
  return (TAILLES as readonly string[]).includes(x);
}
console.log(estTaille('M'), estTaille('XXL'));
```

La liste existe à l'exécution **et** donne le type : plus besoin d'écrire les deux.

### Types utilitaires

| | |
|---|---|
| `Partial<T>` / `Required<T>` | tout facultatif / tout obligatoire |
| `Readonly<T>` | tout en lecture seule |
| `Pick<T, K>` / `Omit<T, K>` | seulement ces clés / sans ces clés |
| `Record<K, V>` | ces clés, cette valeur |
| `Exclude<U, X>` / `Extract<U, X>` | retirer d'une union / n'en garder que |
| `NonNullable<T>` | sans `null` ni `undefined` |
| `Parameters<F>` / `ReturnType<F>` | paramètres (tuple) / retour d'une fonction |
| `Awaited<P>` | ce que contient une promesse |

```ts-run
interface User { id: number; nom: string; email: string }
type Nouveau = Omit<User, 'id'>;
type Modif = Partial<Nouveau>;

const modifier = (u: User, m: Modif): User => ({ ...u, ...m });
console.log(modifier({ id: 1, nom: 'A', email: 'a' }, { nom: 'B' }));
```

@@ lesson mapped | Mapped types

On parcourt des clés pour fabriquer un type. C'est ainsi que les utilitaires sont écrits :

```ts
type MonPartial<T> = { [K in keyof T]?: T[K] };
type MonReadonly<T> = { readonly [K in keyof T]: T[K] };
type MonPick<T, K extends keyof T> = { [P in K]: T[P] };
type MonRecord<K extends PropertyKey, V> = { [P in K]: V };

// On peut aussi RETIRER un modificateur avec « - »
type Modifiable<T> = { -readonly [K in keyof T]: T[K] };
type Complet<T> = { [K in keyof T]-?: T[K] };
```

### Renommer les clés avec as

```ts
type Getters<T> = {
  [K in keyof T & string as `get${Capitalize<K>}`]: () => T[K];
};
type G = Getters<{ nom: string; age: number }>;
// { getNom: () => string; getAge: () => number }

// as never retire la clé
type SansFonctions<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};
```

### Textes dans les types

Les **template literal types** combinent des unions :

```ts
type Cote = 'haut' | 'bas';
type Marge = `marge-${Cote}`;        // 'marge-haut' | 'marge-bas'
type Evt = `on${Capitalize<'clic'>}`; // 'onClic'
```

Avec `Uppercase`, `Lowercase`, `Capitalize` et `Uncapitalize`.

@@ code roles | Une seule source de vérité | ts
1. `ROLES` : le tableau constant `'admin'`, `'editeur'`, `'lecteur'` (dans cet ordre)
2. `type Role` : déduit de `ROLES`, **sans** réécrire les textes
3. `DROITS` : pour **chaque** rôle, un tableau de textes (admin : `'lire'`, `'ecrire'`, `'supprimer'` ; editeur : `'lire'`, `'ecrire'` ; lecteur : `'lire'`)
4. `peut(role, droit)` : booléen
@starter

@test `ROLES`
expect([...ROLES]).toEqual(['admin', 'editeur', 'lecteur']);
@test `peut`
expect([peut('admin', 'supprimer'), peut('editeur', 'supprimer'), peut('lecteur', 'lire')]).toEqual([true, false, true]);
@test Chaque rôle n'est écrit qu'une fois entre guillemets
expect($source.match(/['"]editeur['"]/g)).toHaveLength(1);
@types `Role`
type _ = $Expect<$Equal<Role, 'admin' | 'editeur' | 'lecteur'>>;
@types Rôle inconnu refusé
// @ts-expect-error
peut('invite', 'lire');
@hint
`type Role = (typeof ROLES)[number];` et `const DROITS: Record<Role, string[]> = …`
@solution
const ROLES = ['admin', 'editeur', 'lecteur'] as const;
type Role = (typeof ROLES)[number];

const DROITS: Record<Role, readonly string[]> = {
  admin: ['lire', 'ecrire', 'supprimer'],
  editeur: ['lire', 'ecrire'],
  lecteur: ['lire'],
};

function peut(role: Role, droit: string): boolean {
  return DROITS[role].includes(droit);
}

@@ code crud | Dériver des types | ts
À partir de `Produit`, **sans réécrire ses champs** :

- `NouveauProduit` : sans `id` ni `cree`
- `ModifProduit` : comme `NouveauProduit`, tout facultatif
- `ApercuProduit` : seulement `id` et `nom`, en lecture seule

Puis `modifier(p, m)` et `apercu(p)`.
@starter
interface Produit {
  id: number;
  nom: string;
  prix: number;
  description?: string;
  cree: Date;
}

@test `modifier`
const p = { id: 1, nom: 'a', prix: 2, cree: new Date(0) }; expect(modifier(p, { prix: 5 })).toEqual({ ...p, prix: 5 }); expect(p.prix).toBe(2);
@test `apercu`
expect(apercu({ id: 1, nom: 'a', prix: 2, cree: new Date(0) })).toEqual({ id: 1, nom: 'a' });
@types `NouveauProduit` et `ModifProduit`
const n: NouveauProduit = { nom: 'a', prix: 1 }; const m: ModifProduit = {};
type _ = [$Expect<$Equal<keyof NouveauProduit, 'nom' | 'prix' | 'description'>>, $Expect<$Equal<ModifProduit['prix'], number | undefined>>];
@types `ApercuProduit`
const a = null! as ApercuProduit; type _ = $Expect<$Equal<keyof ApercuProduit, 'id' | 'nom'>>;
// @ts-expect-error
a.nom = 'x';
@types L'id ne se modifie pas
const p = null! as Produit;
// @ts-expect-error
modifier(p, { id: 3 });
@solution
interface Produit {
  id: number;
  nom: string;
  prix: number;
  description?: string;
  cree: Date;
}

type NouveauProduit = Omit<Produit, 'id' | 'cree'>;
type ModifProduit = Partial<NouveauProduit>;
type ApercuProduit = Readonly<Pick<Produit, 'id' | 'nom'>>;

function modifier(p: Produit, m: ModifProduit): Produit {
  return { ...p, ...m };
}

function apercu({ id, nom }: Produit): ApercuProduit {
  return { id, nom };
}

@@ code utilitaires-maison | Réécrire les utilitaires | ts
Sans utiliser ceux de TypeScript, écris :

- `MonPartial<T>`, `MonReadonly<T>`, `MonPick<T, K>`
- `Modifiable<T>` : retire `readonly`
- `Nullable<T>` : chaque propriété accepte aussi `null`
@starter

@types `MonPartial`
type _ = $Expect<$Equal<MonPartial<{ a: 1; b: string }>, Partial<{ a: 1; b: string }>>>;
@types `MonReadonly`
type _ = $Expect<$Equal<MonReadonly<{ a: 1 }>, { readonly a: 1 }>>;
@types `MonPick`
type _ = $Expect<$Equal<MonPick<{ a: 1; b: 2; c: 3 }, 'a' | 'c'>, { a: 1; c: 3 }>>;
// @ts-expect-error
type X = MonPick<{ a: 1 }, 'z'>;
@types `Modifiable`
type _ = $Expect<$Equal<Modifiable<{ readonly a: 1; b: 2 }>, { a: 1; b: 2 }>>;
@types `Nullable`
type _ = $Expect<$Equal<Nullable<{ a: number; b?: string }>, { a: number | null; b?: string | null }>>;
@test Sans les types intégrés
expect($source).not.toMatch(/(?<!Mon)(Partial|Readonly|Pick)</);
@solution
type MonPartial<T> = { [K in keyof T]?: T[K] };
type MonReadonly<T> = { readonly [K in keyof T]: T[K] };
type MonPick<T, K extends keyof T> = { [P in K]: T[P] };
type Modifiable<T> = { -readonly [K in keyof T]: T[K] };
type Nullable<T> = { [K in keyof T]: T[K] | null };

@@ code setters | Renommer des clés | ts
- `type Setters<T>` : pour chaque propriété, une méthode `setNom(valeur) => void` (`nom` → `setNom`)
- `creerSetters(objet)` : renvoie l'objet des setters, qui **modifient** l'objet donné
@starter

@test Les setters modifient l'objet
const o = { nom: 'a', age: 1 }; const s = creerSetters(o); s.setNom('b'); s.setAge(9); expect(o).toEqual({ nom: 'b', age: 9 }); expect(Object.keys(s)).toEqual(['setNom', 'setAge']);
@types `Setters`
type _ = $Expect<$Equal<Setters<{ nom: string; age: number }>, { setNom: (valeur: string) => void; setAge: (valeur: number) => void }>>;
@types `creerSetters` est typée
const s = creerSetters({ nom: 'a' }); s.setNom('b');
// @ts-expect-error
s.setNom(3);
@hint
``[K in keyof T & string as `set${Capitalize<K>}`]``. Dans la fonction, une assertion finale `as Setters<T>` est nécessaire.
@solution
type Setters<T> = {
  [K in keyof T & string as `set${Capitalize<K>}`]: (valeur: T[K]) => void;
};

function creerSetters<T extends object>(objet: T): Setters<T> {
  const entrees = Object.keys(objet).map((cle) => [
    `set${cle[0].toUpperCase()}${cle.slice(1)}`,
    (valeur: T[keyof T]) => {
      objet[cle as keyof T] = valeur;
    },
  ]);
  return Object.fromEntries(entrees) as Setters<T>;
}

@@ predict typeof-const
Quel est le type `T` ?
```ts
const l = ['a', 'b'] as const;
type T = (typeof l)[number];
```
@answer `'a' | 'b'`
@wrong `string`
@wrong `readonly ['a', 'b']`
@wrong `number`
@why `as const` garde les littéraux, et `[number]` donne l'union des éléments.

@@ predict omit
Quel est le type `T` ?
```ts
type T = keyof Omit<{ a: 1; b: 2; c: 3 }, 'a'>;
```
@answer `'b' | 'c'`
@wrong `'a'`
@wrong `2 | 3`
@wrong `'a' | 'b' | 'c'`
@why `Omit` retire la clé `a`, `keyof` donne les clés restantes.

@@ predict exclude
Quel est le type `T` ?
```ts
type T = Exclude<'a' | 'b' | 1, string>;
```
@answer `1`
@wrong `'a' | 'b'`
@wrong `never`
@wrong `string`
@why `Exclude` retire de l'union ce qui est assignable à `string`.

@@ card union-depuis-tableau
Obtenir le type union des éléments d'un tableau constant `L` ?
@back
`const L = […] as const; type U = (typeof L)[number];`

@@ card mapped
Mapped type qui rend tout facultatif ?
@back
`{ [K in keyof T]?: T[K] }`

@@ card pick-omit
`Pick` et `Omit` ?
@back
`Pick<T, K>` garde ces clés ; `Omit<T, K>` les retire.

@@ defi evenements-objet | Des événements dérivés | ts
À partir d'un type d'objet, `observable(objet)` renvoie `{ valeur, set, on }` :

- `set(cle, valeur)` change l'objet et prévient
- `on(evenement, f)` où l'événement est `` `${cle}Change` `` ; `f(nouvelle, ancienne)` est typée d'après la clé ; renvoie un désabonnement
- `on('change', f)` : `f({ cle, nouvelle, ancienne })`, une union **discriminée** par `cle`
- rien n'est prévenu si la valeur est identique
@starter

@test Prévient
const o = observable({ nom: 'a', age: 1 }); const l = []; const off = o.on('ageChange', (n, a) => l.push([n, a])); o.set('age', 5); o.set('nom', 'b'); o.set('age', 5); off(); o.set('age', 9); expect([l, o.valeur.age]).toEqual([[[5, 1]], 9]);
@test Événement général
const o = observable({ nom: 'a', age: 1 }); const l = []; o.on('change', (e) => l.push(e)); o.set('nom', 'z'); expect(l).toEqual([{ cle: 'nom', nouvelle: 'z', ancienne: 'a' }]);
@types Événements dérivés
const o = observable({ nom: 'a', age: 1 }); o.on('nomChange', (n) => n.toUpperCase()); o.on('ageChange', (n, a) => n.toFixed(a)); o.set('age', 3);
// @ts-expect-error
o.on('zutChange', () => {});
// @ts-expect-error
o.on('ageChange', (n: string) => {});
// @ts-expect-error
o.set('age', 'x');
@types Union discriminée
observable({ nom: 'a', age: 1 }).on('change', (e) => { if (e.cle === 'age') { const n: number = e.nouvelle; } else { const s: string = e.nouvelle; } });
@solution
type Ecouteurs<T> = {
  [K in keyof T & string as `${K}Change`]: (nouvelle: T[K], ancienne: T[K]) => void;
} & {
  change: (e: { [K in keyof T & string]: { cle: K; nouvelle: T[K]; ancienne: T[K] } }[keyof T & string]) => void;
};

function observable<T extends object>(objet: T) {
  const ecouteurs = new Map<string, Set<(...args: any[]) => void>>();
  const prevenir = (evenement: string, ...args: unknown[]): void => {
    for (const f of [...(ecouteurs.get(evenement) ?? [])]) f(...args);
  };
  return {
    valeur: objet as Readonly<T>,
    set<K extends keyof T & string>(cle: K, nouvelle: T[K]): void {
      const ancienne = objet[cle];
      if (Object.is(ancienne, nouvelle)) return;
      objet[cle] = nouvelle;
      prevenir(`${cle}Change`, nouvelle, ancienne);
      prevenir('change', { cle, nouvelle, ancienne });
    },
    on<E extends keyof Ecouteurs<T> & string>(evenement: E, f: Ecouteurs<T>[E] & ((...args: any[]) => void)): () => void {
      const liste = ecouteurs.get(evenement) ?? new Set();
      ecouteurs.set(evenement, liste);
      liste.add(f);
      return () => {
        liste.delete(f);
      };
    },
  };
}
