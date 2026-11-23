# Classes en TypeScript
> Visibilité, abstract, implements, génériques et décorateurs.

@@ lesson classes-ts | Ce que TypeScript ajoute

```ts-run
abstract class Compte {
  static #nombre = 0;
  readonly id: number;
  protected solde = 0;                          // ici et dans les classes filles

  constructor(public readonly titulaire: string, private code: number) {
    // « public » et « private » ici déclarent ET remplissent les champs
    this.id = ++Compte.#nombre;
  }

  abstract frais(): number;                     // à écrire dans les classes filles

  retirer(n: number, code: number): boolean {
    if (code !== this.code) return false;
    this.solde -= n + this.frais();
    return true;
  }
}

class CompteJeune extends Compte {
  override frais(): number { return 0; }        // override : vérifié
  get reste(): number { return this.solde; }
}

const c = new CompteJeune('Ada', 12);
console.log(c.titulaire, c.id, c.retirer(5, 12), c.reste);
```

| | Visible |
|---|---|
| `public` | partout (par défaut) |
| `protected` | dans la classe et ses filles |
| `private` | dans la classe, **à la compilation seulement** |
| `#champ` | dans la classe, **vraiment** (JavaScript) |

`abstract` : une classe qu'on ne peut pas instancier, seulement étendre.

### implements

Une classe **promet** de respecter une interface. Cela n'ajoute rien, cela vérifie :

```ts-run
interface Stockage<T> {
  lire(cle: string): T | undefined;
  ecrire(cle: string, valeur: T): void;
}
class EnMemoire<T> implements Stockage<T> {
  #donnees = new Map<string, T>();
  lire(cle: string) { return this.#donnees.get(cle); }
  ecrire(cle: string, valeur: T) { this.#donnees.set(cle, valeur); }
}
const s: Stockage<number> = new EnMemoire();
s.ecrire('a', 1);
console.log(s.lire('a'));
```

Dépendre de l'interface plutôt que de la classe permet d'en changer (par exemple pour les tests).

### this comme type

`this` en type de retour garde la classe **fille** dans un enchaînement : `ajouter(x: T): this`.

### Le type d'une classe

`Compte` est à la fois une valeur (la classe) et un type (ses instances). Le type de la classe elle-même : `typeof Compte`. Et `InstanceType<typeof Compte>` revient aux instances.

### Décorateurs

Une fonction qui transforme une classe ou un de ses membres :

```ts-run
function journal<A extends unknown[], R>(
  methode: (this: object, ...args: A) => R,
  contexte: ClassMethodDecoratorContext,
) {
  return function (this: object, ...args: A): R {
    console.log(`→ ${String(contexte.name)}`, args);
    return methode.call(this, ...args);
  };
}

class Calcul {
  @journal
  additionner(a: number, b: number): number { return a + b; }
}
console.log(new Calcul().additionner(1, 2));
```

### using : libérer automatiquement

À la fin du bloc, `[Symbol.dispose]()` est appelée, même en cas d'erreur :

```ts
{
  using fichier = ouvrir('a.txt'); // objet avec [Symbol.dispose]() {}
} // ici, il est fermé
```

@@ code compte-ts | Visibilité | ts
Classe `Thermostat` :

- constructeur `(piece, temperature = 19)` : `piece` est publique en lecture seule (écris-la directement dans le constructeur)
- la température est **privée** (`#`), lue par le getter `temperature`
- le setter `temperature` borne entre 5 et 30
- méthode statique `froid(piece)` : un thermostat à 5 degrés
@starter
class Thermostat {
}
@test Valeurs de départ
expect([new Thermostat('salon').temperature, new Thermostat('salon', 22).temperature, new Thermostat('salon').piece]).toEqual([19, 22, 'salon']);
@test Bornes, aussi à la création
const t = new Thermostat('a'); t.temperature = 99; expect(t.temperature).toBe(30); t.temperature = -5; expect(t.temperature).toBe(5); expect(new Thermostat('a', 50).temperature).toBe(30);
@test `froid`
expect(Thermostat.froid('cave').temperature).toBe(5);
@types `piece` est en lecture seule
const t = new Thermostat('a');
// @ts-expect-error
t.piece = 'b';
@types `temperature` est un nombre
const t = new Thermostat('a'); const n: number = t.temperature; t.temperature = 3;
// @ts-expect-error
t.temperature = '3';
@solution
class Thermostat {
  #temperature = 19;

  constructor(public readonly piece: string, temperature = 19) {
    this.temperature = temperature;
  }

