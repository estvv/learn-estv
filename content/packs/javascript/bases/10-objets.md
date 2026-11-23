# Objets
> Regrouper des données, les parcourir, les copier.

@@ lesson objets | Les objets

Un objet associe des **clés** à des **valeurs**.

```js-run
const livre = {
  titre: 'Dune',
  pages: 412,
  'date de sortie': 1965, // clé avec espaces : guillemets
  auteur: { prenom: 'Frank' },
};
console.log(livre.titre, livre['date de sortie'], livre.auteur.prenom);
const cle = 'pages';
console.log(livre[cle]); // crochets : la clé est dans une variable

livre.lu = true;      // ajouter
livre.pages = 420;    // modifier
delete livre.auteur;  // supprimer
console.log(livre, livre.absent);
```

### Raccourcis d'écriture

```js-run
const nom = 'Ada';
const champ = 'age';
const p = {
  nom,               // comme nom: nom
  [champ]: 36,       // clé calculée
  saluer() {         // méthode
    return `Moi, c'est ${this.nom}`;
  },
};
console.log(p, p.saluer());
```

Dans une méthode, `this` est l'objet devant le point. On approfondira plus tard.

### Tester et parcourir

```js-run
const prix = { cafe: 2, the: 3 };
console.log('cafe' in prix, Object.hasOwn(prix, 'soda'));
console.log(Object.keys(prix), Object.values(prix), Object.entries(prix));
for (const [nom, p] of Object.entries(prix)) console.log(nom, p);
console.log(Object.fromEntries([['a', 1], ['b', 2]])); // l'inverse d'entries
```

### Copier

```js-run
const a = { x: 1, dedans: { y: 2 } };
const b = { ...a, x: 10 };      // copie de surface, avec un changement
b.dedans.y = 99;                // l'objet intérieur est partagé !
console.log(a);
const c = structuredClone(a);   // copie profonde
c.dedans.y = 0;
console.log(a.dedans.y);
```

`Object.freeze(o)` empêche de modifier les propriétés de `o` (en surface).

### JSON

Du texte pour échanger des données :

```js-run
const texte = JSON.stringify({ a: [1, 2], b: undefined, d: null });
console.log(texte); // b a disparu : JSON ne connaît pas undefined
console.log(JSON.parse(texte).a[1]);
console.log(JSON.stringify({ a: 1 }, null, 2)); // joli, sur 2 espaces
```

### En TypeScript

On décrit la forme avec un **type** ou une **interface** :

```ts-run
interface Livre {
  titre: string;
  pages: number;
  auteur?: string;       // facultatif
  readonly isbn: string; // ne se modifie pas
}
const dune: Livre = { titre: 'Dune', pages: 412, isbn: '978' };
console.log(dune.auteur?.toUpperCase());

