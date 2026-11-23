# Classes
> Champs, méthodes, privé, héritage.

@@ lesson classes | Les classes

```js-run
class Compte {
  solde = 0;               // champ public
  #code;                   // champ privé : inaccessible dehors
  static nombre = 0;       // sur la classe, pas sur les instances

  constructor(titulaire, code) {
    this.titulaire = titulaire;
    this.#code = code;
    Compte.nombre++;
  }

  deposer(n) {             // méthode (sur le prototype)
    this.solde += n;
    return this;           // pour enchaîner
  }

  get resume() {           // getter
    return `${this.titulaire} : ${this.solde} €`;
  }

  #verifier(code) {        // méthode privée
    return code === this.#code;
  }

  retirer(n, code) {
    if (!this.#verifier(code)) return false;
    this.solde -= n;
    return true;
  }

  static vide() {          // méthode statique
    return new Compte('anonyme', 0);
  }
}

const c = new Compte('Ada', 1234);
c.deposer(50).deposer(20);
console.log(c.resume, c.retirer(10, 1), c.retirer(10, 1234), c.solde);
console.log(Compte.nombre, Compte.vide().titulaire);
```

`class` n'est qu'une écriture plus claire des prototypes : `typeof Compte` est `'function'`. Le corps d'une classe n'a pas de virgules entre ses membres.

### Hériter

```js-run
class Animal {
  constructor(nom) { this.nom = nom; }
  crier() { return `${this.nom} fait du bruit`; }
}
class Chien extends Animal {
  constructor(nom, race) {
    super(nom);            // obligatoire avant d'utiliser this
    this.race = race;
  }
  crier() {
    return `${super.crier()} : ouaf`; // la version du parent
  }
}
const rex = new Chien('Rex', 'berger');
console.log(rex.crier(), rex instanceof Animal);
```

Hérite avec modération : souvent, un objet qui en **contient** un autre (composition) est plus simple.

### Méthode en callback

Une méthode passée seule perd `this`. Un champ fléché règle le problème :

```js-run
class Bouton {
  clics = 0;
  cliquer = () => { this.clics++; };
}
const b = new Bouton();
const f = b.cliquer;
f();
console.log(b.clics);
```

### En TypeScript

On déclare les champs avec leur type. Le parcours TypeScript y reviendra (`private`, `abstract`, `implements`…).

```ts-run
class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  distance(autre: Point): number {
    return Math.hypot(this.x - autre.x, this.y - autre.y);
  }
}
console.log(new Point(0, 0).distance(new Point(3, 4)));
```

@@ code rectangle | Un rectangle | js
Classe `Rectangle` : constructeur `(largeur, hauteur)`, getters `aire` et `perimetre`, méthode `agrandir(facteur)` qui modifie le rectangle et renvoie `this`, et méthode **statique** `carre(cote)`.
@starter
class Rectangle {
}
@test Aire et périmètre
const r = new Rectangle(2, 5); expect([r.aire, r.perimetre]).toEqual([10, 14]);
@test `agrandir` s'enchaîne
expect(new Rectangle(1, 2).agrandir(2).agrandir(3).aire).toBe(72);
@test `carre`
const c = Rectangle.carre(4); expect(c).toBeInstanceOf(Rectangle); expect(c.aire).toBe(16);
@test `aire` est bien un getter
expect($source).toMatch(/get aire/);
@solution
class Rectangle {
  constructor(largeur, hauteur) {
    this.largeur = largeur;
    this.hauteur = hauteur;
  }

  get aire() {
    return this.largeur * this.hauteur;
  }

  get perimetre() {
    return 2 * (this.largeur + this.hauteur);
  }

  agrandir(facteur) {
    this.largeur *= facteur;
    this.hauteur *= facteur;
    return this;
  }

  static carre(cote) {
    return new Rectangle(cote, cote);
  }
}

@@ code pile | Une pile privée | js
Classe `Pile` : `empiler(x)` (renvoie `this`), `depiler()` (renvoie et retire le dernier, `undefined` si vide), `sommet()` (sans retirer), getter `taille`. Les éléments sont dans un champ **privé** `#`.
@starter

