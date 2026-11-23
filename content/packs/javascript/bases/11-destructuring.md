# Déstructuration et spread
> Sortir des valeurs d'un objet ou d'un tableau en une ligne.

@@ lesson destructuring | Déstructurer

### Les objets : par nom

```js-run
const user = { nom: 'Ada', age: 36, adresse: { ville: 'Londres' } };

const { nom, age } = user;
const { nom: pseudo } = user;                // renommer
const { role = 'membre' } = user;            // valeur par défaut
const { adresse: { ville } } = user;         // imbriqué
const { age: a = 0, ...reste } = user;       // tout le reste
console.log(nom, age, pseudo, role, ville, a, reste);
```

`const { nom: pseudo }` se lit « la propriété `nom`, dans la variable `pseudo` ».

### Les tableaux : par position

```js-run
const [premier, , troisieme = 'vide', ...suite] = ['a', 'b', 'c', 'd', 'e'];
console.log(premier, troisieme, suite);

let x = 1;
let y = 2;
[x, y] = [y, x]; // échange sans variable en plus
console.log(x, y);
```

### Dans les paramètres

Très courant : une fonction qui reçoit un objet d'options.

```js-run
function creerBouton({ texte, taille = 'M', actif = true } = {}) {
  return `${texte ?? '?'} ${taille} ${actif}`;
}
console.log(creerBouton({ texte: 'OK', taille: 'L' }));
console.log(creerBouton());
```

Le `= {}` final sert quand la fonction est appelée sans argument.

### Rest et spread : deux sens de « ... »

- À **gauche** (ou dans des paramètres), `...` **rassemble** le reste.
- À **droite** (ou dans un appel), `...` **étale**.

```js-run
const base = { a: 1, b: 2 };
const { a, ...sansA } = base; // rassemble : retire une clé
console.log(sansA, { ...base, c: 3 });
```

### En TypeScript

Le type s'écrit **après** tout le motif, jamais dedans (`{ nom: string }` voudrait dire renommer !) :

```ts-run
interface Options { texte: string; taille?: 'S' | 'M' | 'L' }

function bouton({ texte, taille = 'M' }: Options): string {
  return `${texte} (${taille})`;
}
console.log(bouton({ texte: 'OK' }));
```

@@ code extraire | Extraire | js
En **une seule** déstructuration de `film`, crée les variables :

- `titre`
- `real` : le nom du réalisateur
- `premier` : le premier acteur
- `note` : `0` par défaut
@starter
const film = {
  titre: 'Parasite',
  realisateur: { nom: 'Bong Joon-ho', pays: 'Corée' },
  acteurs: ['Song Kang-ho', 'Lee Sun-kyun'],
};

@test `titre`
expect(titre).toBe('Parasite');
@test `real`
expect(real).toBe('Bong Joon-ho');
@test `premier`
expect(premier).toBe('Song Kang-ho');
@test `note`
expect(note).toBe(0);
@test Sans accès avec un point
expect($source).not.toMatch(/film\./);
@hint
`{ realisateur: { nom: real }, acteurs: [premier] }`
@solution
const film = {
  titre: 'Parasite',
  realisateur: { nom: 'Bong Joon-ho', pays: 'Corée' },
  acteurs: ['Song Kang-ho', 'Lee Sun-kyun'],
};

const { titre, realisateur: { nom: real }, acteurs: [premier], note = 0 } = film;

@@ code sans | Retirer une clé | js
`sansMotDePasse(user)` renvoie une copie de l'utilisateur sans la clé `motDePasse`, avec déstructuration et **sans** `delete`.
@starter
function sansMotDePasse(user) {
}
@test Retire la clé
expect(sansMotDePasse({ nom: 'Ada', motDePasse: 'x', age: 3 })).toEqual({ nom: 'Ada', age: 3 });
@test Ne modifie pas l'original
const u = { nom: 'Ada', motDePasse: 'x' }; sansMotDePasse(u); expect(u.motDePasse).toBe('x');
@test Sans `delete`
expect($source).not.toMatch(/delete/);
@solution
function sansMotDePasse(user) {
  const { motDePasse, ...reste } = user;
  return reste;
}

@@ code options | Des options, en TypeScript | ts
`adresse(options)` construit une adresse web. Options : `hote` (obligatoire), `port` (nombre, `80` par défaut), `chemin` (`'/'` par défaut), `securise` (`false` par défaut).

