# Variables et types
> const, let, les valeurs de base et leurs types.

@@ lesson const-let | const et let

Une **variable** donne un nom à une valeur.

```js-run
const prenom = 'Ada';   // ne sera jamais réaffectée
let score = 0;          // peut changer
score = score + 10;
score += 5;             // raccourci de score = score + 5
score++;                // raccourci de score = score + 1
console.log(prenom, score);
```

- `const` : impossible de **réaffecter**. C'est le choix par défaut.
- `let` : quand la valeur doit changer.
- `var` : l'ancienne façon. Tu en croiseras dans du vieux code, n'en écris pas.

```js-run
const pi = 3.14;
pi = 3; // TypeError
```

### Nommer

Lettres, chiffres, `_` et `$`, sans commencer par un chiffre. Convention : `camelCase` pour les variables et fonctions (`nombreDePages`), `PascalCase` pour les classes et les types, `MAJUSCULES` pour les constantes fixes (`TAILLE_MAX`).

### En TypeScript

L'annotation se met après le nom, avec `:`. Mais TypeScript **devine** souvent le type tout seul (c'est l'*inférence*), et on ne l'écrit alors pas :

```ts-run
let age: number = 30;    // annoté
let ville = 'Séoul';     // inféré : string
let reponse: string;     // déclarée sans valeur : l'annotation est utile
reponse = 'oui';
console.log(age, ville, reponse);
```

Survole une variable dans l'éditeur pour voir son type. Ensuite, `age = 'trente'` est refusé : *Type 'string' is not assignable to type 'number'*.

@@ lesson types | Les types primitifs

JavaScript a 7 types **primitifs**, plus les objets.

| Type | Exemples | À savoir |
|---|---|---|
| `string` | `'a'`, `"b"` | du texte |
| `number` | `42`, `3.14`, `NaN`, `Infinity` | entiers et décimaux, un seul type |
| `boolean` | `true`, `false` | |
| `undefined` | `undefined` | pas encore de valeur |
| `null` | `null` | vide, exprès |
| `bigint` | `10n` | entiers aussi grands qu'on veut |
| `symbol` | `Symbol('id')` | identifiants uniques (bien plus tard) |

Tout le reste (tableaux, fonctions, dates…) est un **objet**. `typeof` donne le type :

```js-run
console.log(typeof 'salut', typeof 42, typeof true);
console.log(typeof undefined, typeof {}, typeof [], typeof (() => 1));
console.log(typeof null); // 'object' : un vieux bug, jamais corrigé
```

### Les nombres

```js-run
console.log(7 / 2, 7 % 2, 2 ** 10);       // division, reste, puissance
console.log(0.1 + 0.2);                   // les décimaux sont approchés
console.log(1_000_000, 0xff, 0b101, 1e3); // écritures possibles
console.log('abc' * 2, 1 / 0);            // NaN, Infinity
console.log(Number('12.5'), parseInt('42px', 10), Math.round(2.6));
console.log((3.14159).toFixed(2));        // une chaîne : '3.14'
```

`NaN` (*Not a Number*) est le seul à ne pas être égal à lui-même : teste avec `Number.isNaN(x)`.

### Le texte

Trois sortes de guillemets. Les **backquotes** permettent d'insérer des valeurs et d'aller à la ligne :

