# Portée et closures
> Où vit une variable, et comment une fonction s'en souvient.

@@ lesson portee | Portée

Trois portées : **globale**, **de fonction**, **de bloc** (`{ }`). Une variable est visible dans sa portée et dans celles qu'elle contient. JavaScript cherche un nom de l'intérieur vers l'extérieur.

```js-run
const a = 'dehors';
function f() {
  const b = 'dedans';
  if (true) {
    const a = 'bloc'; // masque l'autre a (shadowing)
    console.log(a, b);
  }
  console.log(a);
}
f();
```

### La zone morte

`let` et `const` existent dès le début du bloc, mais y toucher avant leur ligne est une erreur (*temporal dead zone*) :

```js-run
try {
  console.log(x);
} catch (e) {
  console.log(e.message);
}
let x = 1;
```

### Pourquoi éviter var

`var` ignore les blocs (portée de **fonction**) et vaut `undefined` avant sa ligne :

```js-run
console.log(v);
for (var i = 0; i < 2; i++) { var v = 'encore là'; }
console.log(v, i);
```

@@ lesson closures | Closures

Une fonction garde l'accès aux variables qui l'entouraient **là où elle a été écrite**, même après la fin de la fonction englobante. C'est une **closure** (fermeture).

```js-run
function creerCompteur() {
  let n = 0; // privée : personne d'autre n'y accède
  return () => {
    n++;
    return n;
  };
}
const c1 = creerCompteur();
const c2 = creerCompteur(); // un autre n, indépendant
console.log(c1(), c1(), c1(), c2());
```

La closure garde la **variable**, pas une copie de sa valeur :

```js-run
let nom = 'Ada';
const dire = () => nom;
nom = 'Grace';
console.log(dire());
```

### Le piège classique

`let` crée une nouvelle variable **à chaque tour** de boucle ; `var`, une seule pour toute la boucle :

```js-run
const avecVar = [];
for (var i = 0; i < 3; i++) avecVar.push(() => i);
const avecLet = [];
for (let j = 0; j < 3; j++) avecLet.push(() => j);
console.log(avecVar.map((f) => f()), avecLet.map((f) => f()));
```

### À quoi ça sert

Données privées, fonctions préconfigurées, mémorisation, `debounce`…

```js-run
function memoriser(f) {
  const cache = new Map();
  return (x) => {
    if (!cache.has(x)) cache.set(x, f(x));
    return cache.get(x);
  };
}
const carre = memoriser((n) => { console.log('calcul'); return n * n; });
console.log(carre(4), carre(4));
```

### En TypeScript

Rien de spécial, on type la fonction renvoyée :

```ts-run
function creerCompteur(depart = 0): () => number {
  let n = depart;
  return () => ++n;
}
console.log(creerCompteur(10)());
```

@@ code compte | Compte bancaire privé | js
`creerCompte(solde = 0)` renvoie un objet avec les méthodes `deposer(n)`, `retirer(n)` et `solde()`. `retirer` renvoie `true`, ou `false` (sans rien faire) si l'argent manque. Le solde ne doit être accessible **que** par ces méthodes.
@starter
function creerCompte(solde = 0) {
}
@test Dépose et retire
const c = creerCompte(10); c.deposer(5); expect(c.retirer(12)).toBe(true); expect(c.solde()).toBe(3);
@test Refuse un découvert
const c = creerCompte(10); expect(c.retirer(11)).toBe(false); expect(c.solde()).toBe(10);
@test Comptes indépendants, vide par défaut
const a = creerCompte(); const b = creerCompte(); a.deposer(5); expect([a.solde(), b.solde()]).toEqual([5, 0]);
@test Seulement des fonctions dans l'objet
expect(Object.values(creerCompte(3)).every((v) => typeof v === 'function')).toBe(true);
@hint
La méthode `solde` et la variable `solde` peuvent porter le même nom : `{ solde: () => solde }`.
@solution
function creerCompte(solde = 0) {
  return {
    deposer(n) {
      solde += n;
    },
    retirer(n) {
      if (n > solde) return false;
      solde -= n;
      return true;
    },
    solde: () => solde,
  };
}

@@ code une-fois | Une seule fois | js
`uneFois(f)` renvoie une fonction qui appelle `f` la première fois (avec les arguments reçus), puis redonne **toujours le même résultat** sans rappeler `f`.
@starter
function uneFois(f) {
}
@test N'appelle `f` qu'une fois
let n = 0; const g = uneFois(() => { n++; return 'ok'; }); g(); g(); g(); expect(n).toBe(1);
@test Redonne le premier résultat
const g = uneFois((a, b) => a + b); expect([g(1, 2), g(10, 20)]).toEqual([3, 3]);
@test Marche aussi si `f` renvoie `undefined`
let n = 0; const g = uneFois(() => { n++; }); g(); g(); expect(n).toBe(1);
@hint
Deux variables dans la closure : `faite` (booléen) et `resultat`.
@solution
function uneFois(f) {
  let faite = false;
  let resultat;
  return (...args) => {
    if (!faite) {
      faite = true;
      resultat = f(...args);
    }
    return resultat;
  };
}