@test Empile et dépile
const p = new Pile(); p.empiler(1).empiler(2); expect([p.depiler(), p.depiler(), p.depiler()]).toEqual([2, 1, undefined]);
@test `sommet` et `taille`
const p = new Pile().empiler('a'); expect([p.sommet(), p.taille, p.sommet()]).toEqual(['a', 1, 'a']);
@test Rien n'est visible de l'extérieur
expect(Object.keys(new Pile().empiler(1))).toEqual([]);
@test Piles indépendantes
const a = new Pile().empiler(1); expect(new Pile().taille).toBe(0);
@solution
class Pile {
  #elements = [];

  empiler(x) {
    this.#elements.push(x);
    return this;
  }

  depiler() {
    return this.#elements.pop();
  }

  sommet() {
    return this.#elements.at(-1);
  }

  get taille() {
    return this.#elements.length;
  }
}

@@ code formes | Héritage | js
- `Forme` : constructeur `(nom)`, méthode `aire()` qui renvoie `0`, méthode `decrire()` qui renvoie `'<nom> : <aire>'`, l'aire avec 2 décimales
- `Cercle extends Forme` : constructeur `(rayon)`, nom `'cercle'`
- `Carre extends Forme` : constructeur `(cote)`, nom `'carré'`

`decrire` n'est écrite qu'une fois, dans `Forme`.
@starter

