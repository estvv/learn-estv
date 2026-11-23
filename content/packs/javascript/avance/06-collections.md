# Map, Set, dates et JSON
> Les collections et les objets intégrés utiles.

@@ lesson collections | Map et Set

### Map : un dictionnaire

Comme un objet, mais **toute valeur** peut être une clé, la taille est connue, et l'ordre d'ajout est gardé.

```js-run
const ages = new Map([['Ada', 36]]);
ages.set('Linus', 21).set('Grace', 85);
console.log(ages.get('Ada'), ages.get('X'), ages.has('Linus'), ages.size);
ages.delete('Linus');
for (const [nom, age] of ages) console.log(nom, age);
console.log([...ages.keys()], Object.fromEntries(ages));

const cle = { id: 1 };
console.log(new Map([[cle, 'objet en clé']]).get(cle));
```

**Objet ou Map ?** Un objet pour une structure aux champs connus (`user.nom`). Une Map pour un dictionnaire dont les clés changent.

### Set : des valeurs uniques

```js-run
const s = new Set([1, 2, 2, 3]);
s.add(4).delete(1);
console.log(s, s.has(2), s.size);
console.log([...new Set(['a', 'b', 'a'])]); // dédoublonner
const t = new Set([3, 4, 5]);
console.log(s.union(t), s.intersection(t), s.difference(t));
```

### WeakMap et WeakSet

Leurs clés sont des objets, **oubliés** dès que plus personne ne s'en sert : parfait pour attacher des données à un objet sans l'empêcher d'être libéré de la mémoire. Pas de taille, pas de parcours.

### Dates

```js-run
const d = new Date(2026, 0, 31); // le mois commence à 0 : janvier
console.log(d.getFullYear(), d.getMonth(), d.getDate(), d.getDay());
console.log(new Date('2026-11-23T10:00:00Z').toISOString());
console.log(Date.now() > 0);                       // millisecondes depuis 1970
console.log(new Date('2026-11-23') - new Date('2026-11-20')); // en ms
console.log(new Date('2026-11-23T10:00:00Z').toLocaleDateString('fr-FR', { dateStyle: 'full', timeZone: 'UTC' }));
```

### Intl : formater pour les humains

```js-run
console.log(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(1234.5));
console.log(new Intl.ListFormat('fr', { type: 'conjunction' }).format(['a', 'b', 'c']));
console.log(new Intl.PluralRules('fr').select(1), new Intl.PluralRules('fr').select(2));
```

### JSON, plus loin

```js-run
const o = { date: new Date(0), prix: 3, secret: 'x', toJSON: undefined };
console.log(JSON.stringify(o, ['prix']));                       // clés choisies
console.log(JSON.stringify(o, (cle, v) => (cle === 'secret' ? undefined : v)));
console.log(JSON.parse('{"n":"12"}', (cle, v) => (cle === 'n' ? Number(v) : v)));
```

Une `Map` ou un `Set` devient `{}` en JSON : convertis-les avant (`[...map]`).

### En TypeScript

`Map<string, number>`, `Set<string>`. `map.get(k)` est `V | undefined` : gère l'absence.

@@ code dedoublonner | Dédoublonner | js
- `uniques(liste)` : sans doublons, ordre gardé
- `uniquesPar(liste, cleDe)` : garde le **premier** élément pour chaque clé donnée par `cleDe(element)`
@starter

