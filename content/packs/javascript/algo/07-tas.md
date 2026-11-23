# Tas et files de priorité
> Toujours avoir le plus petit (ou le plus urgent) sous la main.

@@ lesson tas | Le tas binaire

Un **tas** (*heap*) donne le plus petit élément en O(1), ajoute et retire en O(log n). C'est la structure des files de priorité.

C'est un arbre binaire **complet** où chaque parent est plus petit que ses enfants, rangé dans un simple tableau :

| | Indice |
|---|---|
| parent de i | `(i - 1) >> 1` |
| enfants de i | `2 * i + 1` et `2 * i + 2` |

```ts-run
const tas = [1, 3, 2, 7, 4];
const valable = tas.every((x, i) => i === 0 || tas[(i - 1) >> 1] <= x);
console.log(valable);
```

- **Ajouter** : mettre à la fin, puis **remonter** (échanger avec le parent tant qu'il est plus grand).
- **Retirer le minimum** : prendre le premier, mettre le dernier à sa place, puis **descendre** (échanger avec le plus petit enfant).

### Usages

- **Les k plus grands** : un tas **min** de taille k. Si un élément dépasse le minimum, il le remplace : O(n log k), et peu de mémoire.
- **Fusionner** k listes triées.
- **Ordonnanceur** : la prochaine tâche à exécuter.
- **Dijkstra** (unité suivante).
- **Médiane en continu** : un tas max pour la moitié basse, un tas min pour la haute.

Pour un tas **max**, inverse la comparaison.

@@ code file-priorite | File de priorité | ts
Classe `FilePriorite<T>` : constructeur `(comparer: (a: T, b: T) => number)`, `ajouter(x)` (renvoie `this`), `retirer()` (le plus petit, ou `undefined`), `sommet()`, getter `taille`. `ajouter` et `retirer` en O(log n).
@starter
class FilePriorite<T> {
}
@test Sort dans l'ordre
const f = new FilePriorite((a, b) => a - b); for (const x of [5, 1, 4, 1, 3]) f.ajouter(x); const r = []; while (f.taille) r.push(f.retirer()); expect(r).toEqual([1, 1, 3, 4, 5]); expect(f.retirer()).toBe(undefined);
@test `sommet` ne retire pas
const f = new FilePriorite((a, b) => b - a).ajouter(2).ajouter(9); expect([f.sommet(), f.taille, f.sommet()]).toEqual([9, 2, 9]);
@test Des objets
const f = new FilePriorite((a, b) => a.p - b.p).ajouter({ p: 3, n: 'c' }).ajouter({ p: 1, n: 'a' }); expect(f.retirer().n).toBe('a');
@test Rapide
const f = new FilePriorite((a, b) => a - b); const t = performance.now(); for (let i = 0; i < 100_000; i++) f.ajouter((i * 7919) % 100_003); let avant = -1; while (f.taille) { const x = f.retirer(); if (x < avant) throw new Error('désordre'); avant = x; } expect(performance.now() - t).toBeLessThan(1500);
@types Types
const f = new FilePriorite<string>((a, b) => a.length - b.length); const s: string | undefined = f.ajouter('a').retirer();
// @ts-expect-error
f.ajouter(3);
@solution
class FilePriorite<T> {
  #tas: T[] = [];
  #comparer: (a: T, b: T) => number;

  constructor(comparer: (a: T, b: T) => number) {
    this.#comparer = comparer;
  }

  get taille(): number {
    return this.#tas.length;
  }

  sommet(): T | undefined {
    return this.#tas[0];
  }

  #avant(i: number, j: number): boolean {
    return this.#comparer(this.#tas[i], this.#tas[j]) < 0;
  }

  #echanger(i: number, j: number): void {
    [this.#tas[i], this.#tas[j]] = [this.#tas[j], this.#tas[i]];
  }

  ajouter(x: T): this {
    let i = this.#tas.push(x) - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.#avant(i, parent)) break;
      this.#echanger(i, parent);
      i = parent;
    }
    return this;
  }

  retirer(): T | undefined {
    const n = this.#tas.length;
    if (n < 2) return this.#tas.pop();
    this.#echanger(0, n - 1);
    const minimum = this.#tas.pop();
    let i = 0;
    for (;;) {
      let petit = i;
      for (const enfant of [2 * i + 1, 2 * i + 2]) {
        if (enfant < this.#tas.length && this.#avant(enfant, petit)) petit = enfant;
      }
      if (petit === i) return minimum;
      this.#echanger(i, petit);
      i = petit;
    }
  }
}

