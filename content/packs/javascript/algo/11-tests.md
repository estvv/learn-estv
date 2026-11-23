# Tests et qualité
> Écrire des tests qui trouvent vraiment les bugs.

@@ lesson tester | Bien tester

Un test a trois temps : **préparer**, **agir**, **vérifier**.

```ts-run
function remise(prix: number, taux: number): number {
  return Math.round(prix * (1 - taux) * 100) / 100;
}
function verifier(nom: string, ok: boolean): void {
  console.log(ok ? '✓' : '✗', nom);
}
verifier('applique le taux', remise(100, 0.2) === 80);
verifier('arrondit au centime', remise(9.99, 0.333) === 6.66);
verifier('aucune remise', remise(50, 0) === 50);
```

### Quoi tester ?

- Le cas **normal**, une fois.
- Les **bords** : vide, un seul, zéro, négatif, très grand, doublons, égalités, `null`.
- Les **erreurs** attendues.
- Chaque **bug trouvé** : écris d'abord le test qui échoue, puis corrige.

Teste le **comportement** visible, pas la façon dont c'est écrit : un bon test survit à une réécriture.

### TDD

**Rouge** (un test qui échoue) → **vert** (le code le plus simple) → **nettoyer**. Puis recommencer.

### Doublures

Pour isoler : un **stub** renvoie des valeurs choisies, un **espion** (*spy*) note les appels, un **faux** (*fake*) est une vraie version simplifiée (une base en mémoire). Préfère les faux : ils cassent moins.

### Tests par propriétés

Plutôt que des exemples, vérifier une **règle** sur des entrées au hasard : « trier deux fois donne la même chose », « décoder(encoder(x)) vaut x ».

### Couverture

