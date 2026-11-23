# Modules
> Découper un programme en fichiers : import et export.

@@ lesson modules | import et export

Un fichier est un **module** : ses variables lui appartiennent, sauf celles qu'il exporte.

```js
// maths.js
export const PI = 3.14159;
export function aire(r) { return PI * r ** 2; }
const secret = 42;                 // pas exporté : invisible ailleurs

export default function carre(x) { return x * x; } // un seul export par défaut
```

```js
// main.js
import carre, { PI, aire as aireDuDisque } from './maths.js';
import * as maths from './maths.js'; // tout, dans un objet
console.log(carre(3), PI, aireDuDisque(1), maths.aire(2));
```

- Export **nommé** : on l'importe entre accolades, avec son nom (renommable avec `as`).
- Export **par défaut** : sans accolades, sous le nom qu'on veut. Beaucoup d'équipes préfèrent les exports nommés : le nom reste le même partout.
- Réexporter : `export { aire } from './maths.js';` ou `export * from './maths.js';`

### À savoir

- Un module n'est exécuté **qu'une fois**, au premier import. Tous les autres reçoivent la même instance.
- Un import est une **liaison** vivante : si le module change sa variable, tu le vois. Mais tu ne peux pas la réaffecter toi-même.
- Les modules sont toujours en mode **strict**.
- `await` est permis en haut d'un module.
- `import('./gros.js')` (dynamique) charge à la demande et donne une promesse.
- Un nom sans `./` (`import { z } from 'zod'`) désigne un paquet installé (npm).

Dans du code plus ancien pour Node, tu verras **CommonJS** : `const x = require('./x')` et `module.exports = …`. Même idée, autre syntaxe.

### En TypeScript

On exporte aussi des types. `import type` dit clairement « seulement pour les types », et disparaît à la compilation :

```ts
import { charger, type Reglages } from './reglages';
import type { Utilisateur } from './types';
```

@@ code decouper | Utiliser un module | js
Le module `geometrie.js` (en lecture seule) est prêt. Dans `main.js` :

1. importe la fonction par défaut sous le nom `cercle`
2. importe `rectangle`, **renommée** `rect`
3. calcule `total`, l'aire d'un cercle de rayon 1 plus celle d'un rectangle 2 × 3
@starter main.js

@starter geometrie.js readonly
export const rectangle = (l, h) => l * h;
export const triangle = (b, h) => (b * h) / 2;
export default function aireCercle(r) {
  return Math.PI * r * r;
}
@test `cercle` et `rect` sont importées
expect(cercle(2)).toBeCloseTo(12.566); expect(rect(2, 2)).toBe(4);
@test `total`
expect(total).toBeCloseTo(9.1416);
@hint
`import defaut, { nom as autre } from './geometrie.js';`
@solution main.js
import cercle, { rectangle as rect } from './geometrie.js';

const total = cercle(1) + rect(2, 3);

@@ code separer | Découper un fichier | js
Déplace `formaterPrix` et `TVA` dans `prix.js`, en exports **nommés**, et importe-les dans `main.js`. `main.js` ne doit plus contenir que `ticket`.
@starter main.js
const TVA = 0.2;

function formaterPrix(n) {
  return `${n.toFixed(2)} €`;
}