@test `Forme`
expect(new Forme('rien').decrire()).toBe('rien : 0.00');
@test `Cercle` et `Carre`
expect(new Cercle(1).decrire()).toBe('cercle : 3.14'); expect(new Carre(3).decrire()).toBe('carré : 9.00');
@test Ce sont des formes
expect(new Carre(1)).toBeInstanceOf(Forme);
@test `decrire` n'est écrite qu'une fois
expect($source.match(/decrire\s*\(/g)).toHaveLength(1);
@solution
class Forme {
  constructor(nom) {
    this.nom = nom;
  }

  aire() {
    return 0;
  }

  decrire() {
    return `${this.nom} : ${this.aire().toFixed(2)}`;
  }
}

class Cercle extends Forme {
  constructor(rayon) {
    super('cercle');
    this.rayon = rayon;
  }

  aire() {
    return Math.PI * this.rayon ** 2;
  }
}

class Carre extends Forme {
  constructor(cote) {
    super('carré');
    this.cote = cote;
  }

  aire() {
    return this.cote ** 2;
  }
}

@@ code evenements | Émetteur d'événements, en TypeScript | ts
Classe `Emetteur` :

- `on(nom, f)` abonne `f` à un événement et renvoie une **fonction de désabonnement**
- `emit(nom, donnee)` appelle les abonnés dans l'ordre, et renvoie leur nombre

`f` est de type `(donnee: unknown) => void`.
@starter
class Emetteur {
}
@test Appelle les abonnés dans l'ordre
const e = new Emetteur(); const l = []; e.on('a', (x) => l.push(['1', x])); e.on('a', (x) => l.push(['2', x])); expect(e.emit('a', 7)).toBe(2); expect(l).toEqual([['1', 7], ['2', 7]]);
@test Événement sans abonné
expect(new Emetteur().emit('rien')).toBe(0);
@test Désabonnement
const e = new Emetteur(); let n = 0; const off = e.on('a', () => { n++; }); e.emit('a'); off(); expect(e.emit('a')).toBe(0); expect(n).toBe(1);
@types Signatures
const e = new Emetteur(); const off: () => void = e.on('a', (d: unknown) => {}); const n: number = e.emit('a', 3); e.emit('a');
@types Le nom est un texte
// @ts-expect-error
new Emetteur().on(3, () => {});
@hint
Un champ privé : `#abonnes = new Map<string, ((donnee: unknown) => void)[]>();`
@solution
type Abonne = (donnee: unknown) => void;

class Emetteur {
  #abonnes = new Map<string, Abonne[]>();

  on(nom: string, f: Abonne): () => void {
    this.#abonnes.set(nom, [...(this.#abonnes.get(nom) ?? []), f]);
    return () => {
      this.#abonnes.set(nom, (this.#abonnes.get(nom) ?? []).filter((g) => g !== f));
    };
  }

  emit(nom: string, donnee?: unknown): number {
    const liste = this.#abonnes.get(nom) ?? [];
    for (const f of liste) f(donnee);
    return liste.length;
  }
}

@@ predict super
Que se passe-t-il ?
```js
class A {}
class B extends A {
  constructor() { this.x = 1; }
}
console.log(new B().x);
```
@answer Une ReferenceError
@wrong `1`
@wrong `undefined`
@wrong Une SyntaxError
@why Dans une classe fille, `super()` est obligatoire avant d'utiliser `this`.

@@ predict statique
Qu'affiche ce code ?
```js
class A { static n = 1; m = 2; }
console.log(A.n, A.m, new A().n, new A().m);
```
@answer `1 undefined undefined 2`
@wrong `1 2 1 2`
@wrong `1 undefined 1 2`
@wrong `undefined 2 1 2`
@why `static` est sur la classe ; les autres champs, sur chaque instance.

@@ predict typeof-class
Qu'affiche ce code ?
```js
class A {}
console.log(typeof A, typeof new A());
```
@answer `function object`
@wrong `class object`
@wrong `object object`
@wrong `class A`
@why Une classe est une fonction (constructrice) particulière.

@@ card prive
Déclarer un champ privé dans une classe ?
@back
Avec `#` : `#secret = 0;` puis `this.#secret`

@@ card super-deux
Les deux usages de `super` ?
@back
`super(...)` appelle le constructeur du parent ; `super.methode()` appelle sa version d'une méthode.

@@ card getter
Écris un getter `aire` dans une classe.
@back
`get aire() { return … }`, utilisé sans parenthèses : `r.aire`

@@ defi argent | Une classe immuable | ts
Classe `Argent`, **immuable** et exacte (elle compte en centimes entiers) :

- `Argent.de(12.5)`, `Argent.zero` (statiques) ; le constructeur est privé
- `plus(a)`, `moins(a)`, `fois(n)` (arrondi au centime) : de nouveaux objets
- `partager(n)` : `n` parts dont la somme fait **exactement** le total, les premières recevant les centimes en trop
- `compare(a)` (négatif, 0 ou positif), `egale(a)`
- `toString()` → `'12.50 €'`, `toJSON()` → les centimes
@starter

@test Calculs exacts
expect([String(Argent.de(0.1).plus(Argent.de(0.2))), String(Argent.de(10).moins(Argent.de(0.01))), String(Argent.de(9.99).fois(1.2)), String(Argent.zero)]).toEqual(['0.30 €', '9.99 €', '11.99 €', '0.00 €']);
@test Négatifs
expect(String(Argent.de(1).moins(Argent.de(3.5)))).toBe('-2.50 €');
@test Partager
expect(Argent.de(10).partager(3).map(String)).toEqual(['3.34 €', '3.33 €', '3.33 €']); expect(Argent.de(0.05).partager(2).map(String)).toEqual(['0.03 €', '0.02 €']);
@test Comparer, JSON
const a = Argent.de(2); expect([a.egale(Argent.de(2)), a.compare(Argent.de(3)) < 0, JSON.stringify({ a }), [Argent.de(3), a].sort((x, y) => x.compare(y)).map(String)]).toEqual([true, true, '{"a":200}', ['2.00 €', '3.00 €']]);
@test Immuable
const a = Argent.de(5); a.plus(Argent.de(1)); a.fois(3); expect(String(a)).toBe('5.00 €');
@types Le constructeur est privé
// @ts-expect-error
new Argent(3);
@types Seulement de l'argent
// @ts-expect-error
Argent.de(1).plus(3);
@solution
class Argent {
  static readonly zero = new Argent(0);

  private constructor(private readonly centimes: number) {}

  static de(euros: number): Argent {
    return new Argent(Math.round(euros * 100));
  }

  plus(a: Argent): Argent {
    return new Argent(this.centimes + a.centimes);
  }

  moins(a: Argent): Argent {
    return new Argent(this.centimes - a.centimes);
  }

  fois(n: number): Argent {
    return new Argent(Math.round(this.centimes * n));
  }

  partager(n: number): Argent[] {
    const base = Math.floor(this.centimes / n);
    const enTrop = this.centimes - base * n;
    return Array.from({ length: n }, (_, i) => new Argent(base + (i < enTrop ? 1 : 0)));
  }

  compare(a: Argent): number {
    return this.centimes - a.centimes;
  }

  egale(a: Argent): boolean {
    return this.compare(a) === 0;
  }

  toString(): string {
    return `${(this.centimes / 100).toFixed(2)} €`;
  }

  toJSON(): number {
    return this.centimes;
  }
}
