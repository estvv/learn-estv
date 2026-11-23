# this et prototypes
> Qui est this, et comment les objets héritent les uns des autres.

@@ lesson this | this

`this` ne dépend pas de l'endroit où la fonction est écrite, mais de **la façon dont on l'appelle** :

| Appel | `this` |
|---|---|
| `obj.f()` | `obj` |
| `f()` | `undefined` (en mode strict, donc dans les modules) |
| `new F()` | le nouvel objet |
| `f.call(x, a, b)`, `f.apply(x, [a, b])` | `x` |
| `f.bind(x)` | une copie de `f` dont `this` est fixé à `x` |
| fonction **fléchée** | celui de l'endroit où elle est écrite |

```js-run
const chat = {
  nom: 'Mia',
  dire() { return `${this?.nom} miaule`; },
};
console.log(chat.dire());
const f = chat.dire;            // la méthode seule, sans son objet
console.log(f());
console.log(f.call({ nom: 'Tom' }), f.bind(chat)());
```

Le piège arrive quand on passe une méthode en callback : `setTimeout(chat.dire)`. Passe plutôt `() => chat.dire()`.

Les fléchées n'ont pas de `this` à elles : parfait pour un callback dans une méthode, à éviter **comme** méthode.

```js-run
const equipe = {
  nom: 'A',
  membres: ['x', 'y'],
  liste() {
    return this.membres.map((m) => `${this.nom}:${m}`); // this = equipe
  },
};
console.log(equipe.liste());
```

@@ lesson prototypes | Prototypes

Chaque objet a un **prototype**, un autre objet. Quand une propriété manque, JavaScript la cherche dans le prototype, puis dans le prototype du prototype… jusqu'à `null`. C'est la **chaîne de prototypes**.

```js-run
const animal = { respire: true, dire() { return `Je suis ${this.nom}`; } };
const chien = Object.create(animal); // chien a animal pour prototype
chien.nom = 'Rex';
console.log(chien.respire, chien.dire());
console.log(Object.hasOwn(chien, 'respire'), 'respire' in chien);
console.log(Object.getPrototypeOf(chien) === animal);
```

C'est de là que viennent `[].map` (`Array.prototype`) ou `'a'.trim` (`String.prototype`).

Écrire une propriété ne touche **jamais** le prototype : elle est créée sur l'objet.

```js-run
const base = { couleur: 'bleu' };
const o = Object.create(base);
o.couleur = 'rouge';
console.log(o.couleur, base.couleur);
```

### Fonctions constructrices

Avant `class`, on écrivait ceci ; `class` fait pareil en plus lisible :

```js-run
function Point(x, y) {
  this.x = x;
  this.y = y;
}
Point.prototype.norme = function () {
  return Math.hypot(this.x, this.y);
};
const p = new Point(3, 4);
console.log(p.norme(), p instanceof Point);
```

`new` crée un objet, lui donne `Point.prototype` pour prototype, appelle la fonction avec `this` = cet objet, puis le renvoie. `a instanceof B` demande si `B.prototype` est dans la chaîne de `a`.

### Getters et setters

```js-run
const temp = {
  celsius: 20,
  get fahrenheit() { return this.celsius * 1.8 + 32; },
  set fahrenheit(f) { this.celsius = (f - 32) / 1.8; },
};
temp.fahrenheit = 212; // s'utilise comme une propriété
console.log(temp.celsius, temp.fahrenheit);
```

@@ code minuterie | Réparer this | js
`equipe.presenter()` plante. Corrige la fonction passée à `map`, **sans** variable supplémentaire ni `bind`.
@starter
const equipe = {
  nom: 'Rouge',
  membres: ['Ada', 'Linus'],
  presenter() {
    return this.membres.map(function (m) {
      return `${m} (${this.nom})`;
    });
  },
};
@test Présente l'équipe
expect(equipe.presenter()).toEqual(['Ada (Rouge)', 'Linus (Rouge)']);
@test Sans détour
expect($source).not.toMatch(/bind|call|apply/);
@solution
const equipe = {
  nom: 'Rouge',
  membres: ['Ada', 'Linus'],
  presenter() {
    return this.membres.map((m) => `${m} (${this.nom})`);
  },
};

@@ code mon-bind | Écrire bind | js
`monBind(f, objet, ...fixes)` renvoie une fonction qui appelle `f` avec `this` = `objet`, les arguments `fixes` d'abord, puis ceux de l'appel. Sans utiliser `bind`.
@starter
function monBind(f, objet, ...fixes) {
}
@test Fixe `this`
const g = monBind(function () { return this.n; }, { n: 3 }); expect(g()).toBe(3); expect(g.call({ n: 9 })).toBe(3);
@test Fixe des arguments
expect(monBind((a, b, c) => [a, b, c], null, 1, 2)(3)).toEqual([1, 2, 3]);
@test Sans `bind`
expect($source.replace(/monBind/g, '')).not.toMatch(/bind/);
@solution
function monBind(f, objet, ...fixes) {
  return (...args) => f.call(objet, ...fixes, ...args);
}

@@ code heritage | Hériter sans class | js
Crée avec `Object.create` :

- `vehicule` : un objet avec `vitesse: 0` et une méthode `accelerer(n)` qui augmente sa vitesse et renvoie `this`
- `creerVelo(nom)` : renvoie un objet dont le prototype est `vehicule`, avec son propre `nom`
@starter

