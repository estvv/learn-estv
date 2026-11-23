# Boucles
> Répéter : for, while, for…of, break et continue.

@@ lesson boucles | Les boucles

### for

Trois morceaux : départ ; condition pour continuer ; ce qu'on fait après chaque tour.

```js-run
for (let i = 0; i < 3; i++) {
  console.log('tour', i);
}
```

On compte à partir de **0**, jusqu'à `< longueur`.

### while et do…while

Quand on ne sait pas combien de tours il faut :

```js-run
let n = 100;
let coups = 0;
while (n > 1) {
  n = n / 2;
  coups++;
}
console.log(coups);

let essai = 0;
do {
  essai++; // exécuté au moins une fois
} while (essai < 0);
console.log(essai);
```

### for…of : la plus utile

Parcourt les **valeurs** d'un tableau, d'un texte, d'une Map… :

```js-run
for (const fruit of ['pomme', 'kiwi']) {
  console.log(fruit);
}
for (const lettre of 'oui') console.log(lettre);

// Avec l'indice :
for (const [i, fruit] of ['pomme', 'kiwi'].entries()) {
  console.log(i, fruit);
}
```

### for…in : les clés d'un objet

```js-run
const prix = { cafe: 2, the: 3 };
for (const nom in prix) console.log(nom, prix[nom]);
```

`for…in` donne des **clés** (des textes). Ne l'utilise pas sur un tableau : c'est `for…of`.

### break et continue

```js-run
for (let i = 1; i <= 10; i++) {
  if (i % 2 === 0) continue; // passe au tour suivant
  if (i > 7) break;          // sort de la boucle
  console.log(i);
}
```

Pour sortir de deux boucles imbriquées, on peut nommer celle du dehors avec une **étiquette** :

```js-run
dehors: for (let x = 0; x < 3; x++) {
  for (let y = 0; y < 3; y++) {
    if (x * y === 2) {
      console.log('trouvé', x, y);
      break dehors;
    }
  }
}
```

> Une boucle dont la condition ne devient jamais fausse tourne à l'infini. Ici, ton code est arrêté après 6 secondes.

### En TypeScript

Rien à annoter : le type de la variable de boucle est déduit du tableau.

@@ code somme | Additionner jusqu'à n | js
`somme(n)` renvoie 1 + 2 + … + n, avec une boucle. `somme(0)` vaut `0`.
@starter
function somme(n) {
  let total = 0;
  return total;
}
@test somme(4) = 10
expect(somme(4)).toBe(10);
@test somme(100) = 5050
expect(somme(100)).toBe(5050);
@test somme(0) = 0
expect(somme(0)).toBe(0);
@test Utilise une boucle
expect($source).toMatch(/\b(for|while)\b/);
@solution
function somme(n) {
  let total = 0;
  for (let i = 1; i <= n; i++) {
    total += i;
  }
  return total;
}

@@ code fizzbuzz | FizzBuzz | js
Le grand classique. Affiche les nombres de 1 à 15, un par ligne, mais :

- `Fizz` pour les multiples de 3
- `Buzz` pour les multiples de 5
- `FizzBuzz` pour les multiples des deux
@starter
// Ton code ici
@test 15 lignes
expect($logs).toHaveLength(15);
@test Le début
expect($logs.slice(0, 5)).toEqual(['1', '2', 'Fizz', '4', 'Buzz']);
@test 15 donne FizzBuzz
expect($logs[14]).toBe('FizzBuzz');
@test Le tout
expect($logs.join(' ')).toBe('1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz');
@hint
Teste d'abord le cas « multiple de 3 **et** de 5 », sinon il ne sera jamais atteint.
@solution
for (let i = 1; i <= 15; i++) {
  if (i % 15 === 0) console.log('FizzBuzz');
  else if (i % 3 === 0) console.log('Fizz');
  else if (i % 5 === 0) console.log('Buzz');
  else console.log(i);
}

