# Unions et narrowing
> L'outil le plus utile de TypeScript.

@@ lesson unions | Unions

`A | B` : l'un **ou** l'autre. On ne peut utiliser que ce qui est commun aux deux, jusqu'à ce qu'on **réduise** le type (*narrowing*).

```ts-run
function formater(x: string | number | Date): string {
  if (typeof x === 'string') return x.trim();
  if (x instanceof Date) return x.toISOString();
  return x.toFixed(1);           // il ne reste que number
}
console.log(formater(' a '), formater(2), formater(new Date(0)));
```

Ce qui réduit un type :

| Test | Pour |
|---|---|
| `typeof x === 'string'` | les primitifs |
| `x instanceof Classe` | les instances |
| `'champ' in x` | les objets selon leurs clés |
| `x === null`, `x === 'a'` | une valeur précise |
| `Array.isArray(x)` | les tableaux |
| `if (x)` | écarter `null`, `undefined` (et `0`, `''` !) |
| `x.type === 'a'` | les unions discriminées |

### Unions de littéraux

```ts
type Direction = 'haut' | 'bas' | 'gauche' | 'droite';
type De = 1 | 2 | 3 | 4 | 5 | 6;
```

L'éditeur propose les valeurs et refuse les fautes de frappe.

@@ lesson discriminees | Unions discriminées

Le modèle à retenir : chaque variante a un champ commun, de type **littéral**, qui l'identifie.

```ts-run
type Forme =
  | { type: 'cercle'; rayon: number }
  | { type: 'carre'; cote: number }
  | { type: 'rectangle'; l: number; h: number };

function aire(f: Forme): number {
  switch (f.type) {
    case 'cercle': return Math.PI * f.rayon ** 2;
    case 'carre': return f.cote ** 2;
    case 'rectangle': return f.l * f.h;
  }
}
console.log(aire({ type: 'rectangle', l: 2, h: 3 }));
```

Cela **rend les états impossibles impossibles à écrire**. Comparer :

```ts
// Que veut dire { chargement: true, erreur: 'x', donnees: […] } ?
interface Mauvais { chargement: boolean; erreur?: string; donnees?: string[] }

// Impossible de se tromper
type Bon =
  | { etat: 'chargement' }
  | { etat: 'erreur'; message: string }
  | { etat: 'ok'; donnees: string[] };
```

### Vérifier qu'on n'oublie rien

Dans `default`, il ne doit rien rester : le type est `never`. Si tu ajoutes une variante, cette ligne devient une erreur et te montre où compléter.

```ts
function exhaustif(x: never): never {
  throw new Error(`Cas oublié : ${JSON.stringify(x)}`);
}
// switch (f.type) { …; default: return exhaustif(f); }
```

### Tes propres gardes

Une fonction qui renvoie `x is T` apprend à TypeScript à réduire un type :

```ts-run
interface Chat { miauler(): string }
const estChat = (x: unknown): x is Chat =>
  typeof x === 'object' && x !== null && 'miauler' in x;

const animal: unknown = { miauler: () => 'miaou' };
if (estChat(animal)) console.log(animal.miauler());
console.log([1, null, 2].filter((x) => x !== null).map((n) => n * 2)); // garde déduite
```

Et `asserts x is T` : après l'appel, TypeScript considère que c'est vrai (sinon la fonction a lancé une erreur).

```ts-run
function verifier(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new TypeError('texte attendu');
}
const v: unknown = 'abc';
verifier(v);
console.log(v.toUpperCase());
```

@@ code etat | L'état d'un chargement | ts
Déclare l'union `Etat` avec un champ `etat` :

- `'vide'`
- `'chargement'`, avec `progression` (nombre)
- `'erreur'`, avec `message`
- `'ok'`, avec `donnees` (tableau de textes)

Puis `afficher(e)` : `'Rien'`, `'Chargement 40 %'`, `'Erreur : panne'`, `'3 éléments'` (ou `'1 élément'`).
@starter

@test Les états simples
expect([afficher({ etat: 'vide' }), afficher({ etat: 'chargement', progression: 40 }), afficher({ etat: 'erreur', message: 'panne' })]).toEqual(['Rien', 'Chargement 40 %', 'Erreur : panne']);
@test Singulier et pluriel
expect([afficher({ etat: 'ok', donnees: ['a'] }), afficher({ etat: 'ok', donnees: ['a', 'b', 'c'] })]).toEqual(['1 élément', '3 éléments']);
@types États impossibles refusés
// @ts-expect-error
const a: Etat = { etat: 'erreur' };
// @ts-expect-error
const b: Etat = { etat: 'ok', message: 'x' };
// @ts-expect-error
const c: Etat = { etat: 'autre' };
@types Le retour est `string`, sans `undefined`
type _ = $Expect<$Equal<ReturnType<typeof afficher>, string>>;
@solution
type Etat =
  | { etat: 'vide' }
  | { etat: 'chargement'; progression: number }
  | { etat: 'erreur'; message: string }
  | { etat: 'ok'; donnees: string[] };