100 % de lignes exécutées ne veut pas dire 100 % vérifiées. La vraie question : **si je casse le code, un test échoue-t-il ?** (C'est le *mutation testing*, et le principe des exercices suivants.)

@@ code trouver-bugs | Tester une fonction | js
Écris `tester(limiter)`, qui lance une erreur si la fonction reçue est **fausse**, et ne fait rien si elle est juste. La règle : `limiter(x, min, max)` renvoie `x` ramené entre `min` et `max` compris.

Tes tests seront essayés sur une bonne version… et sur **cinq mauvaises**.
@starter
function verifier(condition, message) {
  if (!condition) throw new Error(message);
}

function tester(limiter) {
  verifier(limiter(5, 0, 10) === 5, 'au milieu');
}
@test Accepte une bonne version
tester((x, a, b) => Math.min(Math.max(x, a), b)); tester((x, a, b) => (x < a ? a : x > b ? b : x));
@test Trouve un minimum oublié
expect(() => tester((x, a, b) => Math.min(x, b))).toThrow();
@test Trouve un maximum oublié
expect(() => tester((x, a, b) => Math.max(x, a))).toThrow();
@test Trouve des bornes inversées
expect(() => tester((x, a, b) => (x < a ? b : x > b ? a : x))).toThrow();
@test Trouve une borne décalée
expect(() => tester((x, a, b) => (x < a ? a : x >= b ? b - 1 : x))).toThrow();
@test Trouve un problème avec zéro
expect(() => tester((x, a, b) => Math.min(Math.max(x, a), b) || a)).toThrow();
@hint
Teste : sous le minimum, au-dessus du maximum, **exactement** sur chaque borne, et un résultat de 0 avec un minimum négatif.
@solution
function verifier(condition, message) {
  if (!condition) throw new Error(message);
}

function tester(limiter) {
  verifier(limiter(5, 0, 10) === 5, 'au milieu');
  verifier(limiter(-3, 1, 10) === 1, 'sous le minimum');
  verifier(limiter(50, 0, 10) === 10, 'au-dessus du maximum');
  verifier(limiter(0, 0, 10) === 0, 'sur le minimum');
  verifier(limiter(10, 0, 10) === 10, 'sur le maximum');
  verifier(limiter(0, -5, 5) === 0, 'zéro au milieu');
  verifier(limiter(4, -5, 5) === 4, 'minimum négatif');
}

@@ code espion | Un espion | ts
`espionner(f)` renvoie une fonction de même signature, qui appelle `f` et note chaque appel dans sa propriété `appels` : `{ args, resultat }`, ou `{ args, erreur }` si `f` a lancé une erreur (relancée). `remettre()` vide les appels.
@starter

@test Note les appels
const f = espionner((a, b) => a + b); expect(f(1, 2)).toBe(3); f(5, 5); expect(f.appels).toEqual([{ args: [1, 2], resultat: 3 }, { args: [5, 5], resultat: 10 }]);
@test Note les erreurs et les relance
const e = new Error('x'); const f = espionner(() => { throw e; }); expect(() => f()).toThrow('x'); expect(f.appels[0].erreur).toBe(e);
@test Remettre
const f = espionner(() => 1); f(); f.remettre(); expect(f.appels).toEqual([]); f(); expect(f.appels).toHaveLength(1);
@types Garde la signature
const f = espionner((a: number, b: string) => a > b.length); const r: boolean = f(1, 'a');
// @ts-expect-error
f('a', 1);
const n: number = f.appels[0].args[0];
@solution
type Appel<A extends unknown[], R> =
  | { args: A; resultat: R }
  | { args: A; erreur: unknown };

interface Espion<A extends unknown[], R> {
  (...args: A): R;
  appels: Appel<A, R>[];
  remettre(): void;
}

function espionner<A extends unknown[], R>(f: (...args: A) => R): Espion<A, R> {
  const espion: Espion<A, R> = Object.assign(
    (...args: A): R => {
      try {
        const resultat = f(...args);
        espion.appels.push({ args, resultat });
        return resultat;
      } catch (erreur) {
        espion.appels.push({ args, erreur });
        throw erreur;
      }
    },
    {
      appels: [] as Appel<A, R>[],
      remettre() {
        espion.appels = [];
      },
    },
  );
  return espion;
}

@@ code proprietes | Tests par propriétés | ts
`pourTout(generer, propriete, essais = 100)` appelle `propriete(generer(hasard))` autant de fois. Si elle renvoie `false` ou lance une erreur, lance une `Error` dont le message contient la valeur fautive en JSON. `hasard` est une fonction qui renvoie un nombre dans [0, 1[ : reçois-la en **4e paramètre** (`Math.random` par défaut).

Écris aussi `entier(min, max)` et `liste(generer, maxTaille)`, des générateurs `(hasard) => valeur` (bornes comprises).
@starter
type Hasard = () => number;

@test Une propriété vraie
let n = 0; pourTout(entier(0, 10), (x) => { n++; return x >= 0 && x <= 10 && Number.isInteger(x); }, 50); expect(n).toBe(50);
@test Une propriété fausse
expect(() => pourTout(entier(5, 5), (x) => x !== 5)).toThrow('5'); expect(() => pourTout(liste(entier(1, 1), 0), () => { throw new Error('x'); })).toThrow('[]');
@test Bornes atteintes
expect([entier(1, 6)(() => 0), entier(1, 6)(() => 0.999)]).toEqual([1, 6]); expect(liste(entier(1, 1), 3)(() => 0.999)).toEqual([1, 1, 1]); expect(liste(entier(1, 1), 3)(() => 0)).toEqual([]);
@test Hasard choisi
const l = []; pourTout(entier(0, 9), (x) => { l.push(x); return true; }, 2, () => 0.5); expect(l).toEqual([5, 5]);
@test Trouve un vrai bug
const triBug = (l) => [...new Set(l)].sort((a, b) => a - b); expect(() => pourTout(liste(entier(0, 3), 8), (l) => triBug(l).length === l.length, 300)).toThrow();
@types Types suivis
pourTout(liste(entier(0, 1), 3), (l) => l.every((x) => x.toFixed() !== ''));
@solution
type Hasard = () => number;
type Generateur<T> = (hasard: Hasard) => T;

function entier(min: number, max: number): Generateur<number> {
  return (hasard) => min + Math.floor(hasard() * (max - min + 1));
}

function liste<T>(generer: Generateur<T>, maxTaille: number): Generateur<T[]> {
  return (hasard) => Array.from({ length: entier(0, maxTaille)(hasard) }, () => generer(hasard));
}

function pourTout<T>(
  generer: Generateur<T>,
  propriete: (valeur: T) => boolean | void,
  essais = 100,
  hasard: Hasard = Math.random,
): void {
  for (let i = 0; i < essais; i++) {
    const valeur = generer(hasard);
    let cause: unknown;
    try {
      if (propriete(valeur) !== false) continue;
    } catch (e) {
      cause = e;
    }
    throw new Error(`Faux pour ${JSON.stringify(valeur)}`, { cause });
  }
}

@@ defi rechercher-bugs | Les bugs cachés | js
`tester(panier)` reçoit une **fabrique** `creerPanier()` et doit accepter toute version juste et refuser les fausses. Les règles :

- `ajouter(nom, prix, quantite = 1)` : cumule les quantités d'un même nom ; prix négatif ou quantité non entière ou < 1 → erreur, **sans rien changer**
- `retirer(nom)` : retire **un** exemplaire ; nom inconnu → rien
- `total()` : arrondi au centime
- `articles()` : une **copie** `[{ nom, prix, quantite }]`
@starter
function verifier(condition, message) {
  if (!condition) throw new Error(message);
}

function tester(creerPanier) {
  const p = creerPanier();
  p.ajouter('a', 10);
  verifier(p.total() === 10, 'un article');
}
@setup
globalThis.$panier = (bug) => () => {
  const l = [];
  return {
    ajouter(nom, prix, quantite = bug === 'defaut' ? 0 : 1) {
      if (bug !== 'negatif' && prix < 0) throw new Error('prix');
      if (bug === 'trop-tard') l.push({ nom, prix, quantite });
      if (bug !== 'quantite' && quantite < 1) throw new Error('quantite');
      if (bug !== 'entier' && !Number.isInteger(quantite)) throw new Error('quantite');
      if (bug === 'trop-tard') return;
      const x = l.find((y) => y.nom === nom);
      if (x && bug !== 'cumul') { if (bug === 'remplace') x.quantite = quantite; else x.quantite += quantite; } else l.push({ nom, prix, quantite });
    },
    retirer(nom) {
      const i = l.findIndex((y) => y.nom === nom);
      if (i < 0) { if (bug === 'inconnu') l.pop(); return; }
      if (bug === 'tout') return void l.splice(i, 1);
      l[i].quantite--;
      if (l[i].quantite === 0 && bug !== 'zero') l.splice(i, 1);
    },
    total() {
      const s = l.reduce((a, x) => a + x.prix * (bug === 'sans-quantite' ? 1 : x.quantite), 0);
      return bug === 'arrondi' ? s : Math.round(s * 100) / 100;
    },
    articles: () => (bug === 'copie' ? l : l.map((x) => (bug === 'copie2' ? x : { ...x }))),
  };
};
@test Accepte une bonne version
tester($panier(null));
@test Trouve les erreurs de calcul
for (const b of ['sans-quantite', 'arrondi', 'defaut']) expect(() => tester($panier(b)), b).toThrow();
@test Trouve les erreurs d'ajout
for (const b of ['cumul', 'remplace', 'negatif', 'quantite', 'entier']) expect(() => tester($panier(b)), b).toThrow();
@test Trouve les erreurs de retrait
for (const b of ['inconnu', 'tout', 'zero']) expect(() => tester($panier(b)), b).toThrow();
@test Trouve les erreurs plus sournoises
for (const b of ['copie', 'copie2', 'trop-tard']) expect(() => tester($panier(b)), b).toThrow();
@hint
Pour « copie » : modifie le tableau renvoyé par `articles()` **et** un de ses objets, puis vérifie que le panier n'a pas bougé.
@solution
function verifier(condition, message) {
  if (!condition) throw new Error(message);
}

function refuse(f, message) {
  let lancee = false;
  try {
    f();
  } catch {
    lancee = true;
  }
  verifier(lancee, message);
}

function tester(creerPanier) {
  const decrire = (p) => JSON.stringify(p.articles().map((a) => [a.nom, a.prix, a.quantite]));

  const p = creerPanier();
  p.ajouter('a', 10);
  verifier(p.total() === 10, 'un article');
  p.ajouter('a', 10, 2);
  p.ajouter('b', 1);
  verifier(decrire(p) === '[["a",10,3],["b",1,1]]', 'cumul');
  verifier(p.total() === 31, 'total avec quantités');

  refuse(() => p.ajouter('c', -1), 'prix négatif');
  refuse(() => p.ajouter('c', 1, 0), 'quantité nulle');
  refuse(() => p.ajouter('c', 1, 1.5), 'quantité décimale');
  verifier(decrire(p) === '[["a",10,3],["b",1,1]]', 'un refus ne change rien');

  p.retirer('inconnu');
  verifier(p.articles().length === 2, 'retrait inconnu');
  p.retirer('a');
  p.retirer('b');
  verifier(decrire(p) === '[["a",10,2]]', 'retraits');

  p.articles().pop();
  for (const a of p.articles()) a.quantite = 99;
  verifier(decrire(p) === '[["a",10,2]]', 'articles est une copie');

  const q = creerPanier();
  q.ajouter('x', 0.1, 3);
  verifier(q.total() === 0.3, 'arrondi');
}

@@ predict couverture
100 % de couverture garantit :
@answer Que chaque ligne a été exécutée, rien de plus
@wrong Qu'il n'y a pas de bug
@wrong Que chaque cas est vérifié
@wrong Que le code est lisible
@why Une ligne peut être exécutée sans que son résultat soit vérifié.

@@ predict tdd
L'ordre du TDD ?
@answer Test qui échoue, code, nettoyage
@wrong Code, test, nettoyage
@wrong Nettoyage, test, code
@wrong Test, nettoyage, code
@why Rouge, vert, refactor.

@@ card bords
Quels cas tester en plus du cas normal ?
@back
Les bords (vide, un seul, zéro, limites, doublons, égalités) et les erreurs attendues.

@@ card bug-test
Que faire en premier quand on trouve un bug ?
@back
Écrire un test qui échoue à cause de lui.