@@ code plus-frequents | Les k plus fréquents | ts
`plusFrequents(mots, k)` renvoie les `k` mots les plus fréquents, du plus au moins fréquent ; à égalité, par ordre alphabétique (`<`). S'il y a moins de `k` mots, tous.
@starter
function plusFrequents(mots: string[], k: number): string[] {
  return [];
}
@test Exemple
expect(plusFrequents(['b', 'a', 'b', 'c', 'a', 'b'], 2)).toEqual(['b', 'a']);
@test Égalités
expect(plusFrequents(['z', 'y', 'x'], 2)).toEqual(['x', 'y']); expect(plusFrequents(['a'], 5)).toEqual(['a']);
@test Rapide
const m = Array.from({ length: 200_000 }, (_, i) => String(i % 50_000)); const t = performance.now(); expect(plusFrequents(m, 3)).toEqual(['0', '1', '10']); expect(performance.now() - t).toBeLessThan(1500);
@solution
function plusFrequents(mots: string[], k: number): string[] {
  const compte = new Map<string, number>();
  for (const mot of mots) compte.set(mot, (compte.get(mot) ?? 0) + 1);
  return [...compte]
    .sort(([a, n], [b, m]) => m - n || (a < b ? -1 : 1))
    .slice(0, k)
    .map(([mot]) => mot);
}

@@ code ordonnanceur | Un ordonnanceur | ts
Des tâches `{ id, arrivee, duree }` et **une** seule machine. Quand elle est libre, elle prend la plus **courte** des tâches déjà arrivées (à égalité, le plus petit `id`). `ordonner(taches)` renvoie les `id` dans l'ordre d'exécution.
@starter
interface Tache {
  id: number;
  arrivee: number;
  duree: number;
}

function ordonner(taches: Tache[]): number[] {
  return [];
}
@test Exemple
expect(ordonner([{ id: 0, arrivee: 1, duree: 2 }, { id: 1, arrivee: 2, duree: 4 }, { id: 2, arrivee: 3, duree: 2 }, { id: 3, arrivee: 4, duree: 1 }])).toEqual([0, 2, 3, 1]);
@test Toutes en même temps, égalités
expect(ordonner([{ id: 2, arrivee: 0, duree: 5 }, { id: 1, arrivee: 0, duree: 5 }, { id: 0, arrivee: 0, duree: 9 }])).toEqual([1, 2, 0]);
@test La machine attend
expect(ordonner([{ id: 1, arrivee: 100, duree: 1 }, { id: 0, arrivee: 0, duree: 1 }])).toEqual([0, 1]);
@test Beaucoup de tâches
const l = Array.from({ length: 3000 }, (_, id) => ({ id, arrivee: id % 50, duree: 1 + (id * 37) % 101 })); const t = performance.now(); expect(new Set(ordonner(l)).size).toBe(3000); expect(performance.now() - t).toBeLessThan(1500);
@hint
Trie par arrivée. À chaque étape : ajoute les tâches arrivées ; s'il n'y en a aucune, saute à la prochaine arrivée.
@solution
interface Tache {
  id: number;
  arrivee: number;
  duree: number;
}

