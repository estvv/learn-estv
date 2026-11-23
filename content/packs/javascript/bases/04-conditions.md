# Conditions
> if, else, switch, et l'art de sortir tôt.

@@ lesson if | if, else, switch

```js-run
const temperature = 24;
if (temperature > 30) {
  console.log('canicule');
} else if (temperature > 20) {
  console.log('agréable');
} else {
  console.log('frais');
}
```

Les accolades sont facultatives pour une seule instruction, mais garde-les : `if (x) a(); b();` exécute **toujours** `b()`.

### Sortir tôt

Plutôt que d'imbriquer les `if`, traite les cas particuliers d'abord et sors :

```js
// Difficile à suivre
function prix(user) {
  if (user) {
    if (user.abonne) {
      return 0;
    } else {
      return 10;
    }
  } else {
    return 15;
  }
}

// Clair
function prix(user) {
  if (!user) return 15;
  if (user.abonne) return 0;
  return 10;
}
```

### switch

Compare une valeur à plusieurs cas, avec `===`. **N'oublie pas `break`** (ou `return`), sinon l'exécution continue dans le cas suivant :

```js-run
function typeDeJour(jour) {
  switch (jour) {
    case 'samedi':
    case 'dimanche': // plusieurs cas, même résultat
      return 'week-end';
    case 'mercredi':
      return 'milieu';
    default:
      return 'semaine';
  }
}
console.log(typeDeJour('dimanche'), typeDeJour('lundi'));
```

Pour déclarer une variable dans un `case`, entoure-le d'accolades : `case 'a': { const x = 1; break; }`.

### Un objet à la place

Pour une simple correspondance, un objet est souvent plus lisible :

```js-run
const prix = { cafe: 2, the: 3 };
console.log(prix['cafe'] ?? 'inconnu', prix['soda'] ?? 'inconnu');
```

### En TypeScript

Dans un `if`, TypeScript **suit** ce que tu viens de vérifier : c'est le *narrowing*.

```ts-run
function afficher(x: string | number): string {
  if (typeof x === 'string') {
    return x.toUpperCase(); // ici, x est un string
  }
  return x.toFixed(2);      // ici, forcément un number
}
console.log(afficher('abc'), afficher(3));
```

@@ code mention | La mention | js
`mention(note)` renvoie :

- `'Très bien'` à partir de 16
- `'Bien'` à partir de 14
- `'Assez bien'` à partir de 12
- `'Passable'` à partir de 10
- `'Refusé'` en dessous
- `'Note invalide'` si la note est sous 0 ou au-dessus de 20
@starter
function mention(note) {
}
@test Les cinq mentions
expect([18, 15, 13, 10.5, 4].map(mention)).toEqual(['Très bien', 'Bien', 'Assez bien', 'Passable', 'Refusé']);
@test Les limites comptent dans la mention du dessus
expect([16, 14, 12, 10, 20, 0].map(mention)).toEqual(['Très bien', 'Bien', 'Assez bien', 'Passable', 'Très bien', 'Refusé']);
@test Les notes invalides
expect(mention(-1)).toBe('Note invalide');
expect(mention(21)).toBe('Note invalide');
@hint
Commence par le cas invalide, puis descends de la meilleure note à la moins bonne, en sortant avec `return`.
@solution
function mention(note) {
  if (note < 0 || note > 20) return 'Note invalide';
  if (note >= 16) return 'Très bien';
  if (note >= 14) return 'Bien';
  if (note >= 12) return 'Assez bien';
  if (note >= 10) return 'Passable';
  return 'Refusé';
}

@@ code calculer | Calculatrice avec switch | js
`calculer(a, operateur, b)` gère `'+'`, `'-'`, `'*'` et `'/'` avec un `switch`. Une division par zéro, ou un opérateur inconnu, renvoie `null`.
@starter
function calculer(a, operateur, b) {
}
@test Les quatre opérations
expect(calculer(6, '+', 2)).toBe(8);
expect(calculer(6, '-', 2)).toBe(4);
expect(calculer(6, '*', 2)).toBe(12);
expect(calculer(6, '/', 2)).toBe(3);
@test Division par zéro : `null`
expect(calculer(6, '/', 0)).toBe(null);
@test Opérateur inconnu : `null`
expect(calculer(6, '?', 2)).toBe(null);
@test Utilise `switch`
expect($source).toMatch(/switch/);
@solution
function calculer(a, operateur, b) {
  switch (operateur) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return b === 0 ? null : a / b;
    default:
      return null;
  }
}