`adresse({ hote: 'site.fr' })` donne `'http://site.fr:80/'`. Utilise la déstructuration dans les paramètres, et un type pour les options.
@starter
function adresse() {
}
@test Valeurs par défaut
expect(adresse({ hote: 'site.fr' })).toBe('http://site.fr:80/');
@test Toutes les options
expect(adresse({ hote: 'a.b', port: 443, chemin: '/x', securise: true })).toBe('https://a.b:443/x');
@types `hote` est obligatoire
// @ts-expect-error
adresse({ port: 3 });
@types Les autres sont facultatives, et le retour est un texte
const s: string = adresse({ hote: 'a', securise: true });
@types Refuse un port en texte
// @ts-expect-error
adresse({ hote: 'a', port: '80' });
@solution
interface Options {
  hote: string;
  port?: number;
  chemin?: string;
  securise?: boolean;
}

function adresse({ hote, port = 80, chemin = '/', securise = false }: Options): string {
  return `http${securise ? 's' : ''}://${hote}:${port}${chemin}`;
}

@@ predict renommer
Qu'affiche ce code ?
```js
const { a: b = 5 } = { a: undefined };
console.log(b);
```
@answer `5`
@wrong `undefined`
@wrong Une ReferenceError
@wrong `null`
@why La propriété `a` va dans `b` ; `undefined` déclenche la valeur par défaut.

@@ predict reste
Qu'affiche ce code ?
```js
const [a, ...b] = [1, 2, 3];
console.log(b.length);
```
@answer `2`
@wrong `3`
@wrong `1`
@wrong `undefined`
@why `b` rassemble tout ce qui suit le premier élément.

@@ predict null-destructure
Qu'affiche ce code ?
```js
const { x } = null;
console.log(x);
```
@answer Une TypeError
@wrong `undefined`
@wrong `null`
@wrong Une SyntaxError
@why On ne peut pas déstructurer `null` ni `undefined`.

@@ card renommer-prop
Mettre la propriété `nom` de `user` dans une variable `pseudo` ?
@back
`const { nom: pseudo } = user;`

@@ card echange
Échanger `x` et `y` en une ligne ?
@back
`[x, y] = [y, x];`

@@ card type-destructure
En TypeScript, où met-on le type d'un paramètre déstructuré ?
@back
Après le motif : `({ a, b }: { a: string; b: number }) => …`

@@ defi sans-acces | Tout en déstructuration | js
Écris ces fonctions **sans un seul accès** avec un point ou des crochets sur les données (pas de `x.y`, pas de `x[0]`) :

- `premiers([a, b, …])` : `{ un, deux, reste }`
- `retourner({ a: { b } })` : `{ b: { a: … } }`, pour `{ a: { b: valeur } }` renvoie `{ b: { a: valeur } }`
- `permuter([a, b, c])` : `[c, a, b]`
- `sans(objet, cle)` : une copie sans cette clé (clé **variable**)
- `distance([x1, y1], [x2, y2])` : avec des coordonnées à 0 par défaut (`Math` est permis)
@starter

@test `premiers`
expect([premiers([1, 2, 3, 4]), premiers([])]).toEqual([{ un: 1, deux: 2, reste: [3, 4] }, { un: undefined, deux: undefined, reste: [] }]);
@test `retourner` et `permuter`
expect([retourner({ a: { b: 5 } }), permuter([1, 2, 3])]).toEqual([{ b: { a: 5 } }, [3, 1, 2]]);
@test `sans`
const o = { x: 1, y: 2 }; expect([sans(o, 'x'), sans(o, 'zut'), o]).toEqual([{ y: 2 }, { x: 1, y: 2 }, { x: 1, y: 2 }]);
@test `distance`
expect([distance([0, 0], [3, 4]), distance([], [3, 4])]).toEqual([5, 5]);
@test Aucun accès
expect($source.replace(/Math\.\w+/g, '').replace(/\.\.\./g, '')).not.toMatch(/\w\.\w|[\w)]\[/);
@hint
Clé variable : `const { [cle]: retire, ...reste } = objet;`
@solution
const premiers = ([un, deux, ...reste]) => ({ un, deux, reste });

const retourner = ({ a: { b: valeur } }) => ({ b: { a: valeur } });

const permuter = ([a, b, c]) => [c, a, b];

function sans(objet, cle) {
  const { [cle]: retire, ...reste } = objet;
  return reste;
}

const distance = ([x1 = 0, y1 = 0], [x2 = 0, y2 = 0]) => Math.hypot(x2 - x1, y2 - y1);