function afficher(e: Etat): string {
  switch (e.etat) {
    case 'vide':
      return 'Rien';
    case 'chargement':
      return `Chargement ${e.progression} %`;
    case 'erreur':
      return `Erreur : ${e.message}`;
    case 'ok':
      return `${e.donnees.length} élément${e.donnees.length > 1 ? 's' : ''}`;
  }
}

@@ code reducer | Un reducer | ts
Un compteur reçoit des **actions** :

- `{ type: 'ajouter', n: number }`
- `{ type: 'remettre' }` → 0
- `{ type: 'annuler' }` → la valeur précédente (rien à annuler : ne change rien)

Déclare `Action`, puis `reduire(etat, action)`, où `etat` est `{ valeur: number; passe: number[] }`. Ne modifie pas l'état reçu. Utilise une vérification d'exhaustivité avec `never`.
@starter
interface Etat {
  valeur: number;
  passe: number[];
}

@test Ajouter et remettre
let e = { valeur: 0, passe: [] }; e = reduire(e, { type: 'ajouter', n: 5 }); expect(e).toEqual({ valeur: 5, passe: [0] }); e = reduire(e, { type: 'remettre' }); expect(e).toEqual({ valeur: 0, passe: [0, 5] });
@test Annuler
expect(reduire({ valeur: 7, passe: [1, 3] }, { type: 'annuler' })).toEqual({ valeur: 3, passe: [1] }); expect(reduire({ valeur: 7, passe: [] }, { type: 'annuler' })).toEqual({ valeur: 7, passe: [] });
@test Ne modifie rien
const e = { valeur: 1, passe: [0] }; reduire(e, { type: 'annuler' }); reduire(e, { type: 'ajouter', n: 1 }); expect(e).toEqual({ valeur: 1, passe: [0] });
@test Action inconnue : une erreur
expect(() => reduire({ valeur: 1, passe: [] }, { type: 'zut' })).toThrow();
@test Utilise `never`
expect($source).toMatch(/never/);
@types Actions vérifiées
const e: Etat = reduire({ valeur: 0, passe: [] }, { type: 'remettre' });
// @ts-expect-error
reduire(e, { type: 'ajouter' });
// @ts-expect-error
reduire(e, { type: 'zut' });
@solution
interface Etat {
  valeur: number;
  passe: number[];
}

type Action =
  | { type: 'ajouter'; n: number }
  | { type: 'remettre' }
  | { type: 'annuler' };

function exhaustif(x: never): never {
  throw new Error(`Action inconnue : ${JSON.stringify(x)}`);
}

function reduire(etat: Etat, action: Action): Etat {
  const avancer = (valeur: number): Etat => ({ valeur, passe: [...etat.passe, etat.valeur] });
  switch (action.type) {
    case 'ajouter':
      return avancer(etat.valeur + action.n);
    case 'remettre':
      return avancer(0);
    case 'annuler': {
      const precedent = etat.passe.at(-1);
      return precedent === undefined ? etat : { valeur: precedent, passe: etat.passe.slice(0, -1) };
    }
    default:
      return exhaustif(action);
  }
}

@@ code garde | Une garde de type | ts
Écris `estUser(x: unknown)`, une garde pour `User`, et `lireUsers(json)`, qui lit un tableau JSON et garde **seulement** les éléments valables (`[]` si ce n'est pas un tableau ou pas du JSON).
@starter
interface User {
  id: number;
  nom: string;
  email?: string;
}

@test `estUser`
expect([estUser({ id: 1, nom: 'A' }), estUser({ id: 1, nom: 'A', email: 'x' }), estUser({ id: '1', nom: 'A' }), estUser(null), estUser({ id: 1, nom: 'A', email: 3 })]).toEqual([true, true, false, false, false]);
@test `lireUsers`
expect(lireUsers('[{"id":1,"nom":"A"},{"id":2},5]')).toEqual([{ id: 1, nom: 'A' }]);
expect([lireUsers('{}'), lireUsers('zut')]).toEqual([[], []]);
@types C'est bien une garde
const x: unknown = 1;
if (estUser(x)) { const n: string = x.nom; }
@types `lireUsers` renvoie `User[]`
type _ = $Expect<$Equal<ReturnType<typeof lireUsers>, User[]>>;
@hint
Le retour s'écrit `x is User`. Et `.filter(estUser)` donne alors un `User[]`.
@solution
interface User {
  id: number;
  nom: string;
  email?: string;
}

function estUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null
    && 'id' in x && typeof x.id === 'number'
    && 'nom' in x && typeof x.nom === 'string'
    && (!('email' in x) || x.email === undefined || typeof x.email === 'string');
}

function lireUsers(json: string): User[] {
  try {
    const donnees: unknown = JSON.parse(json);
    return Array.isArray(donnees) ? donnees.filter(estUser) : [];
  } catch {
    return [];
  }
}

@@ predict union-acces
Que dit TypeScript ?
```ts
function f(x: string | number[]) {
  return x.length;
}
```
@answer Rien : les deux ont `length`
@wrong Erreur : il faut réduire le type
@wrong Erreur : `length` n'existe pas sur `string`
@wrong Le retour est `any`
@why Ce qui est commun à toutes les variantes est utilisable directement.