function ordonner(taches: Tache[]): number[] {
  const aVenir = taches.toSorted((a, b) => a.arrivee - b.arrivee);
  const pretes: Tache[] = [];
  const ordre: number[] = [];
  let temps = 0;
  let i = 0;
  while (ordre.length < taches.length) {
    if (pretes.length === 0) temps = Math.max(temps, aVenir[i].arrivee);
    while (i < aVenir.length && aVenir[i].arrivee <= temps) pretes.push(aVenir[i++]);
    let choix = 0;
    pretes.forEach((t, k) => {
      const c = pretes[choix];
      if (t.duree < c.duree || (t.duree === c.duree && t.id < c.id)) choix = k;
    });
    const [tache] = pretes.splice(choix, 1);
    ordre.push(tache.id);
    temps += tache.duree;
  }
  return ordre;
}

@@ defi mediane | Médiane en continu | ts
Classe `Mediane` : `ajouter(x)` en O(log n) et `valeur()` en O(1) (`undefined` si vide ; pour un nombre pair d'éléments, la moyenne des deux du milieu).
@starter
class Mediane {
}
@test Petit à petit
const m = new Mediane(); expect(m.valeur()).toBe(undefined); const r = []; for (const x of [5, 1, 9, 3]) { m.ajouter(x); r.push(m.valeur()); } expect(r).toEqual([5, 3, 5, 4]);
@test Doublons et négatifs
const m = new Mediane(); for (const x of [-1, -1, -1, 7]) m.ajouter(x); expect(m.valeur()).toBe(-1);
@test Rapide
const m = new Mediane(); const t = performance.now(); for (let i = 0; i < 100_000; i++) { m.ajouter((i * 7919) % 100_003); m.valeur(); } expect(performance.now() - t).toBeLessThan(1500);
@hint
Deux tas : le plus grand de la moitié basse, le plus petit de la haute. Leurs tailles diffèrent d'au plus 1.
@solution
class Tas {
  #t: number[] = [];

  get taille(): number {
    return this.#t.length;
  }

  sommet(): number {
    return this.#t[0];
  }

  ajouter(x: number): void {
    const t = this.#t;
    let i = t.push(x) - 1;
    for (let p = (i - 1) >> 1; i > 0 && t[i] < t[p]; i = p, p = (i - 1) >> 1) [t[i], t[p]] = [t[p], t[i]];
  }

  retirer(): number {
    const t = this.#t;
    const minimum = t[0];
    const dernier = t.pop()!;
    if (t.length === 0) return minimum;
    t[0] = dernier;
    for (let i = 0; ;) {
      let k = i;
      for (const e of [2 * i + 1, 2 * i + 2]) if (e < t.length && t[e] < t[k]) k = e;
      if (k === i) return minimum;
      [t[i], t[k]] = [t[k], t[i]];
      i = k;
    }
  }
}

class Mediane {
  // Valeurs opposées : ce tas min donne le plus grand de la moitié basse
  #basse = new Tas();
  #haute = new Tas();

  ajouter(x: number): void {
    this.#basse.ajouter(-x);
    this.#haute.ajouter(-this.#basse.retirer());
    if (this.#haute.taille > this.#basse.taille) this.#basse.ajouter(-this.#haute.retirer());
  }

  valeur(): number | undefined {
    if (this.#basse.taille === 0) return undefined;
    const bas = -this.#basse.sommet();
    return this.#basse.taille > this.#haute.taille ? bas : (bas + this.#haute.sommet()) / 2;
  }
}

@@ predict tas-parent
Dans un tas rangé en tableau, quel est l'indice du parent de l'élément 8 ?
@answer `3`
@wrong `4`
@wrong `7`
@wrong `16`
@why `(8 - 1) >> 1` vaut 3.

@@ predict tas-trie
Le tableau d'un tas est-il trié ?
@answer Non : seul le premier est garanti le plus petit
@wrong Oui
@wrong Oui, sauf le dernier
@wrong Seulement si la taille est une puissance de 2
@why Chaque parent est plus petit que ses enfants, sans ordre entre branches.

@@ card tas-couts
Coûts d'un tas : minimum, ajout, retrait ?
@back
O(1), O(log n), O(log n)

@@ card k-plus-grands
Les k plus grands parmi n, en peu de mémoire ?
@back
Un tas **min** de taille k : O(n log k).