@@ code aplatir | Sortir tôt | js
Réécris `livraison` sans aucun `else` et sans `if` imbriqué, **sans changer son comportement**.
@starter
function livraison(panier) {
  if (panier) {
    if (panier.total > 0) {
      if (panier.total >= 50) {
        return 'gratuite';
      } else {
        if (panier.membre) {
          return 'gratuite';
        } else {
          return '4.90';
        }
      }
    } else {
      return 'panier vide';
    }
  } else {
    return 'panier vide';
  }
}
@test Panier absent ou vide
expect(livraison(null)).toBe('panier vide');
expect(livraison({ total: 0, membre: true })).toBe('panier vide');
@test Gratuite dès 50, ou pour un membre
expect(livraison({ total: 50, membre: false })).toBe('gratuite');
expect(livraison({ total: 10, membre: true })).toBe('gratuite');
@test Payante sinon
expect(livraison({ total: 49.99, membre: false })).toBe('4.90');
@test Plus aucun `else`
expect($source).not.toMatch(/\belse\b/);
@hint
Deux cas mènent à « panier vide » : ils peuvent tenir dans une condition avec `||`.
@solution
function livraison(panier) {
  if (!panier || panier.total <= 0) return 'panier vide';
  if (panier.total >= 50 || panier.membre) return 'gratuite';
  return '4.90';
}

@@ code decrire | Narrowing, en TypeScript | ts
Complète `decrire(valeur)`, dont le paramètre est `string | number | boolean | null` :

- texte : `texte de 3 caractères`
- nombre : `nombre 4.0` (une décimale)
- booléen : `oui` ou `non`
- `null` : `rien`

Type aussi le retour.
@starter
function decrire(valeur) {
}
@test Texte et nombre
expect(decrire('abc')).toBe('texte de 3 caractères');
expect(decrire(4)).toBe('nombre 4.0');
@test Booléens
expect(decrire(true)).toBe('oui');
expect(decrire(false)).toBe('non');
@test `null`
expect(decrire(null)).toBe('rien');
@types Les bons types
type _ = [$Expect<$Equal<Parameters<typeof decrire>[0], string | number | boolean | null>>, $Expect<$Equal<ReturnType<typeof decrire>, string>>];
@hint
`typeof valeur === 'string'`, et pour `null` : `valeur === null`.
@solution
function decrire(valeur: string | number | boolean | null): string {
  if (valeur === null) return 'rien';
  if (typeof valeur === 'string') return `texte de ${valeur.length} caractères`;
  if (typeof valeur === 'number') return `nombre ${valeur.toFixed(1)}`;
  return valeur ? 'oui' : 'non';
}

@@ predict fallthrough
Qu'affiche ce code ?
```js
switch (1) {
  case 1: console.log('un');
  case 2: console.log('deux'); break;
  default: console.log('autre');
}
```
@answer `un deux`
@wrong `un`
@wrong `un deux autre`
@wrong `autre`
@why Sans `break`, l'exécution continue dans le cas suivant.

@@ predict if-sans-accolades
Qu'affiche ce code ?
```js
if (false)
  console.log('a');
  console.log('b');
```
@answer `b`
@wrong `a b`
@wrong Rien
@wrong `a`
@why Sans accolades, seul `console.log('a')` dépend du `if`. L'indentation ne compte pas.

@@ predict switch-strict
Qu'affiche ce code ?
```js
switch ('1') {
  case 1: console.log('nombre'); break;
  case '1': console.log('texte'); break;
}
```
@answer `texte`
@wrong `nombre`
@wrong `nombre texte`
@wrong Rien
@why `switch` compare avec `===` : `'1'` n'est pas `1`.

@@ card break
À quoi sert `break` dans un `switch` ?
@back
À en sortir ; sans lui, les cas suivants s'exécutent aussi.

@@ card narrowing
Qu'est-ce que le *narrowing* en TypeScript ?
@back
Après un test (`typeof x === 'string'`, `x !== null`…), TypeScript réduit le type de `x` dans cette branche.

@@ defi jour-mois | Le jour suivant | js
`lendemain(jour, mois, annee)` renvoie `[jour, mois, annee]` du lendemain (mois de 1 à 12), **sans** `Date`. Si la date n'existe pas, renvoie `null`.
@starter
function lendemain(jour, mois, annee) {
}
@test Cas simples
expect([lendemain(1, 1, 2026), lendemain(31, 1, 2026), lendemain(30, 4, 2026), lendemain(31, 12, 2026)]).toEqual([[2, 1, 2026], [1, 2, 2026], [1, 5, 2026], [1, 1, 2027]]);
@test Février
expect([lendemain(28, 2, 2026), lendemain(28, 2, 2024), lendemain(29, 2, 2024), lendemain(28, 2, 1900), lendemain(28, 2, 2000)]).toEqual([[1, 3, 2026], [29, 2, 2024], [1, 3, 2024], [1, 3, 1900], [29, 2, 2000]]);
@test Dates impossibles
expect([lendemain(31, 4, 2026), lendemain(29, 2, 2026), lendemain(0, 1, 2026), lendemain(1, 13, 2026), lendemain(1, 0, 2026)]).toEqual([null, null, null, null, null]);
@test Sans `Date`
expect($source).not.toMatch(/Date/);
@solution
function joursDans(mois, annee) {
  switch (mois) {
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0 ? 29 : 28;
    default:
      return 31;
  }
}

function lendemain(jour, mois, annee) {
  if (mois < 1 || mois > 12) return null;
  const max = joursDans(mois, annee);
  if (jour < 1 || jour > max) return null;
  if (jour < max) return [jour + 1, mois, annee];
  if (mois < 12) return [1, mois + 1, annee];
  return [1, 1, annee + 1];
}