function ticket(ht) {
  return `${formaterPrix(ht)} + TVA = ${formaterPrix(ht * (1 + TVA))}`;
}
@starter prix.js
// À toi
@test `ticket` marche toujours
expect(ticket(10)).toBe('10.00 € + TVA = 12.00 €');
@test `main.js` importe depuis `./prix.js`
expect($source).toMatch(/import\s*\{[^}]*\}\s*from\s*["']\.\/prix(\.js)?["']/);
@test `main.js` ne définit plus `TVA` ni `formaterPrix`
expect($source).not.toMatch(/const TVA|function formaterPrix/);
@solution main.js
import { formaterPrix, TVA } from './prix.js';

function ticket(ht) {
  return `${formaterPrix(ht)} + TVA = ${formaterPrix(ht * (1 + TVA))}`;
}
@solution prix.js
export const TVA = 0.2;

export function formaterPrix(n) {
  return `${n.toFixed(2)} €`;
}

@@ code compteur-partage | Un état partagé, en TypeScript | ts
Écris `magasin.ts`, qui garde un état **privé au module** :

- `export interface Article { nom: string; prix: number }`
- `export function ajouter(a: Article): void`
- `export function total(): number`

`main.ts` (lecture seule) et `rayon.ts` l'utilisent tous les deux.
@starter main.ts readonly
import { remplir } from './rayon';
import { ajouter, total, type Article } from './magasin';

const stylo: Article = { nom: 'stylo', prix: 2 };
ajouter(stylo);
remplir();
const somme: number = total();
console.log(somme);
@starter rayon.ts readonly
import { ajouter } from './magasin';

export function remplir(): void {
  ajouter({ nom: 'cahier', prix: 5 });
  ajouter({ nom: 'sac', prix: 30 });
}
@starter magasin.ts

@test Les deux fichiers partagent le même état
expect(somme).toBe(37);
@test Le total s'affiche
expect($logs).toEqual(['37']);
@hint
Une simple `const articles: Article[] = [];` en haut du module, non exportée.
@solution magasin.ts
export interface Article {
  nom: string;
  prix: number;
}

const articles: Article[] = [];

export function ajouter(a: Article): void {
  articles.push(a);
}

export function total(): number {
  return articles.reduce((s, a) => s + a.prix, 0);
}

@@ predict import-defaut
Le module contient `export default 3;`. Comment l'importer ?
@answer `import n from './m.js'`
@wrong `import { n } from './m.js'`
@wrong `import * as default from './m.js'`
@wrong `import default from './m.js'`
@why Un export par défaut s'importe sans accolades, sous le nom qu'on veut.

@@ predict module-une-fois
Trois fichiers importent le même module, qui contient `console.log('chargé')`. Combien de fois le texte s'affiche-t-il ?
@answer Une fois
@wrong Trois fois
@wrong Jamais
@wrong Une fois par fonction importée
@why Un module n'est exécuté qu'au premier import.

@@ card export-nomme
Exporter puis importer une fonction `f` par son nom ?
@back
`export function f() {}` puis `import { f } from './fichier.js';`

@@ card import-type
À quoi sert `import type` ?
@back
À importer seulement des types : l'import disparaît à la compilation.

@@ defi cycle-modules | Casser un cycle | js
`user.js` et `commande.js` s'importent **l'un l'autre** au chargement : le programme plante. Répare-le en créant un troisième module, `base.js`, pour ce qui est partagé. Les deux fichiers ne doivent plus s'importer.
@starter main.js readonly
import { decrireUser } from './user.js';
import { decrireCommande } from './commande.js';

const resultat = [decrireUser('ada'), decrireCommande(5)];
@starter user.js
import { PREFIXE } from './commande.js';

export const formater = (x) => `<${x}>`;
export const ETIQUETTE = `${PREFIXE}user`;
export const decrireUser = (nom) => formater(`${ETIQUETTE} ${nom}`);
@starter commande.js
import { formater } from './user.js';

export const PREFIXE = 'app/';
export const TITRE = formater(`${PREFIXE}commande`);
export const decrireCommande = (n) => `${TITRE} ${n}`;
@starter base.js
// Ce qui est partagé
@test Le programme marche
expect(resultat).toEqual(['<app/user ada>', '<app/commande> 5']);
@solution user.js
import { formater, PREFIXE } from './base.js';

export const ETIQUETTE = `${PREFIXE}user`;
export const decrireUser = (nom) => formater(`${ETIQUETTE} ${nom}`);
@solution commande.js
import { formater, PREFIXE } from './base.js';

export const TITRE = formater(`${PREFIXE}commande`);
export const decrireCommande = (n) => `${TITRE} ${n}`;
@solution base.js
export const PREFIXE = 'app/';
export const formater = (x) => `<${x}>`;