@test `creerVelo` donne un objet avec un nom
expect(creerVelo('VTT').nom).toBe('VTT'); expect(Object.keys(creerVelo('VTT'))).toEqual(['nom']);
@test Son prototype est `vehicule`
expect(Object.getPrototypeOf(creerVelo('a'))).toBe(vehicule);
@test `accelerer` s'enchaîne
expect(creerVelo('a').accelerer(10).accelerer(5).vitesse).toBe(15);
@test Accélérer un vélo ne touche ni l'autre, ni `vehicule`
const a = creerVelo('a'); const b = creerVelo('b'); a.accelerer(10); expect([b.vitesse, vehicule.vitesse]).toEqual([0, 0]);
@solution
const vehicule = {
  vitesse: 0,
  accelerer(n) {
    this.vitesse += n;
    return this;
  },
};

function creerVelo(nom) {
  const velo = Object.create(vehicule);
  velo.nom = nom;
  return velo;
}

@@ code mon-new | Écrire new | js
`nouveau(Constructeur, ...args)` fait ce que fait `new`, **sans** l'utiliser : objet au bon prototype, appel du constructeur avec `this`, et renvoi de l'objet. Si le constructeur renvoie lui-même un objet, c'est celui-là qui est renvoyé.
@starter
function nouveau(Constructeur, ...args) {
}
@test Crée l'objet
function P(x) { this.x = x; } expect(nouveau(P, 3).x).toBe(3);
@test Le prototype est le bon
function P() {} P.prototype.dire = () => 'ok'; const p = nouveau(P); expect(p.dire()).toBe('ok'); expect(p).toBeInstanceOf(P);
@test Un objet renvoyé l'emporte, pas un primitif
function A() { return { a: 1 }; } function B() { this.b = 2; return 5; } expect(nouveau(A)).toEqual({ a: 1 }); expect(nouveau(B).b).toBe(2);
@test Sans `new`
expect($source).not.toMatch(/\bnew\b/);
@hint
`Object.create(Constructeur.prototype)`, puis `Constructeur.call(objet, ...args)`.
@solution
function nouveau(Constructeur, ...args) {
  const objet = Object.create(Constructeur.prototype);
  const renvoye = Constructeur.call(objet, ...args);
  return typeof renvoye === 'object' && renvoye !== null ? renvoye : objet;
}

@@ predict this-perdu
Qu'affiche ce code ?
```js
const o = { n: 1, f() { return this?.n; } };
const { f } = o;
console.log(o.f(), f());
```
@answer `1 undefined`
@wrong `1 1`
@wrong `undefined undefined`
@wrong Une TypeError
@why Appelée seule, la méthode perd son objet.

@@ predict this-flechee
Qu'affiche ce code ?
```js
const o = { n: 1, f: () => typeof this };
console.log(o.f());
```
@answer `undefined`
@wrong `object`
@wrong `number`
@wrong `function`
@why Une fléchée prend le `this` de l'endroit où elle est écrite : le haut du module, où il vaut `undefined`.

@@ predict masquer-proto
Qu'affiche ce code ?
```js
const a = { x: 1 };
const b = Object.create(a);
b.x = 2;
delete b.x;
console.log(b.x);
```
@answer `1`
@wrong `undefined`
@wrong `2`
@wrong Une TypeError
@why Une fois la propriété propre supprimée, on retrouve celle du prototype.

@@ card this-regle
De quoi dépend `this` dans une fonction normale ? Dans une fléchée ?
@back
Normale : de la façon dont elle est **appelée**. Fléchée : de l'endroit où elle est **écrite**.

@@ card bind
Différence entre `call`, `apply` et `bind` ?
@back
`call(x, a, b)` et `apply(x, [a, b])` appellent tout de suite ; `bind(x)` renvoie une fonction liée.

@@ card instanceof
Que teste `a instanceof B` ?
@back
Si `B.prototype` est dans la chaîne de prototypes de `a`.

@@ defi mixins | Mixins et instanceof | js
- `melanger(cible, ...sources)` : copie sur `cible` **tous** les membres propres des sources (getters compris, sans les exécuter ; clés symboles comprises), et renvoie `cible`
- `estInstance(objet, Classe)` : réécris `instanceof`, sans l'utiliser
- `chaine(objet)` : la liste des prototypes de l'objet, du plus proche à `Object.prototype`
@starter

@test `melanger` garde les getters
const o = melanger({ n: 2 }, { get double() { return this.n * 2; }, dire() { return this.n; } }); expect([o.double, o.dire()]).toEqual([4, 2]); o.n = 10; expect(o.double).toBe(20);
@test Symboles, et ordre
const s = Symbol(); const o = melanger({}, { a: 1, [s]: 1 }, { a: 2 }); expect([o.a, o[s]]).toEqual([2, 1]);
@test `estInstance`
class A {} class B extends A {} expect([estInstance(new B(), A), estInstance(new A(), B), estInstance([], Object), estInstance(3, Number), estInstance(null, Object), estInstance(Object.create(null), Object)]).toEqual([true, false, true, false, false, false]);
@test `chaine`
class A {} class B extends A {} expect(chaine(new B())).toEqual([B.prototype, A.prototype, Object.prototype]); expect(chaine(Object.create(null))).toEqual([]);
@test Sans `instanceof`
expect($source).not.toMatch(/instanceof|isPrototypeOf/);
@solution
function melanger(cible, ...sources) {
  for (const source of sources) {
    for (const cle of Reflect.ownKeys(source)) {
      Object.defineProperty(cible, cle, Object.getOwnPropertyDescriptor(source, cle));
    }
  }
  return cible;
}

function chaine(objet) {
  const liste = [];
  for (let p = Object.getPrototypeOf(objet); p; p = Object.getPrototypeOf(p)) liste.push(p);
  return liste;
}

function estInstance(objet, Classe) {
  if (objet === null || !['object', 'function'].includes(typeof objet)) return false;
  return chaine(objet).includes(Classe.prototype);
}