// Un dictionnaire : des clés texte, toutes des nombres
const stock: Record<string, number> = { pomme: 3 };
stock.kiwi = 5;
console.log(stock);
```

@@ code inventaire | Un inventaire | js
- `ajouter(stock, nom, quantite)` : ajoute la quantité à ce produit (créé s'il manque). **Modifie** `stock`.
- `total(stock)` : le nombre total d'articles
- `ruptures(stock)` : les noms des produits à 0
@starter

@test `ajouter` à un produit existant ou nouveau
const s = { pomme: 1 }; ajouter(s, 'pomme', 4); ajouter(s, 'kiwi', 2); expect(s).toEqual({ pomme: 5, kiwi: 2 });
@test `total`
expect(total({ a: 1, b: 5 })).toBe(6); expect(total({})).toBe(0);
@test `ruptures`
expect(ruptures({ a: 0, b: 3, c: 0 })).toEqual(['a', 'c']);
@hint
`Object.values(stock)` donne les quantités, `Object.keys(stock)` les noms.
@solution
function ajouter(stock, nom, quantite) {
  stock[nom] = (stock[nom] ?? 0) + quantite;
}

function total(stock) {
  return Object.values(stock).reduce((s, n) => s + n, 0);
}

function ruptures(stock) {
  return Object.keys(stock).filter((nom) => stock[nom] === 0);
}

@@ code inverser | Inverser clés et valeurs | js
`inverser(objet)` renvoie un nouvel objet où clés et valeurs sont échangées.
@starter
function inverser(objet) {
}
@test Échange
expect(inverser({ a: 'x', b: 'y' })).toEqual({ x: 'a', y: 'b' });
@test Ne modifie pas l'original
const o = { a: 'x' }; inverser(o); expect(o).toEqual({ a: 'x' });
@hint
`Object.entries` → `map` → `Object.fromEntries`.
@solution
function inverser(objet) {
  return Object.fromEntries(Object.entries(objet).map(([cle, valeur]) => [valeur, cle]));
}

@@ code maj | Mettre à jour sans modifier | js
`demenager(personne, ville)` renvoie une **copie** de la personne avec une nouvelle ville dans son adresse. Ni l'original, ni son adresse ne doivent changer.
@starter
function demenager(personne, ville) {
  personne.adresse.ville = ville;
  return personne;
}
@test La copie a la nouvelle ville
expect(demenager({ nom: 'Ada', adresse: { ville: 'Paris', cp: '75' } }, 'Séoul')).toEqual({ nom: 'Ada', adresse: { ville: 'Séoul', cp: '75' } });
@test L'original n'a pas bougé
const p = { nom: 'Ada', adresse: { ville: 'Paris', cp: '75' } }; demenager(p, 'Séoul'); expect(p.adresse.ville).toBe('Paris');
@hint
Il faut étaler à **chaque niveau** : `{ ...personne, adresse: { ...personne.adresse, … } }`.
@solution
function demenager(personne, ville) {
  return { ...personne, adresse: { ...personne.adresse, ville } };
}

@@ code grouper | Grouper, en TypeScript | ts
Déclare l'interface `Film` (`titre` texte, `annee` nombre, `note` nombre **facultatif**), puis `parAnnee(films)` qui renvoie un dictionnaire : pour chaque année, la liste des **titres**. N'utilise pas `Object.groupBy`.
@starter
function parAnnee(films) {
}
@test Groupe les titres
expect(parAnnee([{ titre: 'A', annee: 1999 }, { titre: 'B', annee: 2001, note: 4 }, { titre: 'C', annee: 1999 }])).toEqual({ 1999: ['A', 'C'], 2001: ['B'] });
@test Vide
expect(parAnnee([])).toEqual({});
@types `note` est facultative
const f: Film = { titre: 'A', annee: 1 }; const g: Film = { titre: 'A', annee: 1, note: 2 };
@types `titre` est obligatoire
// @ts-expect-error
const f: Film = { annee: 1 };
@types Le type de retour
type _ = $Expect<$Equal<ReturnType<typeof parAnnee>, Record<number, string[]>>>;
@hint
Retour : `Record<number, string[]>`. Pour créer la liste la première fois : `(groupes[annee] ??= []).push(titre)`.
@solution
interface Film {
  titre: string;
  annee: number;
  note?: number;
}

function parAnnee(films: Film[]): Record<number, string[]> {
  const groupes: Record<number, string[]> = {};
  for (const film of films) {
    (groupes[film.annee] ??= []).push(film.titre);
  }
  return groupes;
}

@@ predict copie-surface
Qu'affiche ce code ?
```js
const a = { n: { v: 1 } };
const b = { ...a };
b.n.v = 2;
console.log(a.n.v);
```
@answer `2`
@wrong `1`
@wrong `undefined`
@wrong Une TypeError
@why Le spread copie en surface : `n` reste le même objet des deux côtés.

@@ predict cle-calculee
Qu'affiche ce code ?
```js
const k = 'x';
console.log({ k: 1, [k]: 2 });
```
@answer `{ k: 1, x: 2 }`
@wrong `{ k: 2 }`
@wrong `{ x: 1, k: 2 }`
@wrong `{ x: 2 }`
@why Sans crochets, la clé est le mot `k` lui-même.

@@ predict json-undefined
Qu'affiche ce code ?
```js
console.log(JSON.stringify({ a: undefined, b: null }));
```
@answer `{"b":null}`
@wrong `{"a":undefined,"b":null}`
@wrong `{"a":null,"b":null}`
@wrong `{}`
@why JSON ne connaît pas `undefined` : la clé disparaît.

@@ predict ordre-spread
Qu'affiche ce code ?
```js
console.log({ a: 1, ...{ a: 2, b: 3 }, b: 4 });
```
@answer `{ a: 2, b: 4 }`
@wrong `{ a: 1, b: 4 }`
@wrong `{ a: 2, b: 3 }`
@wrong `{ a: 1, b: 3 }`
@why La dernière valeur écrite pour une clé l'emporte.

@@ card entries
Parcourir clés et valeurs d'un objet `o` ?
@back
`for (const [cle, valeur] of Object.entries(o)) { … }`

@@ card copie-profonde
Copie de surface et copie profonde d'un objet ?
@back
Surface : `{ ...o }`. Profonde : `structuredClone(o)`.

@@ card record
Type d'un dictionnaire texte → nombre ?
@back
`Record<string, number>`

@@ card facultatif
Propriété facultative, propriété en lecture seule ?
@back
`note?: number` et `readonly id: string`

@@ defi chemins | Aplatir et reconstruire | js
- `aplatir(objet)` : `{ a: { b: 1 }, c: 2 }` → `{ 'a.b': 1, c: 2 }`. Les tableaux et `null` sont des valeurs. Un objet **vide** imbriqué est gardé tel quel.
- `reconstruire(plat)` : l'inverse
- `difference(avant, apres)` : la liste triée des chemins dont la valeur a changé, apparu ou disparu (valeurs simples)
@starter

@test `aplatir`
expect(aplatir({ a: { b: 1, d: { e: null } }, c: [1, 2], v: {} })).toEqual({ 'a.b': 1, 'a.d.e': null, c: [1, 2], v: {} });
@test `reconstruire`
expect(reconstruire({ 'a.b': 1, 'a.c.d': 2, e: 3 })).toEqual({ a: { b: 1, c: { d: 2 } }, e: 3 });
@test Aller-retour
const o = { a: { b: { c: 1 }, d: [1] }, e: null, f: {} }; expect(reconstruire(aplatir(o))).toEqual(o);
@test `difference`
expect(difference({ a: 1, b: { c: 2, d: 3 } }, { a: 1, b: { c: 5 }, z: 9 })).toEqual(['b.c', 'b.d', 'z']);
@solution
const estObjet = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);

function aplatir(objet, prefixe = '') {
  const plat = {};
  for (const [cle, valeur] of Object.entries(objet)) {
    if (estObjet(valeur) && Object.keys(valeur).length > 0) Object.assign(plat, aplatir(valeur, `${prefixe}${cle}.`));
    else plat[prefixe + cle] = valeur;
  }
  return plat;
}

function reconstruire(plat) {
  const objet = {};
  for (const [chemin, valeur] of Object.entries(plat)) {
    const cles = chemin.split('.');
    const derniere = cles.pop();
    let courant = objet;
    for (const cle of cles) courant = courant[cle] ??= {};
    courant[derniere] = valeur;
  }
  return objet;
}

function difference(avant, apres) {
  const a = aplatir(avant);
  const b = aplatir(apres);
  const chemins = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...chemins].filter((c) => a[c] !== b[c] || c in a !== c in b).sort();
}