```js-run
const nom = 'Ada';
const age = 36;
console.log('L\'apostrophe s\'échappe avec \\');
console.log(`${nom} a ${age} ans, et ${age + 1} l'an prochain`);
console.log(`deux
lignes`);
console.log(nom.length, nom.toUpperCase(), nom[0]);
```

### Convertir

`String(42)`, `Number('42')`, `Boolean('')`. Convertis explicitement plutôt que de laisser JavaScript deviner.

### En TypeScript

Les types s'écrivent en minuscules : `string`, `number`, `boolean`, `bigint`, `symbol`, `null`, `undefined`. (`String` et `Number` avec majuscule sont autre chose, évite.) Une variable peut accepter plusieurs types avec `|` :

```ts-run
let id: string | number = 12;
id = 'a12';
let trouve: string | null = null;
console.log(id, trouve);
```

@@ code echange | Échanger deux variables | js
Échange les valeurs de `a` et `b`, **sans** écrire `'droite'` ni `'gauche'` une deuxième fois.
@starter
let a = 'gauche';
let b = 'droite';

// Ton code ici

@test `a` vaut `'droite'`
expect(a).toBe('droite');
@test `b` vaut `'gauche'`
expect(b).toBe('gauche');
@test Les textes ne sont écrits qu'une fois
expect($source.match(/droite/g)).toHaveLength(1);
@hint
Si tu écris `a = b`, l'ancienne valeur de `a` est perdue. Garde-la d'abord dans une troisième variable.
@solution
let a = 'gauche';
let b = 'droite';

const avant = a;
a = b;
b = avant;

@@ code fiche | Une phrase avec des variables | js
Crée trois constantes :

- `prenom`, du texte de ton choix
- `naissance`, l'année `1990`
- `phrase`, qui vaut par exemple `Ada aura 36 ans en 2026`, construite avec un **template** (backquotes) à partir des deux autres. L'âge doit être **calculé**.
@starter
const prenom = 'Ada';
@test `naissance` vaut 1990
expect(naissance).toBe(1990);
@test `phrase` est correcte
expect(phrase).toBe(`${prenom} aura 36 ans en 2026`);
@test L'âge est calculé
expect($source).toMatch(/2026\s*-\s*naissance/);
@test Tout est en `const`
expect($source).not.toMatch(/\b(let|var)\b/);
@hint
`${...}` accepte n'importe quel calcul : `${2026 - naissance}`.
@solution
const prenom = 'Ada';
const naissance = 1990;
const phrase = `${prenom} aura ${2026 - naissance} ans en 2026`;

@@ code conversion | Convertir et arrondir | js
Un formulaire te donne deux **textes**. Calcule :

- `total` : le prix fois la quantité, un **nombre**
- `affichage` : le total avec deux décimales, suivi de ` €`, par exemple `'59.70 €'`
@starter
const prix = '19.90';
const quantite = '3';

@test `total` est un nombre
expect(total).toBeTypeOf('number');
@test `total` vaut 59,70
expect(total).toBeCloseTo(59.7);
@test `affichage` vaut `'59.70 €'`
expect(affichage).toBe('59.70 €');
@hint
`Number(texte)` convertit en nombre, `nombre.toFixed(2)` donne un texte à deux décimales.
@solution
const prix = '19.90';
const quantite = '3';

const total = Number(prix) * Number(quantite);
const affichage = `${total.toFixed(2)} €`;

@@ code annoter | Annoter en TypeScript | ts
Ajoute l'annotation de type à **chaque** variable, sans changer les valeurs. `surnom` doit pouvoir contenir du texte **ou** `null`, `code` du texte **ou** un nombre.
@starter
let prenom = 'Ada';
let age = 36;
let admin = false;
let surnom = null;
let code = 'A1';
@types `prenom`, `age` et `admin` ont le bon type
prenom = 'Grace'; age = 45; admin = true; admin = false;
// @ts-expect-error
prenom = 3;
// @ts-expect-error
admin = 'oui';
@types `surnom` accepte du texte ou `null`
surnom = 'La comtesse'; surnom = null;
@types `code` accepte du texte ou un nombre
code = 12; code = 'B2';
@types `code` refuse un booléen
// @ts-expect-error
code = true;
@test Tout est annoté
expect($source.match(/let \w+\s*:/g) ?? []).toHaveLength(5);
@test Les valeurs n'ont pas changé
expect([prenom, age, admin, surnom, code]).toEqual(['Ada', 36, false, null, 'A1']);
@hint
Plusieurs types possibles se séparent par `|` : `string | null`.
@solution
let prenom: string = 'Ada';
let age: number = 36;
let admin: boolean = false;
let surnom: string | null = null;
let code: string | number = 'A1';

@@ predict typeof-null
Qu'affiche ce code ?
```js
console.log(typeof null);
```
@answer `object`
@wrong `null`
@wrong `undefined`
@wrong `string`
@why Un bug historique de JavaScript, gardé pour ne pas casser le web. Pour tester : `x === null`.

@@ predict reaffectation
Que se passe-t-il ?
```js
const n = 1;
n++;
console.log(n);
```
@answer Une TypeError
@wrong `2`
@wrong `1`
@wrong Une SyntaxError
@why `n++` réaffecte `n`, ce que `const` interdit : *Assignment to constant variable*.

@@ predict flottants
Qu'affiche ce code ?
```js
console.log(0.1 + 0.2 === 0.3);
```
@answer `false`
@wrong `true`
@wrong `NaN`
@wrong `undefined`
@why Les nombres sont en virgule flottante binaire : `0.1 + 0.2` donne `0.30000000000000004`.

@@ predict plus-texte
Qu'affiche ce code ?
```js
console.log('5' + 3, '5' - 3);
```
@answer `53 2`
@wrong `8 2`
@wrong `53 NaN`
@wrong `53 53`
@why `+` colle dès qu'un côté est une chaîne ; `-` n'existe que pour les nombres, donc convertit.

@@ card const-let
Quand utiliser `const`, quand utiliser `let` ?
@back
`const` par défaut ; `let` seulement si la variable doit être **réaffectée**.

@@ card primitifs
Cite les 7 types primitifs.
@back
`string`, `number`, `boolean`, `undefined`, `null`, `bigint`, `symbol`

@@ card template
Comment insérer la variable `nom` dans un texte ?
@back
Avec des backquotes : `` `Salut ${nom}` ``

@@ card nan
Comment savoir si `x` vaut `NaN` ?
@back
`Number.isNaN(x)` (`x === NaN` est toujours faux)

@@ card annotation
En TypeScript, déclare `age`, une variable qui contient un nombre ou `null`.
@back
`let age: number | null;`

@@ defi duree | Découper une durée | js
`secondes` contient une durée. Calcule `h`, `m`, `s`, puis `texte` au format `1h 01m 01s` (minutes et secondes sur **deux** chiffres). Ton code doit marcher pour n'importe quelle durée.
@starter
const secondes = 3661;

@test `h`, `m` et `s`
expect([h, m, s]).toEqual([1, 1, 1]);
@test `texte`
expect(texte).toBe('1h 01m 01s');
@test Rien n'est écrit en dur
expect($source).not.toMatch(/1h|01m|[hms] = 1\b/);
@hint
`Math.floor(a / b)` pour le quotient, `a % b` pour le reste, `String(n).padStart(2, '0')` pour deux chiffres.
@solution
const secondes = 3661;

const h = Math.floor(secondes / 3600);
const m = Math.floor((secondes % 3600) / 60);
const s = secondes % 60;
const texte = `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