@test `uniques`
expect(uniques([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
@test `uniquesPar`
expect(uniquesPar([{ id: 1, n: 'a' }, { id: 2, n: 'b' }, { id: 1, n: 'c' }], (x) => x.id)).toEqual([{ id: 1, n: 'a' }, { id: 2, n: 'b' }]);
@test Vide
expect([uniques([]), uniquesPar([], (x) => x)]).toEqual([[], []]);
@hint
Pour `uniquesPar`, un `Set` des clés déjà vues dans un `filter`.
@solution
const uniques = (liste) => [...new Set(liste)];

function uniquesPar(liste, cleDe) {
  const vues = new Set();
  return liste.filter((x) => {
    const cle = cleDe(x);
    if (vues.has(cle)) return false;
    vues.add(cle);
    return true;
  });
}

@@ code grouper-map | Grouper dans une Map | js
`grouperPar(liste, cleDe)` renvoie une **Map** : clé → tableau des éléments. Sans `Map.groupBy`.
@starter
function grouperPar(liste, cleDe) {
}
@test Groupe
expect(grouperPar([1, 2, 3, 4], (n) => n % 2 === 0)).toEqual(new Map([[false, [1, 3]], [true, [2, 4]]]));
@test Les clés peuvent être des objets
const a = {}; const b = {}; expect(grouperPar([[a, 1], [b, 2], [a, 3]], (x) => x[0]).get(a)).toEqual([[a, 1], [a, 3]]);
@test Sans `groupBy`
expect($source).not.toMatch(/groupBy/);
@solution
function grouperPar(liste, cleDe) {
  const groupes = new Map();
  for (const x of liste) {
    const cle = cleDe(x);
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(x);
  }
  return groupes;
}

@@ code jours | Compter les jours | js
`joursEntre(a, b)` reçoit deux dates au format `'AAAA-MM-JJ'` et renvoie le nombre de jours entre elles, toujours positif. `nomDuJour(date)` renvoie le jour en français (`'lundi'`…).
@starter

@test Le nombre de jours
expect(joursEntre('2026-11-20', '2026-11-23')).toBe(3);
expect(joursEntre('2026-03-01', '2026-02-01')).toBe(28);
@test Le même jour
expect(joursEntre('2026-01-01', '2026-01-01')).toBe(0);
@test Le nom du jour
expect([nomDuJour('2026-11-23'), nomDuJour('2000-01-01')]).toEqual(['lundi', 'samedi']);
@hint
`new Date('2026-11-20')` est à minuit **UTC**. Une journée dure 86 400 000 ms.
@hint
`date.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' })`
@solution
function joursEntre(a, b) {
  return Math.abs(new Date(a) - new Date(b)) / 86_400_000;
}

function nomDuJour(date) {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
}

@@ code lru | Cache limité, en TypeScript | ts
Classe `Cache` : garde au plus `taille` valeurs (donnée au constructeur). Quand il est plein, ajouter une clé retire **la moins récemment utilisée**. `get` et `set` comptent comme une utilisation.

Clés : textes ; valeurs : nombres. Utilise l'ordre d'une `Map`.
@starter
class Cache {
}
@test Garde les valeurs
const c = new Cache(2); c.set('a', 1); c.set('b', 2); expect([c.get('a'), c.get('b'), c.get('z')]).toEqual([1, 2, undefined]);
@test Retire la plus ancienne
const c = new Cache(2); c.set('a', 1); c.set('b', 2); c.set('c', 3); expect([c.get('a'), c.get('b'), c.get('c')]).toEqual([undefined, 2, 3]);
@test Lire rend récent
const c = new Cache(2); c.set('a', 1); c.set('b', 2); c.get('a'); c.set('c', 3); expect([c.get('a'), c.get('b')]).toEqual([1, undefined]);
@test Remplacer ne retire rien
const c = new Cache(2); c.set('a', 1); c.set('b', 2); c.set('a', 9); expect([c.get('a'), c.get('b')]).toEqual([9, 2]);
@types Types
const c = new Cache(3); const v: number | undefined = c.get('a');
// @ts-expect-error
c.set('a', 'texte');
@hint
Une Map garde l'ordre d'ajout : supprimer puis remettre une clé l'envoie à la fin. La première clé : `map.keys().next().value`.
@solution
class Cache {
  #valeurs = new Map<string, number>();
  #taille: number;

  constructor(taille: number) {
    this.#taille = taille;
  }

  get(cle: string): number | undefined {
    const valeur = this.#valeurs.get(cle);
    if (valeur !== undefined) this.set(cle, valeur);
    return valeur;
  }

  set(cle: string, valeur: number): void {
    this.#valeurs.delete(cle);
    this.#valeurs.set(cle, valeur);
    if (this.#valeurs.size > this.#taille) {
      for (const ancienne of this.#valeurs.keys()) {
        this.#valeurs.delete(ancienne);
        break;
      }
    }
  }
}

@@ predict set-objets
Qu'affiche ce code ?
```js
console.log(new Set([{}, {}]).size, new Set([NaN, NaN]).size);
```
@answer `2 1`
@wrong `1 1`
@wrong `2 2`
@wrong `1 2`
@why Deux objets sont différents même s'ils se ressemblent ; `Set` considère `NaN` égal à lui-même.

@@ predict mois
Qu'affiche ce code ?
```js
console.log(new Date(2026, 1, 1).getMonth());
```
@answer `1`
@wrong `2`
@wrong `0`
@wrong `février`
@why Les mois vont de 0 à 11 : 1, c'est février.

@@ predict json-map
Qu'affiche ce code ?
```js
console.log(JSON.stringify(new Map([['a', 1]])));
```
@answer `{}`
@wrong `{"a":1}`
@wrong `[["a",1]]`
@wrong Une TypeError
@why JSON ne sait pas écrire une Map. Convertis avec `Object.fromEntries(map)` ou `[...map]`.

@@ card map-objet
Quand préférer une `Map` à un objet ?
@back
Pour un dictionnaire : clés dynamiques ou qui ne sont pas du texte, ajouts et suppressions fréquents, taille utile.

@@ card doublons
Enlever les doublons d'un tableau ?
@back
`[...new Set(liste)]`

@@ card weakmap
À quoi sert une `WeakMap` ?
@back
À associer des données à des objets sans les empêcher d'être libérés de la mémoire.

@@ defi bimap | Une Map à deux sens | ts
Classe `BiMap<K, V>` : chaque clé a une valeur, chaque valeur **une seule** clé.

- `set(k, v)` (renvoie `this`) : retire les anciennes associations de `k` **et** de `v`
- `get(k)`, `cle(v)`, `delete(k)` (booléen), `size`
- itérable comme une Map
- `BiMap.depuis(iterable)`
- `toJSON()` : un tableau de paires
@starter
class BiMap<K, V> {
}
@test Dans les deux sens
const b = BiMap.depuis([['fr', 'France'], ['kr', 'Corée']]); expect([b.get('fr'), b.cle('Corée'), b.get('x'), b.cle('x'), b.size]).toEqual(['France', 'kr', undefined, undefined, 2]);
@test Retire les anciennes associations
const b = new BiMap().set('a', 1).set('b', 2); b.set('a', 2); expect([b.size, b.get('a'), b.get('b'), b.cle(1), b.cle(2)]).toEqual([1, 2, undefined, undefined, 'a']);
@test Remettre la même paire
const b = new BiMap().set('a', 1).set('a', 1); expect([b.size, b.get('a'), b.cle(1)]).toEqual([1, 1, 'a']);
@test Supprimer, itérer, JSON
const b = new BiMap().set('a', 1).set('b', 2); expect([b.delete('a'), b.delete('a'), b.cle(1), [...b], JSON.stringify(b)]).toEqual([true, false, undefined, [['b', 2]], '[["b",2]]']);
@types Types
const b: BiMap<string, number> = BiMap.depuis([['a', 1] as [string, number]]); const n: number | undefined = b.get('a'); const s: string | undefined = b.cle(1);
// @ts-expect-error
b.set(1, 'a');
@solution
class BiMap<K, V> {
  #valeurs = new Map<K, V>();
  #cles = new Map<V, K>();

  static depuis<K, V>(paires: Iterable<[K, V]>): BiMap<K, V> {
    const b = new BiMap<K, V>();
    for (const [k, v] of paires) b.set(k, v);
    return b;
  }

  get size(): number {
    return this.#valeurs.size;
  }

  get(k: K): V | undefined {
    return this.#valeurs.get(k);
  }

  cle(v: V): K | undefined {
    return this.#cles.get(v);
  }

  set(k: K, v: V): this {
    this.delete(k);
    if (this.#cles.has(v)) this.delete(this.#cles.get(v) as K);
    this.#valeurs.set(k, v);
    this.#cles.set(v, k);
    return this;
  }

  delete(k: K): boolean {
    if (!this.#valeurs.has(k)) return false;
    this.#cles.delete(this.#valeurs.get(k) as V);
    return this.#valeurs.delete(k);
  }

  *[Symbol.iterator](): Generator<[K, V]> {
    yield* this.#valeurs;
  }

  toJSON(): [K, V][] {
    return [...this];
  }
}
