# Chaînes de caractères
> Chercher, découper, transformer du texte.

@@ lesson chaines | Travailler avec du texte

Une chaîne est **immuable** : aucune méthode ne la modifie, toutes renvoient une **nouvelle** chaîne.

```js-run
const mot = 'bonjour';
mot.toUpperCase();        // résultat perdu
console.log(mot);
console.log(mot.toUpperCase());
```

### Accéder

```js-run
const s = 'JavaScript';
console.log(s.length, s[0], s.at(-1)); // at accepte les indices négatifs
console.log(s[99]);                    // undefined
```

### Chercher

```js-run
const s = 'le chat et le chien';
console.log(s.includes('chat'), s.startsWith('le'), s.endsWith('n'));
console.log(s.indexOf('le'), s.lastIndexOf('le'), s.indexOf('zut')); // -1 : absent
```

### Découper et assembler

```js-run
const s = 'JavaScript';
console.log(s.slice(0, 4), s.slice(4), s.slice(-6)); // fin non comprise
console.log('a,b,c'.split(','), 'abc'.split(''));
console.log(['2026', '11', '23'].join('-'));
```

### Transformer

```js-run
console.log('  espaces  '.trim(), '|');
console.log('a-b-c'.replace('-', '+'), 'a-b-c'.replaceAll('-', '+'));
console.log('7'.padStart(3, '0'), 'ok'.padEnd(5, '.'), 'ha'.repeat(3));
console.log('été'.localeCompare('zoo')); // négatif : avant dans le dictionnaire
```

`replace` et `replaceAll` acceptent aussi une **fonction**, appelée pour chaque trouvaille :

```js-run
console.log('2 pommes, 3 kiwis'.replace(/\d+/g, (n) => n * 10));
```

### Unicode

`length` compte des unités de 16 bits : un emoji en prend souvent deux. `[...texte]` découpe en vrais caractères :

```js-run
console.log('👍'.length, [...'👍'].length);
console.log('é'.normalize('NFD').length); // e + accent
```

### En TypeScript