@@ code voyelles | Compter les voyelles | js
`compterVoyelles(texte)` compte les voyelles `a e i o u y`, en majuscule ou minuscule, avec `for…of`.
@starter
function compterVoyelles(texte) {
}
@test « Bonjour » en a 3
expect(compterVoyelles('Bonjour')).toBe(3);
@test Les majuscules comptent
expect(compterVoyelles('AEIOUY')).toBe(6);
@test Aucune
expect(compterVoyelles('xzt')).toBe(0);
expect(compterVoyelles('')).toBe(0);
@test Utilise `for…of`
expect($source).toMatch(/for\s*\(const \w+ of/);
@hint
`'aeiouy'.includes(lettre)` dit si la lettre est une voyelle.
@solution
function compterVoyelles(texte) {
  let total = 0;
  for (const lettre of texte.toLowerCase()) {
    if ('aeiouy'.includes(lettre)) total++;
  }
  return total;
}

@@ code triangle | Un triangle d'étoiles | js
`triangle(hauteur)` renvoie un texte avec, pour 3 :

```
*
**
***
```

Les lignes sont séparées par `'\n'`, sans retour à la ligne à la fin.
@starter
function triangle(hauteur) {
}
@test Hauteur 1
expect(triangle(1)).toBe('*');
@test Hauteur 3
expect(triangle(3)).toBe('*\n**\n***');
@test Hauteur 0 : texte vide
expect(triangle(0)).toBe('');
@hint
Construis chaque ligne avec une deuxième boucle (ou `'*'.repeat(i)`), et n'ajoute `'\n'` qu'entre les lignes.
@solution
function triangle(hauteur) {
  let texte = '';
  for (let i = 1; i <= hauteur; i++) {
    if (i > 1) texte += '\n';
    texte += '*'.repeat(i);
  }
  return texte;
}

@@ code premier | Nombre premier, en TypeScript | ts
`estPremier(n)` dit si `n` est premier (divisible seulement par 1 et lui-même ; 0 et 1 ne le sont pas). Arrête la boucle **dès que possible**. Type la fonction.
@starter
function estPremier(n) {
}
@test Petits nombres
expect([0, 1, 2, 3, 4, 5, 9, 11].map(estPremier)).toEqual([false, false, true, true, false, true, false, true]);
@test Un grand nombre premier, vite
expect(estPremier(1000000007)).toBe(true);
@test Un grand nombre composé
expect(estPremier(1000000011 * 3)).toBe(false);
@types `(n: number) => boolean`
type _ = $Expect<$Equal<typeof estPremier, (n: number) => boolean>>;
@hint
Inutile d'essayer les diviseurs au-delà de la racine de n : continue tant que `d * d <= n`.
@solution
function estPremier(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) {
    if (n % d === 0) return false;
  }
  return true;
}

@@ predict for-in
Qu'affiche ce code ?
```js
for (const x in ['a', 'b']) console.log(x);
```
@answer `0 1`
@wrong `a b`
@wrong `0 a 1 b`
@wrong Une TypeError
@why `for…in` parcourt les clés (ici les indices), `for…of` les valeurs.

@@ predict continue
Qu'affiche ce code ?
```js
for (let i = 0; i < 5; i++) {
  if (i === 1) continue;
  if (i === 3) break;
  console.log(i);
}
```
@answer `0 2`
@wrong `0 2 4`
@wrong `0 1 2`
@wrong `0`
@why `continue` saute 1, `break` sort à 3.

@@ predict do-while
Qu'affiche ce code ?
```js
let n = 5;
do { console.log(n); n++; } while (n < 5);
```
@answer `5`
@wrong Rien
@wrong `5 6`
@wrong Une boucle infinie
@why `do…while` teste après : le bloc s'exécute au moins une fois.

@@ card for-of-in
Différence entre `for…of` et `for…in` ?
@back
`for…of` : les **valeurs** d'un itérable. `for…in` : les **clés** d'un objet.

@@ card boucle-for
Écris une boucle qui compte de 0 à 9.
@back
`for (let i = 0; i < 10; i++) { … }`

@@ card break-continue
`break` et `continue` ?
@back
`break` sort de la boucle ; `continue` passe au tour suivant.

@@ defi spirale | La spirale | js
`spirale(n)` renvoie un tableau de `n` lignes de `n` nombres, remplies de 1 à n² en spirale depuis le coin en haut à gauche, dans le sens des aiguilles d'une montre. Pour 3 :

```
1 2 3
8 9 4
7 6 5
```
@starter
function spirale(n) {
}
@test 1, 2 et 3
expect([spirale(1), spirale(2), spirale(3)]).toEqual([[[1]], [[1, 2], [4, 3]], [[1, 2, 3], [8, 9, 4], [7, 6, 5]]]);
@test 4
expect(spirale(4)).toEqual([[1, 2, 3, 4], [12, 13, 14, 5], [11, 16, 15, 6], [10, 9, 8, 7]]);
@test 0
expect(spirale(0)).toEqual([]);
@hint
Garde une position et une direction. Quand la case suivante est hors de la grille ou déjà remplie, tourne à droite.
@solution
function spirale(n) {
  const grille = Array.from({ length: n }, () => new Array(n).fill(0));
  let [l, c, dl, dc] = [0, 0, 0, 1];
  for (let k = 1; k <= n * n; k++) {
    grille[l][c] = k;
    if (grille[l + dl]?.[c + dc] !== 0) [dl, dc] = [dc, -dl];
    l += dl;
    c += dc;
  }
  return grille;
}