@@ code curry | Curry | js
`curry(f)` transforme une fonction à plusieurs paramètres en une fonction qu'on peut appeler par morceaux : `curry((a, b, c) => …)` s'utilise `g(1)(2)(3)`, `g(1, 2)(3)` ou `g(1, 2, 3)`. Indice : `f.length` est le nombre de paramètres de `f`.
@starter
function curry(f) {
}
@test Un par un
expect(curry((a, b, c) => a + b + c)(1)(2)(3)).toBe(6);
@test Par groupes
const g = curry((a, b, c) => [a, b, c]); expect(g(1, 2)(3)).toEqual([1, 2, 3]); expect(g(1)(2, 3)).toEqual([1, 2, 3]);
@test D'un coup
expect(curry((a, b) => a * b)(6, 7)).toBe(42);
@test Réutilisable
const plus = curry((a, b) => a + b)(10); expect([plus(1), plus(2)]).toEqual([11, 12]);
@hint
Écris une fonction interne qui reçoit les arguments déjà donnés : s'il y en a assez, appelle `f`, sinon renvoie une fonction qui en attend d'autres.
@solution
function curry(f) {
  const suite = (...recus) => (recus.length >= f.length
    ? f(...recus)
    : (...autres) => suite(...recus, ...autres));
  return suite;
}

@@ code memo-ts | Mémoriser, en TypeScript | ts
`memoriser(f)` accepte une fonction `(n: number) => number` et renvoie une version qui ne calcule qu'une fois par argument. Attention aux résultats falsy.
@starter
function memoriser(f) {
}
@test Même résultat
expect(memoriser((n) => n * 2)(4)).toBe(8);
@test Ne recalcule pas
let n = 0; const g = memoriser((x) => { n++; return x; }); g(1); g(1); g(2); expect(n).toBe(2);
@test Un résultat de 0 est mémorisé aussi
let n = 0; const g = memoriser(() => { n++; return 0; }); g(1); g(1); expect(n).toBe(1);
@types Signature
type _ = $Expect<$Equal<typeof memoriser, (f: (n: number) => number) => (n: number) => number>>;
@solution
function memoriser(f: (n: number) => number): (n: number) => number {
  const cache = new Map<number, number>();
  return (n) => {
    const connu = cache.get(n);
    if (connu !== undefined) return connu;
    const resultat = f(n);
    cache.set(n, resultat);
    return resultat;
  };
}

@@ predict var-boucle
Qu'affiche ce code ?
```js
const fs = [];
for (var i = 0; i < 2; i++) fs.push(() => i);
console.log(fs[0](), fs[1]());
```
@answer `2 2`
@wrong `0 1`
@wrong `1 1`
@wrong `0 0`
@why `var` crée une seule variable, qui vaut 2 à la fin. Avec `let` : 0 1.

@@ predict tdz
Qu'affiche ce code ?
```js
let x = 1;
{
  console.log(x);
  let x = 2;
}
```
@answer Une ReferenceError
@wrong `1`
@wrong `undefined`
@wrong `2`
@why Le `x` du bloc masque l'autre dès le début du bloc, mais il est encore dans sa zone morte.

@@ predict closure-variable
Qu'affiche ce code ?
```js
let n = 1;
const f = () => n * 10;
n = 5;
console.log(f());
```
@answer `50`
@wrong `10`
@wrong `undefined`
@wrong `5`
@why Une closure garde la variable, pas la valeur du moment.

@@ card closure
Qu'est-ce qu'une closure ?
@back
Une fonction qui garde l'accès aux variables de l'endroit où elle a été écrite, même après la fin de la fonction englobante.

@@ card var
Deux différences entre `var` et `let` ?
@back
`var` a une portée de fonction (pas de bloc) et vaut `undefined` avant sa ligne ; `let` est inaccessible avant.

@@ defi limiteur | throttle et jetons | js
- `throttle(f, ms, maintenant = Date.now)` : appelle `f` au plus une fois par `ms` ; les appels en trop sont **ignorés**. Renvoie le dernier résultat connu.
- `jetons(max, parSeconde, maintenant = Date.now)` : un limiteur. `prendre()` renvoie `true` s'il reste un jeton (et le consomme). Le seau démarre plein et se remplit **en continu**, sans dépasser `max`.

`maintenant` est une fonction qui donne l'heure en ms.
@starter

@test `throttle`
let t = 0; let n = 0; const f = throttle((x) => { n++; return x; }, 100, () => t); const r = [f('a'), f('b')]; t = 99; r.push(f('c')); t = 100; r.push(f('d')); expect([n, r]).toEqual([2, ['a', 'a', 'a', 'd']]);
@test `jetons` : se vide
let t = 0; const j = jetons(2, 1, () => t); expect([j.prendre(), j.prendre(), j.prendre()]).toEqual([true, true, false]);
@test Se remplit en continu
let t = 0; const j = jetons(1, 2, () => t); j.prendre(); t = 250; expect(j.prendre()).toBe(false); t = 500; expect(j.prendre()).toBe(true); t = 750; expect(j.prendre()).toBe(false); t = 1000; expect(j.prendre()).toBe(true);
@test Ne dépasse pas le maximum
let t = 0; const j = jetons(2, 10, () => t); t = 100_000; expect([j.prendre(), j.prendre(), j.prendre()]).toEqual([true, true, false]);
@solution
function throttle(f, ms, maintenant = Date.now) {
  let dernier = -Infinity;
  let resultat;
  return (...args) => {
    const t = maintenant();
    if (t - dernier >= ms) {
      dernier = t;
      resultat = f(...args);
    }
    return resultat;
  };
}

function jetons(max, parSeconde, maintenant = Date.now) {
  let reste = max;
  let date = maintenant();
  return {
    prendre() {
      const t = maintenant();
      reste = Math.min(max, reste + ((t - date) / 1000) * parSeconde);
      date = t;
      if (reste < 1) return false;
      reste--;
      return true;
    },
  };
}
