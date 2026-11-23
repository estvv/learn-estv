# Fonctions
> Déclarer, renvoyer, passer une fonction à une autre.

@@ lesson declarer | Déclarer une fonction

```js-run
// Déclaration
function additionner(a, b) {
  return a + b;
}

// Expression : une fonction dans une variable
const soustraire = function (a, b) {
  return a - b;
};

// Fonction fléchée
const multiplier = (a, b) => {
  return a * b;
};

// Fléchée courte : la valeur est renvoyée sans return
const doubler = (n) => n * 2;

console.log(additionner(2, 3), soustraire(5, 1), multiplier(2, 4), doubler(21));
```

- Les **paramètres** sont les noms entre parenthèses ; les **arguments**, les valeurs données à l'appel.
- `return` renvoie une valeur **et** arrête la fonction. Sans `return`, la fonction renvoie `undefined`.
- Une déclaration `function` est utilisable avant sa ligne (*hoisting*) ; `const f = …`, non.
- Pour renvoyer un objet avec une fléchée courte, entoure-le de parenthèses : `() => ({ a: 1 })`.

### Paramètres

```js-run
function saluer(nom = 'inconnu', ...autres) { // défaut, et « reste »
  console.log(nom, autres);
}
saluer();
saluer('Ada', 'Grace', 'Linus');

const notes = [12, 15, 9];
console.log(Math.max(...notes)); // « spread » : étale un tableau en arguments
```

JavaScript n'exige pas le bon nombre d'arguments : ceux qui manquent valent `undefined`, ceux en trop sont ignorés. TypeScript, lui, refuse.

### Portée

Une variable n'existe que dans le bloc `{ }` où elle est déclarée. Une fonction voit aussi les variables **autour** d'elle :

```js-run
const tva = 0.2;
function ttc(prix) {
  const total = prix * (1 + tva); // voit tva
  return total;
}
console.log(ttc(100));
console.log(typeof total); // total n'existe pas ici
```

### En TypeScript

Annote les paramètres (obligatoire) et le retour (conseillé). `?` rend un paramètre facultatif, `void` veut dire « ne renvoie rien d'utile » :

```ts-run
function saluer(nom: string, politesse?: string): string {
  return `${politesse ?? 'Salut'} ${nom}`;
}
const moyenne = (...notes: number[]): number => notes.reduce((a, b) => a + b, 0) / notes.length;
function afficher(x: unknown): void {
  console.log(x);
}
afficher(saluer('Ada'));
afficher(moyenne(10, 20));
```

@@ lesson callbacks | Les fonctions sont des valeurs

On peut ranger une fonction dans une variable, la passer en argument, la renvoyer. Une fonction passée à une autre s'appelle un **callback** :

```js-run
function repeter(fois, action) {
  for (let i = 0; i < fois; i++) action(i);
}
repeter(3, (i) => console.log('tour', i));
```

Attention : `action` **est** la fonction, `action()` **l'appelle**.

```js-run
const dire = () => 'salut';
console.log(dire);
console.log(dire());
```

Une fonction qui reçoit ou renvoie une fonction est dite **d'ordre supérieur** :

```js-run
const multiplierPar = (facteur) => (n) => n * facteur;
const tripler = multiplierPar(3);
console.log(tripler(5), multiplierPar(10)(5));
```

### Récursion

Une fonction peut s'appeler elle-même. Il faut toujours un **cas d'arrêt** :

```js-run
function factorielle(n) {
  if (n <= 1) return 1;
  return n * factorielle(n - 1);
}
console.log(factorielle(5));
```

### En TypeScript

Le type d'une fonction s'écrit comme une fléchée : `(a: number) => string`.

```ts-run
type Operation = (a: number, b: number) => number;

function appliquer(a: number, b: number, op: Operation): number {
  return op(a, b);
}
console.log(appliquer(6, 7, (x, y) => x * y)); // x et y : types déduits
```