  get temperature(): number {
    return this.#temperature;
  }

  set temperature(valeur: number) {
    this.#temperature = Math.min(30, Math.max(5, valeur));
  }

  static froid(piece: string): Thermostat {
    return new Thermostat(piece, 5);
  }
}

@@ code abstraite | Classe abstraite | ts
- `Employe`, abstraite : constructeur `(nom, salaireBase)` (tous deux `protected` et en lecture seule), méthode abstraite `prime(): number`, méthode `fiche()` → `'<nom> : <base + prime> €'`
- `Vendeur extends Employe` : constructeur `(nom, base, ventes)`, prime = 10 % des ventes
- `Stagiaire extends Employe` : prime = 0
@starter

@test Fiches
expect([new Vendeur('Ada', 1500, 2000).fiche(), new Stagiaire('Max', 600).fiche()]).toEqual(['Ada : 1700 €', 'Max : 600 €']);
@test `fiche` n'est écrite qu'une fois
expect($source.match(/fiche\s*\(/g)).toHaveLength(1);
@types `Employe` est abstraite
// @ts-expect-error
new Employe('a', 1);
@types `nom` est protégé
// @ts-expect-error
new Stagiaire('a', 1).nom;
@types Une classe fille doit écrire `prime`
// @ts-expect-error
class Oubli extends Employe {}
@types Un `Vendeur` est un `Employe`
const e: Employe = new Vendeur('a', 1, 2);
@solution
abstract class Employe {
  constructor(protected readonly nom: string, protected readonly salaireBase: number) {}

  abstract prime(): number;

  fiche(): string {
    return `${this.nom} : ${this.salaireBase + this.prime()} €`;
  }
}

class Vendeur extends Employe {
  constructor(nom: string, salaireBase: number, private readonly ventes: number) {
    super(nom, salaireBase);
  }

  override prime(): number {
    return this.ventes * 0.1;
  }
}

class Stagiaire extends Employe {
  override prime(): number {
    return 0;
  }
}

@@ code depot | Un dépôt générique | ts
L'interface `Depot<T>` est donnée. Écris `DepotMemoire<T extends { id: number }>` qui l'implémente. `ajouter` s'enchaîne (retour `this`) ; `supprimer` dit si l'élément existait ; `tous` renvoie une copie, triée par `id`.
@starter
interface Depot<T> {
  ajouter(element: T): this;
  lire(id: number): T | undefined;
  supprimer(id: number): boolean;
  tous(): T[];
  chercher(test: (element: T) => boolean): T[];
}

@test Ajoute et lit
const d = new DepotMemoire(); d.ajouter({ id: 2, n: 'b' }).ajouter({ id: 1, n: 'a' }); expect([d.lire(1), d.lire(9)]).toEqual([{ id: 1, n: 'a' }, undefined]);
@test `tous` trie, `ajouter` remplace
const d = new DepotMemoire().ajouter({ id: 2 }).ajouter({ id: 1 }).ajouter({ id: 2, x: 1 }); expect(d.tous()).toEqual([{ id: 1 }, { id: 2, x: 1 }]); d.tous().pop(); expect(d.tous()).toHaveLength(2);
@test `supprimer` et `chercher`
const d = new DepotMemoire().ajouter({ id: 1 }).ajouter({ id: 2 }); expect(d.chercher((e) => e.id > 1)).toEqual([{ id: 2 }]); expect([d.supprimer(1), d.supprimer(1)]).toEqual([true, false]);
@types C'est un `Depot`
const d: Depot<{ id: number; nom: string }> = new DepotMemoire<{ id: number; nom: string }>(); const n: string | undefined = d.lire(1)?.nom;
@types `id` est obligatoire
// @ts-expect-error
new DepotMemoire<{ nom: string }>();
@solution
interface Depot<T> {
  ajouter(element: T): this;
  lire(id: number): T | undefined;
  supprimer(id: number): boolean;
  tous(): T[];
  chercher(test: (element: T) => boolean): T[];
}

class DepotMemoire<T extends { id: number }> implements Depot<T> {
  #elements = new Map<number, T>();

  ajouter(element: T): this {
    this.#elements.set(element.id, element);
    return this;
  }

  lire(id: number): T | undefined {
    return this.#elements.get(id);
  }

  supprimer(id: number): boolean {
    return this.#elements.delete(id);
  }

  tous(): T[] {
    return [...this.#elements.values()].sort((a, b) => a.id - b.id);
  }

  chercher(test: (element: T) => boolean): T[] {
    return this.tous().filter(test);
  }
}

@@ predict private-runtime
Après compilation, que reste-t-il de `private x = 1` ?
@answer Un champ normal, accessible en JavaScript
@wrong Un champ `#x`
@wrong Rien : il est supprimé
@wrong Une variable du module
@why `private` n'existe qu'à la compilation. Pour un vrai champ privé : `#x`.

@@ predict implements
Que fait `implements Stockage` sur une classe ?
@answer Vérifie qu'elle a tout ce que l'interface demande
@wrong Copie les méthodes de l'interface
@wrong Ajoute `Stockage` à la chaîne de prototypes
@wrong Permet `instanceof Stockage`
@why Une interface n'existe pas à l'exécution : `implements` n'est qu'une vérification.

@@ card param-prop
Que fait `constructor(public nom: string) {}` ?
@back
Déclare le champ `nom` **et** le remplit avec l'argument.

@@ card protected
`private`, `protected`, `#` ?
@back
`private` : la classe (compilation). `protected` : la classe et ses filles. `#` : la classe, réellement.

@@ card abstract
À quoi sert une méthode `abstract` ?
@back
À obliger les classes filles à l'écrire.

@@ defi decorateurs | Des décorateurs utiles | ts
Écris trois décorateurs de **méthodes** :

- `@memo` : garde le résultat par argument (un seul argument, primitif), **par instance**
- `@limite(n)` : lance une `Error` au-delà de `n` appels sur la même instance
- `@lie` : lie la méthode à son instance (utilisable en callback)
@starter

@test `@memo`
let n = 0; class A { k = 2; @memo carre(x) { n++; return x * x * this.k; } } const a = new A(); expect([a.carre(3), a.carre(3), a.carre(4), n]).toEqual([18, 18, 32, 2]);
@test `@memo`, par instance, et valeurs falsy
let n = 0; class A { constructor(k) { this.k = k; } @memo f(x) { n++; return x * this.k; } } const [a, b] = [new A(1), new A(5)]; expect([a.f(0), a.f(0), b.f(2), n]).toEqual([0, 0, 10, 2]);
@test `@limite`
class A { @limite(2) f() { return 'ok'; } } const a = new A(); expect([a.f(), a.f(), new A().f()]).toEqual(['ok', 'ok', 'ok']); expect(() => a.f()).toThrow();
@test `@lie`
class A { n = 5; @lie lire() { return this?.n; } } const { lire } = new A(); expect(lire()).toBe(5);
@test Combinés
class A { n = 1; @lie @limite(1) f() { return this.n; } } const { f } = new A(); expect(f()).toBe(1); expect(() => f()).toThrow();
@types Gardent la signature
class A { @memo f(x: number): string { return String(x); } @limite(3) g(): number { return 1; } @lie h(): boolean { return true; } } const s: string = new A().f(3);
// @ts-expect-error
new A().f('x');
@hint
Une `WeakMap` de l'instance vers son cache ou son compteur. `@lie` utilise `contexte.addInitializer(function () { … })`, où `this` est l'instance.
@solution
function memo<T extends object, A, R>(methode: (this: T, x: A) => R, _contexte: ClassMethodDecoratorContext<T>) {
  const caches = new WeakMap<T, Map<A, R>>();
  return function (this: T, x: A): R {
    const cache = caches.get(this) ?? new Map<A, R>();
    caches.set(this, cache);
    if (!cache.has(x)) cache.set(x, methode.call(this, x));
    return cache.get(x) as R;
  };
}

function limite(n: number) {
  return function <T extends object, A extends unknown[], R>(
    methode: (this: T, ...args: A) => R,
    contexte: ClassMethodDecoratorContext<T>,
  ) {
    const appels = new WeakMap<T, number>();
    return function (this: T, ...args: A): R {
      const total = (appels.get(this) ?? 0) + 1;
      if (total > n) throw new Error(`${String(contexte.name)} : ${n} appels au plus`);
      appels.set(this, total);
      return methode.call(this, ...args);
    };
  };
}

function lie<T extends object, A extends unknown[], R>(
  _methode: (this: T, ...args: A) => R,
  contexte: ClassMethodDecoratorContext<T>,
): void {
  contexte.addInitializer(function () {
    const f = contexte.access.get(this) as (this: T, ...args: A) => R;
    Object.defineProperty(this, contexte.name, { value: f.bind(this), configurable: true, writable: true });
  });
}
