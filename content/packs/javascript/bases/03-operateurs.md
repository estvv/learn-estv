# Opérateurs
> Comparer, combiner, valeurs par défaut, et les pièges de la coercition.

@@ lesson comparer | Comparer

```js-run
console.log(5 > 3, 5 >= 5, 'a' < 'b');
console.log(1 === 1, 1 === '1'); // égalité stricte : même type ET même valeur
console.log(1 == '1');           // égalité « souple » : convertit avant
console.log(1 !== 2);
```

Utilise **toujours** `===` et `!==`. Avec `==`, JavaScript convertit les valeurs (c'est la **coercition**) selon des règles que personne ne retient :

```js-run
console.log(0 == '', null == undefined, '1' == true, [] == false);
```

Seule exception admise : `x == null`, vrai pour `null` **et** `undefined`.

Les objets et tableaux se comparent par **référence** (est-ce le même objet ?), pas par contenu :

```js-run
console.log([1] === [1]);
const a = [1];
const b = a;
console.log(a === b);
```

`Object.is(a, b)` est comme `===`, sauf pour `NaN` (égal à lui-même) et `-0` (différent de `0`).

@@ lesson logique | Logique et valeurs par défaut

### Vrai et faux

Dans une condition, toute valeur compte comme vraie ou fausse. Les valeurs **falsy** :

`false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`

**Tout le reste** est truthy, même `'0'`, `'false'`, `[]` et `{}`.

### && || !

```js-run
console.log(true && false, true || false, !true);
// && et || renvoient l'une des deux valeurs, pas forcément un booléen :
console.log('a' && 'b'); // le premier falsy, sinon le dernier
console.log('' || 'défaut'); // le premier truthy, sinon le dernier
console.log(Boolean('x'), !!'x'); // convertir en booléen
```

Ils s'arrêtent dès que le résultat est connu (**court-circuit**) : dans `a && b`, `b` n'est pas évalué si `a` est falsy.

### ?? la valeur par défaut

`??` ne remplace que `null` et `undefined`, alors que `||` remplace aussi `0` et `''` :

```js-run
const volume = 0;
console.log(volume || 50); // 50 : oups
console.log(volume ?? 50); // 0
```

### ?. l'accès prudent

`?.` s'arrête et donne `undefined` si ce qui précède est `null` ou `undefined` :

```js-run
const user = { adresse: null };
console.log(user.adresse?.ville);
console.log(user.adresse?.ville ?? 'inconnue');
console.log(user.methode?.()); // appel prudent
```

### Le ternaire

`condition ? siVrai : siFaux` est une **expression** : elle donne une valeur.

```js-run
const age = 20;
console.log(age >= 18 ? 'majeur' : 'mineur');
```

### Affecter en une fois

`+=` `-=` `*=` `/=` `%=` `**=`, et les versions logiques `||=` `&&=` `??=` :

```js-run
let config;
config ??= 'par défaut'; // seulement si null ou undefined
console.log(config);
```

### Priorité

Dans l'ordre : `!`, puis `**`, puis `* / %`, puis `+ -`, puis les comparaisons, puis `===`, puis `&&`, puis `||`, puis le ternaire. Dans le doute, mets des parenthèses. Mélanger `??` avec `&&` ou `||` sans parenthèses est une erreur de syntaxe.

### En TypeScript

`?.` et `??` sont tes meilleurs amis : avec un type comme `string | null`, TypeScript **refuse** `texte.length` tant que tu n'as pas écarté `null`.

```ts-run
function taille(texte: string | null): number {
  return texte?.length ?? 0;
}
console.log(taille('abc'), taille(null));
```

@@ code pair | Pair ou impair | js
Complète `estPair(n)` : elle renvoie `true` si `n` est pair, `false` sinon. Sans `if` ni ternaire : une comparaison donne **déjà** un booléen.

(Une fonction reçoit des valeurs et en renvoie une avec `return` ; on les verra en détail bientôt.)
@starter
function estPair(n) {
  return ;
}
@test 4 est pair, 0 aussi
expect(estPair(4)).toBe(true);
expect(estPair(0)).toBe(true);
@test 7 et -3 sont impairs
expect(estPair(7)).toBe(false);
expect(estPair(-3)).toBe(false);
@test Ni `if` ni ternaire
expect($source).not.toMatch(/\bif\b|\?/);
@hint
`n % 2` donne le reste de la division par 2.
@solution
function estPair(n) {
  return n % 2 === 0;
}

@@ code bissextile | Année bissextile | js
Une année est bissextile si elle est divisible par 4, **sauf** si elle est divisible par 100, **sauf** si elle est divisible par 400. Écris `bissextile(annee)` en une seule expression.
@starter
function bissextile(annee) {
  return ;
}
@test 2024 l'est, 2023 non
expect(bissextile(2024)).toBe(true);
expect(bissextile(2023)).toBe(false);
@test 1900 non (divisible par 100)
expect(bissextile(1900)).toBe(false);
@test 2000 l'est (divisible par 400)
expect(bissextile(2000)).toBe(true);
@hint
« Divisible par 4 **et** pas par 100, **ou** divisible par 400 ».
@solution
function bissextile(annee) {
  return (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
}

@@ code reglages | Valeurs par défaut | js
`volumeDe(reglages)` renvoie le volume des réglages, ou `50` s'il n'est pas défini. Attention : `reglages` peut être `null`, et un volume de `0` est valable.
@starter
function volumeDe(reglages) {
  return reglages.volume || 50;
}
@test Renvoie le volume donné
expect(volumeDe({ volume: 80 })).toBe(80);
@test Garde un volume de 0
expect(volumeDe({ volume: 0 })).toBe(0);
@test 50 si le volume manque
expect(volumeDe({})).toBe(50);
@test 50 si les réglages sont `null` ou `undefined`
expect(volumeDe(null)).toBe(50);
expect(volumeDe(undefined)).toBe(50);
@hint
`?.` pour l'accès, `??` pour la valeur par défaut.
@solution
function volumeDe(reglages) {
  return reglages?.volume ?? 50;
}

@@ code premiere-lettre | Initiale, en TypeScript | ts
`initiale(nom)` renvoie la première lettre du nom en majuscule, ou `'?'` si le nom est vide, `null` ou `undefined`. Type le paramètre **et** le retour.
@starter
function initiale(nom) {
  return nom[0].toUpperCase();
}
@test Première lettre en majuscule
expect(initiale('ada')).toBe('A');
@test `'?'` pour une chaîne vide, `null` et `undefined`
expect(initiale('')).toBe('?');
expect(initiale(null)).toBe('?');
expect(initiale(undefined)).toBe('?');
@types Accepte `string`, `null` et `undefined`, renvoie `string`
const r: string = initiale('a'); initiale(null); initiale(undefined);
@types Refuse un nombre
// @ts-expect-error
initiale(3);
@hint
Le paramètre : `nom: string | null | undefined`. Et `nom?.[0]` marche aussi pour les crochets.
@solution
function initiale(nom: string | null | undefined): string {
  return nom?.[0]?.toUpperCase() ?? '?';
}

@@ predict ou-defaut
Qu'affiche ce code ?
```js
console.log(0 || 'a', 0 ?? 'a');
```
@answer `a 0`
@wrong `0 0`
@wrong `a a`
@wrong `0 a`
@why `||` remplace toute valeur falsy, `??` seulement `null` et `undefined`.

@@ predict truthy
Qu'affiche ce code ?
```js
console.log(Boolean('0'), Boolean([]), Boolean(''));
```
@answer `true true false`
@wrong `false false false`
@wrong `true false false`
@wrong `false true false`
@why Seule la chaîne vide est falsy ; un tableau, même vide, est un objet, donc truthy.

@@ predict et
Qu'affiche ce code ?
```js
console.log('a' && 0 && 'b');
```
@answer `0`
@wrong `false`
@wrong `b`
@wrong `a`
@why `&&` renvoie la première valeur falsy rencontrée, telle quelle.

@@ predict references
Qu'affiche ce code ?
```js
console.log([1, 2] === [1, 2], 'ab' === 'ab');
```
@answer `false true`
@wrong `true true`
@wrong `false false`
@wrong `true false`
@why Les objets se comparent par référence, les primitifs par valeur.

@@ card falsy
Quelles sont les valeurs falsy ?
@back
`false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`

@@ card nullish
Différence entre `a || b` et `a ?? b` ?
@back
`||` prend `b` si `a` est falsy ; `??` seulement si `a` est `null` ou `undefined`.

@@ card chainage
Que vaut `user?.adresse?.ville` si `user` est `null` ?
@back
`undefined`, sans erreur.

@@ card ternaire
Écris : « `'majeur'` si age ≥ 18, sinon `'mineur'` » en une expression.
@back
`age >= 18 ? 'majeur' : 'mineur'`

@@ defi portes-logiques | Reconstruire la logique | js
Écris `et(a, b)`, `ou(a, b)` et `xor(a, b)` (exactement un des deux), pour des **booléens**, en n'utilisant que `nand`, fournie. Ni `&&`, ni `||`, ni `!`, ni `if`, ni `?`.
@starter
const nand = (a, b) => !(a && b);

@test `et`
expect([et(true, true), et(true, false), et(false, true), et(false, false)]).toEqual([true, false, false, false]);
@test `ou`
expect([ou(true, true), ou(true, false), ou(false, true), ou(false, false)]).toEqual([true, true, true, false]);
@test `xor`
expect([xor(true, true), xor(true, false), xor(false, true), xor(false, false)]).toEqual([false, true, true, false]);
@test Seulement `nand`
const code = $source.slice($source.indexOf(';') + 1); expect(code).not.toMatch(/&&|\|\||!|\?|\bif\b|[=!]==/);
@hint
`nand(a, a)` vaut « non a ».
@solution
const nand = (a, b) => !(a && b);

const non = (a) => nand(a, a);
const et = (a, b) => non(nand(a, b));
const ou = (a, b) => nand(non(a), non(b));
const xor = (a, b) => et(ou(a, b), nand(a, b));