@@ code trois-ecritures | Trois écritures | js
Écris trois fonctions qui font la même chose (renvoyer le carré d'un nombre) :

- `carre1` : déclaration `function`
- `carre2` : fléchée avec accolades et `return`
- `carre3` : fléchée courte, sans `return`
@starter

@test `carre1`
expect(carre1(4)).toBe(16);
expect($source).toMatch(/function carre1\s*\(/);
@test `carre2`
expect(carre2(5)).toBe(25);
expect($source).toMatch(/carre2 = \(?\w+\)? => \{/);
@test `carre3`
expect(carre3(6)).toBe(36);
expect($source).toMatch(/carre3 = \(?\w+\)? => [^{\s]/);
@solution
function carre1(n) {
  return n * n;
}

const carre2 = (n) => {
  return n * n;
};

const carre3 = (n) => n * n;

@@ code moyenne | Paramètres souples | js
`moyenne(...)` accepte autant de nombres qu'on veut et renvoie leur moyenne ; `0` sans argument.
@starter
function moyenne() {
}
@test Plusieurs nombres
expect(moyenne(10, 20)).toBe(15);
expect(moyenne(1, 2, 3, 4)).toBe(2.5);
@test Un seul
expect(moyenne(7)).toBe(7);
@test Aucun
expect(moyenne()).toBe(0);
@hint
`function moyenne(...nombres)` : `nombres` est alors un tableau, avec sa `length`.
@solution
function moyenne(...nombres) {
  if (nombres.length === 0) return 0;
  let total = 0;
  for (const n of nombres) total += n;
  return total / nombres.length;
}

@@ code compter-si | Ton premier callback | js
`compterSi(liste, test)` renvoie le nombre d'éléments pour lesquels `test(element)` est vrai. Avec une boucle.
@starter
function compterSi(liste, test) {
}
@test Compte les nombres positifs
expect(compterSi([1, -2, 3], (n) => n > 0)).toBe(2);
@test Compte les textes longs
expect(compterSi(['a', 'abc', 'abcd'], (t) => t.length > 2)).toBe(2);
@test Liste vide
expect(compterSi([], () => true)).toBe(0);
@solution
function compterSi(liste, test) {
  let total = 0;
  for (const element of liste) {
    if (test(element)) total++;
  }
  return total;
}

@@ code composer | Composer deux fonctions | js
`composer(f, g)` renvoie une **nouvelle fonction** qui applique `f`, puis `g` au résultat.
@starter
function composer(f, g) {
}
@test Renvoie une fonction
expect(composer((x) => x, (x) => x)).toBeTypeOf('function');
@test Applique f, puis g
expect(composer((n) => n + 1, (n) => n * 10)(2)).toBe(30);
@test Dans le bon ordre
expect(composer((s) => s.trim(), (s) => s + '!')(' ok ')).toBe('ok!');
@hint
`return (x) => …` : quelle est la valeur donnée à `g` ?
@solution
function composer(f, g) {
  return (x) => g(f(x));
}

@@ code puissance | Récursion, en TypeScript | ts
`puissance(base, exposant = 2)` calcule la puissance **par récursion** (ni boucle, ni `**`, ni `Math.pow`), pour un exposant entier positif ou nul. `exposant` vaut 2 par défaut.
@starter
function puissance() {
}
@test Cas simples
expect(puissance(2, 10)).toBe(1024);
expect(puissance(5, 1)).toBe(5);
@test Exposant 0
expect(puissance(7, 0)).toBe(1);
@test Carré par défaut
expect(puissance(9)).toBe(81);
@test Ni boucle ni opérateur tout fait
expect($source).not.toMatch(/\*\*|Math|for|while/);
@types Bien typée
const r: number = puissance(2, 3); puissance(2);
@types Refuse du texte
// @ts-expect-error
puissance('2');
@hint
x^n, c'est x multiplié par x^(n-1). Et x^0 vaut 1 : c'est le cas d'arrêt.
@solution
function puissance(base: number, exposant: number = 2): number {
  if (exposant === 0) return 1;
  return base * puissance(base, exposant - 1);
}

@@ predict sans-return
Qu'affiche ce code ?
```js
const f = (n) => { n * 2; };
console.log(f(4));
```
@answer `undefined`
@wrong `8`
@wrong `4`
@wrong Une SyntaxError
@why Avec des accolades, il faut un `return`.

@@ predict objet-flechee
Qu'affiche ce code ?
```js
const f = () => { a: 1 };
console.log(f());
```
@answer `undefined`
@wrong `{ a: 1 }`
@wrong `1`
@wrong Une TypeError
@why Les accolades sont lues comme un bloc (et `a:` comme une étiquette). Il faut `() => ({ a: 1 })`.

@@ predict defaut
Qu'affiche ce code ?
```js
const f = (a = 1, b = a + 1) => a + b;
console.log(f(undefined), f(5), f(null, 3));
```
@answer `3 11 3`
@wrong `NaN 11 3`
@wrong `3 11 4`
@wrong `3 6 3`
@why La valeur par défaut sert pour `undefined` seulement ; `null` reste `null`, qui vaut 0 dans une addition.

@@ predict hoisting
Qu'affiche ce code ?
```js
console.log(f());
function f() { return 'ok'; }
```
@answer `ok`
@wrong Une ReferenceError
@wrong `undefined`
@wrong Une TypeError
@why Les déclarations `function` sont remontées en haut de leur portée.

@@ card flechee-objet
Comment une fléchée courte renvoie-t-elle un objet ?
@back
Entre parenthèses : `() => ({ a: 1 })`

@@ card rest
Comment recevoir un nombre quelconque d'arguments ?
@back
Paramètre *rest* : `function f(...valeurs) {}` — `valeurs` est un tableau.

@@ card callback
Qu'est-ce qu'un callback ?
@back
Une fonction passée en argument à une autre, qui l'appellera.

@@ card type-fonction
Écris le type TypeScript d'une fonction qui prend un nombre et renvoie du texte.
@back
`(n: number) => string`

@@ defi tuyau | Tuyau et répétition | js
- `tuyau(...fonctions)` : une fonction qui les applique de gauche à droite ; sans fonction, elle renvoie son argument. La **première** peut recevoir plusieurs arguments.
- `fois(n, f)` : une fonction qui applique `f` `n` fois de suite (`fois(0, f)` renvoie son argument).
- `inverser(f)` : `f` avec ses arguments dans l'ordre inverse.
@starter

@test `tuyau`
expect([tuyau((a, b) => a + b, (n) => n * 2, String)(1, 2), tuyau()(5)]).toEqual(['6', 5]);
@test `fois`
expect([fois(3, (n) => n * 2)(1), fois(0, (n) => n * 2)(7)]).toEqual([8, 7]);
@test `inverser`
expect(inverser((a, b, c) => [a, b, c])(1, 2, 3)).toEqual([3, 2, 1]);
@test Combinés
expect(tuyau(inverser((a, b) => a - b), fois(2, (n) => n + 1))(2, 10)).toBe(10);
@solution
const tuyau = (premiere = (x) => x, ...suite) => (...args) => {
  let valeur = premiere(...args);
  for (const f of suite) valeur = f(valeur);
  return valeur;
};

const fois = (n, f) => (x) => {
  let valeur = x;
  for (let i = 0; i < n; i++) valeur = f(valeur);
  return valeur;
};

const inverser = (f) => (...args) => f(...args.reverse());
