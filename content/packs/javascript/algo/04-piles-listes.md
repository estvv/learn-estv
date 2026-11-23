# Piles, files, listes
> Les structures linéaires et leurs astuces.

@@ lesson lineaires | Piles, files et listes chaînées

### Pile (LIFO)

Dernier arrivé, premier sorti : `push` et `pop`. Utile pour annuler, pour ce qui s'**imbrique** (parenthèses), pour éviter la récursion.

### File (FIFO)

Premier arrivé, premier sorti. `push` et `shift`, mais `shift` est O(n) sur un gros tableau. Une vraie file garde un indice de début :

```ts-run
class File<T> {
  #elements: T[] = [];
  #debut = 0;
  ajouter(x: T): void { this.#elements.push(x); }
  retirer(): T | undefined {
    if (this.#debut >= this.#elements.length) return undefined;
    const x = this.#elements[this.#debut++];
    if (this.#debut > 1000 && this.#debut * 2 > this.#elements.length) {
      this.#elements = this.#elements.slice(this.#debut); // ménage de temps en temps
      this.#debut = 0;
    }
    return x;
  }
  get taille(): number { return this.#elements.length - this.#debut; }
}
const f = new File<string>();
f.ajouter('a');
f.ajouter('b');
console.log(f.retirer(), f.taille);
```

### Liste chaînée

Chaque maillon connaît le suivant. Insertion et suppression en O(1) **si on a le maillon**, mais accès au i-ème en O(n).

```ts-run
interface Maillon<T> { valeur: T; suivant: Maillon<T> | null }
const liste: Maillon<number> = { valeur: 1, suivant: { valeur: 2, suivant: null } };
for (let m: Maillon<number> | null = liste; m; m = m.suivant) console.log(m.valeur);
```

Deux astuces : un maillon **sentinelle** au début évite les cas particuliers ; deux pointeurs, un **lent** et un **rapide**, trouvent le milieu ou un cycle.

### Pile monotone

Une pile qu'on garde triée répond à « le prochain plus grand » en O(n) : avant d'empiler, on dépile tout ce qui est plus petit, et pour chacun on vient de trouver la réponse.

@@ code parentheses | Parenthèses équilibrées | ts
`equilibre(texte)` dit si `()`, `[]` et `{}` sont bien fermés et imbriqués. Les autres caractères sont ignorés.
@starter
function equilibre(texte: string): boolean {
  return false;
}
@test Corrects
expect(['', '()', 'f(a[1], { b: (2) })'].map(equilibre)).toEqual([true, true, true]);
@test Incorrects
expect(['(', ')', '(]', '([)]', '())', '}{'].map(equilibre)).toEqual([false, false, false, false, false, false]);
@solution
const FERMETURES: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

function equilibre(texte: string): boolean {
  const pile: string[] = [];
  for (const c of texte) {
    if ('([{'.includes(c)) pile.push(c);
    else if (c in FERMETURES && pile.pop() !== FERMETURES[c]) return false;
  }
  return pile.length === 0;
}

@@ code inverser-liste | Listes chaînées | ts
- `depuis(tableau)` et `versTableau(liste)` : conversions
- `inverser(liste)` : inverse **en place** (sans créer de maillon) et renvoie le nouveau début
- `aUnCycle(liste)` : un maillon pointe-t-il vers un maillon précédent ? Sans mémoire supplémentaire.
@starter
interface Maillon {
  valeur: number;
  suivant: Maillon | null;
}

@test Conversions
expect(versTableau(depuis([1, 2, 3]))).toEqual([1, 2, 3]); expect([depuis([]), versTableau(null)]).toEqual([null, []]);
@test Inverser
expect(versTableau(inverser(depuis([1, 2, 3])))).toEqual([3, 2, 1]); expect(inverser(null)).toBe(null);
@test En place
const l = depuis([1, 2]); const second = l.suivant; expect(inverser(l)).toBe(second);
@test Cycle
const l = depuis([1, 2, 3, 4]); expect(aUnCycle(l)).toBe(false); l.suivant.suivant.suivant.suivant = l.suivant; expect(aUnCycle(l)).toBe(true); expect(aUnCycle(null)).toBe(false);
@test Sans Set ni Map
expect($source).not.toMatch(/new (Set|Map)/);
@hint
Cycle : un pointeur avance d'un pas, l'autre de deux. S'il y a un cycle, ils se rencontrent.
@solution
interface Maillon {
  valeur: number;
  suivant: Maillon | null;
}