Le type est `string`. `s[0]` est typé `string` même si la chaîne peut être vide (sauf avec l'option `noUncheckedIndexedAccess`) : pense à ce cas. On peut aussi exiger des textes **précis** :

```ts-run
type Taille = 'S' | 'M' | 'L';
const taille: Taille = 'M';
console.log(taille);
```

@@ code capitaliser | Capitaliser | js
`capitaliser(phrase)` met une majuscule à chaque mot et le reste en minuscules. Les mots sont séparés par un espace.
@starter
function capitaliser(phrase) {
}
@test Un mot
expect(capitaliser('bonjour')).toBe('Bonjour');
@test Plusieurs mots, casse mélangée
expect(capitaliser('le GRAND méchant lOUP')).toBe('Le Grand Méchant Loup');
@test Texte vide
expect(capitaliser('')).toBe('');
@hint
Découpe avec `split(' ')`, traite chaque mot avec une boucle, recolle avec `join(' ')`.
@hint
Un mot : `mot.slice(0, 1).toUpperCase() + mot.slice(1).toLowerCase()`.
@solution
function capitaliser(phrase) {
  const mots = phrase.split(' ');
  for (let i = 0; i < mots.length; i++) {
    mots[i] = mots[i].slice(0, 1).toUpperCase() + mots[i].slice(1).toLowerCase();
  }
  return mots.join(' ');
}

@@ code palindrome | Palindrome | js
`estPalindrome(texte)` dit si le texte se lit pareil dans les deux sens, sans tenir compte des majuscules, des espaces, de la ponctuation ni des accents.
@starter
function estPalindrome(texte) {
}
@test Simple
expect(estPalindrome('kayak')).toBe(true);
expect(estPalindrome('piano')).toBe(false);
@test Majuscules et espaces
expect(estPalindrome('Engage le jeu que je le gagne')).toBe(true);
@test Ponctuation
expect(estPalindrome("Esope reste ici et se repose !")).toBe(true);
@test Accents
expect(estPalindrome('Été')).toBe(true);
@hint
Pour retirer les accents : `texte.normalize('NFD')` sépare lettres et accents. Ensuite, ne garde que les lettres.
@hint
`.replace(/[^a-z]/g, '')` supprime tout ce qui n'est pas une lettre minuscule sans accent.
@solution
function estPalindrome(texte) {
  const lettres = texte.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
  return lettres === [...lettres].reverse().join('');
}

@@ code masquer | Masquer une carte | js
`masquer(numero)` remplace tout par `*` sauf les 4 derniers caractères. Un texte de 4 caractères ou moins ne change pas.
@starter
function masquer(numero) {
}
@test Une carte
expect(masquer('1234567812345678')).toBe('************5678');
@test Textes courts
expect(masquer('1234')).toBe('1234');
expect(masquer('12')).toBe('12');
expect(masquer('')).toBe('');
@hint
`slice(-4)` pour la fin, `padStart` pour compléter jusqu'à la longueur de départ.
@solution
function masquer(numero) {
  return numero.slice(-4).padStart(numero.length, '*');
}

@@ code slug | Un slug, en TypeScript | ts
`slug(titre)` transforme un titre en morceau d'adresse : `'  L’été à Séoul ! '` donne `'l-ete-a-seoul'`.

- minuscules, sans accents
- tout ce qui n'est pas une lettre ou un chiffre devient **un seul** tiret
- pas de tiret au début ni à la fin
@starter
function slug(titre: string): string {
  return titre;
}
@test Espaces
expect(slug('Mon premier article')).toBe('mon-premier-article');
@test Accents
expect(slug('Été à Séoul')).toBe('ete-a-seoul');
@test Ponctuation et espaces en trop
expect(slug('  L’été -- à Séoul ! ')).toBe('l-ete-a-seoul');
@test Chiffres gardés
expect(slug('Top 10 2026')).toBe('top-10-2026');
@hint
`normalize('NFD').replace(/[̀-ͯ]/g, '')` retire les accents.
@hint
`[^a-z0-9]+` reconnaît une suite de caractères à remplacer ; `^-` et `-$` un tiret au bord.
@solution
function slug(titre: string): string {
  return titre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@@ predict immuable
Qu'affiche ce code ?
```js
const s = 'abc';
s.toUpperCase();
console.log(s);
```
@answer `abc`
@wrong `ABC`
@wrong `Abc`
@wrong Une TypeError
@why Les chaînes sont immuables : il faut récupérer la valeur renvoyée.

@@ predict slice
Qu'affiche ce code ?
```js
console.log('abcdef'.slice(1, 3), 'abcdef'.slice(-2));
```
@answer `bc ef`
@wrong `bcd ef`
@wrong `abc ef`
@wrong `bc f`
@why La fin n'est pas comprise, et un indice négatif compte depuis la fin.

@@ predict replace
Qu'affiche ce code ?
```js
console.log('a.b.c'.replace('.', '-'));
```
@answer `a-b.c`
@wrong `a-b-c`
@wrong `a.b-c`
@wrong `---`
@why Avec un texte, `replace` ne change que la première occurrence. Sinon : `replaceAll`.

@@ card decouper
Comment passer de `'a,b'` à un tableau, et inversement ?
@back
`'a,b'.split(',')` et `['a', 'b'].join(',')`

@@ card dernier-caractere
Le dernier caractère de `s` ?
@back
`s.at(-1)`

@@ card pad
Comment obtenir `'07'` à partir de `7` ?
@back
`String(7).padStart(2, '0')`

@@ defi romains | Chiffres romains | js
`enRomain(n)` (1 à 3999) et `depuisRomain(texte)`. `depuisRomain` renvoie `null` pour un texte qui n'est pas un nombre romain **bien écrit** (`IIII`, `VX`, `IC`…).
@starter

@test Vers le romain
expect([1, 4, 9, 14, 40, 90, 400, 1994, 2026, 3999].map(enRomain)).toEqual(['I', 'IV', 'IX', 'XIV', 'XL', 'XC', 'CD', 'MCMXCIV', 'MMXXVI', 'MMMCMXCIX']);
@test Depuis le romain
expect(['I', 'XIV', 'MCMXCIV'].map(depuisRomain)).toEqual([1, 14, 1994]);
@test Aller-retour
for (let n = 1; n < 4000; n++) if (depuisRomain(enRomain(n)) !== n) throw new Error(`raté pour ${n}`);
@test Mal écrits
expect(['', 'IIII', 'VX', 'IC', 'ABC', 'IVI', 'xiv'].map(depuisRomain)).toEqual(new Array(7).fill(null));
@hint
Une liste de paires de `['M', 1000]`, `['CM', 900]`… à `['I', 1]`, parcourue du plus grand au plus petit.
@hint
Pour vérifier l'écriture : reconvertis le résultat, et compare au texte de départ.
@solution
const SYMBOLES = [
  ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400], ['C', 100], ['XC', 90],
  ['L', 50], ['XL', 40], ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1],
];

function enRomain(n) {
  let texte = '';
  let reste = n;
  for (const [symbole, valeur] of SYMBOLES) {
    texte += symbole.repeat(Math.floor(reste / valeur));
    reste %= valeur;
  }
  return texte;
}

function depuisRomain(texte) {
  let total = 0;
  let reste = texte;
  for (const [symbole, valeur] of SYMBOLES) {
    while (reste.startsWith(symbole)) {
      total += valeur;
      reste = reste.slice(symbole.length);
    }
  }
  return total > 0 && enRomain(total) === texte ? total : null;
}