@@ predict truthy-narrow
Que vaut `f(0)` ?
```ts
function f(x: number | null) {
  if (x) return 'nombre';
  return 'null';
}
```
@answer `'null'`
@wrong `'nombre'`
@wrong Erreur de type
@wrong `undefined`
@why `0` est falsy : écarter `null` avec `if (x)` écarte aussi 0. Écris `x !== null`.

@@ predict exhaustivite
À quoi sert `default: return exhaustif(x)` si `exhaustif` attend un `never` ?
@answer À avoir une erreur de type si un cas est oublié
@wrong À accélérer le `switch`
@wrong À ignorer les cas inconnus
@wrong À transformer `x` en `any`
@why S'il reste une variante, `x` n'est pas `never` et l'appel ne compile plus.

@@ card discriminee
Qu'est-ce qu'une union discriminée ?
@back
Une union d'objets avec un champ commun de type littéral (`type: 'a'`, `type: 'b'`…) qui permet de les distinguer.

@@ card garde-type
Type de retour d'une garde qui vérifie que `x` est un `User` ?
@back
`x is User`

@@ defi machine-commande | Une commande sans état impossible | ts
Une commande passe par `panier` → `payee` → `expediee` → `livree`, ou est `annulee` (seulement depuis `panier` ou `payee`).

- `Commande` : une union discriminée par `statut`. Toutes ont `articles: string[]` ; `payee` ajoute `date` (texte) ; `expediee` ajoute `date` et `suivi` ; `livree` ajoute `date`, `suivi` et `signature` ; `annulee` ajoute `raison`
- `payer(c, date)`, `expedier(c, suivi)`, `livrer(c, signature)`, `annuler(c, raison)` : n'acceptent que les **bons statuts**, et renvoient le statut précis
- `decrire(c)` : `'2 articles'`, `'payée le X'`, `'suivi Y'`, `'reçue par Z'`, `'annulée : R'`
@starter

@test Le parcours
const p = payer({ statut: 'panier', articles: ['a', 'b'] }, 'lundi'); const e = expedier(p, 'S1'); const l = livrer(e, 'Ada'); expect(l).toEqual({ statut: 'livree', articles: ['a', 'b'], date: 'lundi', suivi: 'S1', signature: 'Ada' });
@test Annuler
expect([annuler({ statut: 'panier', articles: [] }, 'non'), annuler({ statut: 'payee', articles: ['a'], date: 'd' }, 'bof')]).toEqual([{ statut: 'annulee', articles: [], raison: 'non' }, { statut: 'annulee', articles: ['a'], raison: 'bof' }]);
@test Décrire
const a = ['x', 'y']; expect([{ statut: 'panier', articles: a }, { statut: 'payee', articles: a, date: 'X' }, { statut: 'expediee', articles: a, date: 'X', suivi: 'Y' }, { statut: 'livree', articles: a, date: 'X', suivi: 'Y', signature: 'Z' }, { statut: 'annulee', articles: a, raison: 'R' }].map(decrire)).toEqual(['2 articles', 'payée le X', 'suivi Y', 'reçue par Z', 'annulée : R']);
@types Transitions permises
const p = payer({ statut: 'panier', articles: [] }, 'd'); const s: string = expedier(p, 's').suivi; annuler(p, 'r'); const c: Commande = livrer(expedier(p, 's'), 'x');
@types Transitions interdites
const p = payer({ statut: 'panier', articles: [] }, 'd');
// @ts-expect-error
payer(p, 'd');
// @ts-expect-error
livrer(p, 'x');
// @ts-expect-error
annuler(expedier(p, 's'), 'r');
@types États impossibles
// @ts-expect-error
const a: Commande = { statut: 'payee', articles: [] };
// @ts-expect-error
const b: Commande = { statut: 'panier', articles: [], suivi: 'x' };
@solution
interface Base {
  articles: string[];
}
interface Panier extends Base { statut: 'panier' }
interface Payee extends Base { statut: 'payee'; date: string }
interface Expediee extends Base { statut: 'expediee'; date: string; suivi: string }
interface Livree extends Base { statut: 'livree'; date: string; suivi: string; signature: string }
interface Annulee extends Base { statut: 'annulee'; raison: string }

type Commande = Panier | Payee | Expediee | Livree | Annulee;

const payer = (c: Panier, date: string): Payee => ({ ...c, statut: 'payee', date });
const expedier = (c: Payee, suivi: string): Expediee => ({ ...c, statut: 'expediee', suivi });
const livrer = (c: Expediee, signature: string): Livree => ({ ...c, statut: 'livree', signature });
const annuler = (c: Panier | Payee, raison: string): Annulee => ({ statut: 'annulee', articles: c.articles, raison });

function decrire(c: Commande): string {
  switch (c.statut) {
    case 'panier':
      return `${c.articles.length} articles`;
    case 'payee':
      return `payée le ${c.date}`;
    case 'expediee':
      return `suivi ${c.suivi}`;
    case 'livree':
      return `reçue par ${c.signature}`;
    case 'annulee':
      return `annulée : ${c.raison}`;
  }
}