function depuis(tableau: number[]): Maillon | null {
  return tableau.reduceRight<Maillon | null>((suivant, valeur) => ({ valeur, suivant }), null);
}

function versTableau(liste: Maillon | null): number[] {
  const resultat: number[] = [];
  for (let m = liste; m; m = m.suivant) resultat.push(m.valeur);
  return resultat;
}

function inverser(liste: Maillon | null): Maillon | null {
  let precedent: Maillon | null = null;
  let courant = liste;
  while (courant) {
    const suivant: Maillon | null = courant.suivant;
    courant.suivant = precedent;
    precedent = courant;
    courant = suivant;
  }
  return precedent;
}

function aUnCycle(liste: Maillon | null): boolean {
  let lent = liste;
  let rapide = liste;
  while (lent && rapide?.suivant) {
    lent = lent.suivant;
    rapide = rapide.suivant.suivant;
    if (lent === rapide) return true;
  }
  return false;
}

@@ code temperatures | Le prochain jour plus chaud | ts
`attente(temperatures)` renvoie, pour chaque jour, combien de jours attendre avant une température **strictement** plus haute (0 s'il n'y en a pas). En O(n).
@starter
function attente(temperatures: number[]): number[] {
  return [];
}
@test Exemples
expect(attente([73, 74, 75, 71, 69, 72, 76, 73])).toEqual([1, 1, 4, 2, 1, 1, 0, 0]); expect(attente([30, 30, 20])).toEqual([0, 0, 0]);
@test Rapide
const t = performance.now(); attente(Array.from({ length: 100_000 }, (_, i) => -i)); expect(performance.now() - t).toBeLessThan(400);
@hint
Une pile d'**indices** en attente de leur réponse, températures décroissantes.
@solution
function attente(temperatures: number[]): number[] {
  const reponse = new Array<number>(temperatures.length).fill(0);
  const enAttente: number[] = [];
  temperatures.forEach((t, i) => {
    while (enAttente.length > 0 && temperatures[enAttente[enAttente.length - 1]] < t) {
      const j = enAttente.pop()!;
      reponse[j] = i - j;
    }
    enAttente.push(i);
  });
  return reponse;
}

@@ defi max-glissant | Maximum glissant | ts
`maxGlissant(liste, k)` renvoie le maximum de chaque fenêtre de `k` éléments consécutifs. En O(n), quel que soit `k`.
@starter
function maxGlissant(liste: number[], k: number): number[] {
  return [];
}
@test Exemples
expect(maxGlissant([1, 3, -1, -3, 5, 3, 6, 7], 3)).toEqual([3, 3, 5, 5, 6, 7]); expect(maxGlissant([1, 2], 1)).toEqual([1, 2]); expect(maxGlissant([4, 2], 2)).toEqual([4]); expect(maxGlissant([1], 5)).toEqual([]);
@test Rapide avec une grande fenêtre
const l = Array.from({ length: 200_000 }, (_, i) => -i); const t = performance.now(); expect(maxGlissant(l, 100_000)).toHaveLength(100_001); expect(performance.now() - t).toBeLessThan(600);
@hint
Une file d'indices aux valeurs décroissantes : retire à la fin les plus petits, au début ceux sortis de la fenêtre. Utilise un indice de début plutôt que `shift`.
@solution
function maxGlissant(liste: number[], k: number): number[] {
  const file: number[] = [];
  let debut = 0;
  const resultat: number[] = [];
  for (let i = 0; i < liste.length; i++) {
    while (file.length > debut && liste[file[file.length - 1]] <= liste[i]) file.pop();
    file.push(i);
    if (file[debut] <= i - k) debut++;
    if (i >= k - 1) resultat.push(liste[file[debut]]);
  }
  return resultat;
}

@@ predict pile-ordre
On empile 1, 2, 3 puis on dépile deux fois. Que reste-t-il ?
@answer 1
@wrong 3
@wrong 2
@wrong 1 et 2
@why Une pile rend d'abord le dernier arrivé : 3, puis 2.

@@ predict shift-cout
Vider une file de 100 000 éléments avec `shift` peut coûter :
@answer O(n²) : chaque `shift` peut décaler tout le tableau
@wrong O(n)
@wrong O(log n)
@wrong O(1)
@why Garde plutôt un indice de début.

@@ card pile-file
Pile ou file ?
@back
Pile : dernier arrivé, premier sorti. File : premier arrivé, premier sorti.

@@ card lent-rapide
Détecter un cycle dans une liste chaînée sans mémoire ?
@back
Deux pointeurs, un pas et deux pas : s'ils se rencontrent, il y a un cycle.
