# Graphes
> Largeur, profondeur, tri topologique, Dijkstra.

@@ lesson graphes | Les graphes

Des **sommets** reliés par des **arêtes** : villes et routes, pages et liens, modules et imports, états d'un jeu. Dirigé ou non, avec ou sans poids.

La représentation courante est la **liste d'adjacence** :

```ts-run
type Graphe = Map<string, string[]>;

function construire(aretes: [string, string][]): Graphe {
  const g: Graphe = new Map();
  const voisins = (s: string) => {
    let l = g.get(s);
    if (!l) g.set(s, (l = []));
    return l;
  };
  for (const [a, b] of aretes) {
    voisins(a).push(b);
    voisins(b).push(a); // à retirer si le graphe est dirigé
  }
  return g;
}
console.log(construire([['a', 'b'], ['b', 'c']]));
```

### Largeur (BFS)

Une file : on visite par distance croissante. Donne le **plus court chemin** quand toutes les arêtes se valent.

```ts-run
function distances(g: Map<string, string[]>, depart: string): Map<string, number> {
  const dist = new Map([[depart, 0]]);
  for (const s of dist.keys()) {          // une Map se parcourt pendant qu'on l'agrandit
    for (const v of g.get(s) ?? []) {
      if (!dist.has(v)) dist.set(v, dist.get(s)! + 1);
    }
  }
  return dist;
}
console.log(distances(new Map([['a', ['b', 'c']], ['b', ['d']], ['c', ['d']]]), 'a'));
```

### Profondeur (DFS)

Récursion ou pile : composantes, cycles, tri topologique. **Toujours** marquer les sommets visités.

### Tri topologique

Ordonner des tâches selon leurs dépendances : on retire sans cesse un sommet dont plus rien ne dépend. S'il en reste, il y a un **cycle**.

### Dijkstra

Plus court chemin avec des poids **positifs** : comme le BFS, mais on traite toujours le sommet le plus proche, avec une file de priorité. O((V + E) log V).

### Union-Find

« Ces deux éléments sont-ils reliés ? », en ajoutant des liens au fur et à mesure. Presque O(1).

@@ code iles | Compter les îles | ts
Une grille de textes : `#` terre, `.` eau. `iles(grille)` compte les groupes de terre reliés horizontalement ou verticalement.
@starter
function iles(grille: string[]): number {
  return 0;
}
@test Exemples
expect(iles(['##..', '#..#', '...#', '#...'])).toBe(3); expect([iles(['...']), iles([]), iles(['#'])]).toEqual([0, 0, 1]);
@test Les diagonales ne comptent pas
expect(iles(['#.', '.#'])).toBe(2);
@test Une très grande île
const g = new Array(400).fill('#'.repeat(400)); const t = performance.now(); expect(iles(g)).toBe(1); expect(performance.now() - t).toBeLessThan(1500);
@hint
Une grande île ferait déborder la récursion : utilise une pile.
@solution
function iles(grille: string[]): number {
  const largeur = grille[0]?.length ?? 0;
  const vues = new Uint8Array(grille.length * largeur);
  let total = 0;
  for (let depart = 0; depart < vues.length; depart++) {
    if (vues[depart] || grille[Math.floor(depart / largeur)][depart % largeur] !== '#') continue;
    total++;
    vues[depart] = 1;
    const pile = [depart];
    while (pile.length > 0) {
      const p = pile.pop()!;
      const l = Math.floor(p / largeur);
      const c = p % largeur;
      for (const [nl, nc] of [[l + 1, c], [l - 1, c], [l, c + 1], [l, c - 1]]) {
        const q = nl * largeur + nc;
        if (grille[nl]?.[nc] === '#' && !vues[q]) {
          vues[q] = 1;
          pile.push(q);
        }
      }
    }
  }
  return total;
}

@@ code topologique | Ordre de compilation | ts
`ordre(dependances)` reçoit un objet module → modules dont il dépend. Renvoie les modules dans un ordre où chacun vient **après** ses dépendances ; parmi ceux qui sont prêts, le premier par ordre alphabétique. En cas de cycle, lance une `Error` contenant `cycle`. Un module cité seulement comme dépendance compte aussi.
@starter
function ordre(dependances: Record<string, string[]>): string[] {
  return [];
}
@test Exemple
expect(ordre({ app: ['ui', 'api'], ui: ['base'], api: ['base'], base: [] })).toEqual(['base', 'api', 'ui', 'app']);
@test Modules cités
expect(ordre({ a: ['z'] })).toEqual(['z', 'a']); expect(ordre({})).toEqual([]);
@test Cycle
expect(() => ordre({ a: ['b'], b: ['c'], c: ['a'] })).toThrow('cycle'); expect(() => ordre({ a: ['a'] })).toThrow('cycle');
@test Ordre alphabétique parmi les prêts
expect(ordre({ c: [], a: [], b: ['c'] })).toEqual(['a', 'c', 'b']);
@solution
function ordre(dependances: Record<string, string[]>): string[] {
  const restantes = new Map<string, Set<string>>();
  for (const [module, deps] of Object.entries(dependances)) {
    restantes.set(module, new Set(deps));
    for (const d of deps) if (!restantes.has(d) && !(d in dependances)) restantes.set(d, new Set());
  }
  const resultat: string[] = [];
  while (restantes.size > 0) {
    const [pret] = [...restantes].filter(([, deps]) => deps.size === 0).map(([m]) => m).sort();
    if (pret === undefined) throw new Error(`cycle entre ${[...restantes.keys()].join(', ')}`);
    resultat.push(pret);
    restantes.delete(pret);
    for (const deps of restantes.values()) deps.delete(pret);
  }
  return resultat;
}

@@ code dijkstra | Le plus court trajet | ts
`trajet(routes, depart, arrivee)` : `routes` est une liste de `[a, b, distance]` à double sens. Renvoie `{ distance, chemin }`, ou `null`.
@starter
type Route = [a: string, b: string, distance: number];

function trajet(routes: Route[], depart: string, arrivee: string): { distance: number; chemin: string[] } | null {
  return null;
}
@test Le détour est plus court
expect(trajet([['A', 'B', 10], ['A', 'C', 2], ['C', 'B', 3]], 'A', 'B')).toEqual({ distance: 5, chemin: ['A', 'C', 'B'] });
@test Dans les deux sens
expect(trajet([['A', 'B', 1], ['B', 'C', 2]], 'C', 'A')).toEqual({ distance: 3, chemin: ['C', 'B', 'A'] });
@test Sur place, impossible
expect(trajet([['A', 'B', 1]], 'A', 'A')).toEqual({ distance: 0, chemin: ['A'] }); expect(trajet([['A', 'B', 1], ['C', 'D', 1]], 'A', 'D')).toBe(null);
@test Un graphe plus grand
const r = []; for (let i = 0; i < 400; i++) { r.push([`n${i}`, `n${i + 1}`, 1]); if (i % 7 === 0) r.push([`n${i}`, `n${i + 5}`, 9]); } const t = performance.now(); expect(trajet(r, 'n0', 'n400').distance).toBe(400); expect(performance.now() - t).toBeLessThan(1500);
@hint
Garde la meilleure distance connue et le sommet précédent. Répète : prendre le sommet non traité le plus proche, améliorer ses voisins.
@solution
type Route = [a: string, b: string, distance: number];

function trajet(routes: Route[], depart: string, arrivee: string): { distance: number; chemin: string[] } | null {
  const voisins = new Map<string, [string, number][]>();
  const relier = (a: string, b: string, d: number) => voisins.set(a, [...(voisins.get(a) ?? []), [b, d]]);
  for (const [a, b, d] of routes) {
    relier(a, b, d);
    relier(b, a, d);
  }

  const distances = new Map([[depart, 0]]);
  const precedent = new Map<string, string>();
  const aTraiter = new Set([depart]);
  while (aTraiter.size > 0) {
    let proche = '';
    for (const s of aTraiter) {
      if (proche === '' || distances.get(s)! < distances.get(proche)!) proche = s;
    }
    aTraiter.delete(proche);
    const base = distances.get(proche)!;
    if (proche === arrivee) {
      const chemin = [arrivee];
      for (let s = precedent.get(arrivee); s !== undefined; s = precedent.get(s)) chemin.unshift(s);
      return { distance: base, chemin };
    }
    for (const [v, d] of voisins.get(proche) ?? []) {
      if (base + d < (distances.get(v) ?? Infinity)) {
        distances.set(v, base + d);
        precedent.set(v, proche);
        aTraiter.add(v);
      }
    }
  }
  return null;
}

@@ defi reseau | Relier au moindre coût | ts
1. Classe `UnionFind` : `unir(a, b)` (renvoie `false` s'ils étaient déjà reliés), `relies(a, b)`, sur des textes.
2. `reseauMinimal(cables)` : parmi des câbles `[a, b, prix]`, le **prix minimal** pour relier **tous** les points, ou `null` si c'est impossible (Kruskal : du moins cher au plus cher, en gardant ceux qui relient deux groupes).
@starter
class UnionFind {
}

@test `UnionFind`
const u = new UnionFind(); expect([u.relies('a', 'b'), u.unir('a', 'b'), u.unir('b', 'c'), u.relies('a', 'c'), u.unir('c', 'a'), u.relies('a', 'z'), u.relies('z', 'z')]).toEqual([false, true, true, true, false, false, true]);
@test Longue chaîne
const u = new UnionFind(); const t = performance.now(); for (let i = 0; i < 50_000; i++) u.unir(`${i}`, `${i + 1}`); for (let i = 0; i < 50_000; i++) u.relies('0', `${i}`); expect(performance.now() - t).toBeLessThan(1500); expect(u.relies('0', '50000')).toBe(true);
@test `reseauMinimal`
expect(reseauMinimal([['a', 'b', 4], ['b', 'c', 1], ['a', 'c', 2], ['c', 'd', 7], ['b', 'd', 5]])).toBe(8); expect([reseauMinimal([]), reseauMinimal([['a', 'b', 1], ['c', 'd', 1]])]).toEqual([0, null]);
@hint
Chaque élément pointe vers un parent ; la racine représente le groupe. En cherchant la racine, raccourcis le chemin.
@solution
class UnionFind {
  #parents = new Map<string, string>();

  #racine(x: string): string {
    let racine = x;
    for (let p = this.#parents.get(racine); p !== undefined; p = this.#parents.get(racine)) racine = p;
    for (let y = x; y !== racine;) {
      const suivant = this.#parents.get(y)!;
      this.#parents.set(y, racine);
      y = suivant;
    }
    return racine;
  }

  relies(a: string, b: string): boolean {
    return this.#racine(a) === this.#racine(b);
  }

  unir(a: string, b: string): boolean {
    const ra = this.#racine(a);
    const rb = this.#racine(b);
    if (ra === rb) return false;
    this.#parents.set(ra, rb);
    return true;
  }
}

function reseauMinimal(cables: [a: string, b: string, prix: number][]): number | null {
  const groupes = new UnionFind();
  let total = 0;
  let restants = new Set(cables.flatMap(([a, b]) => [a, b])).size - 1;
  for (const [a, b, prix] of cables.toSorted((x, y) => x[2] - y[2])) {
    if (groupes.unir(a, b)) {
      total += prix;
      restants--;
    }
  }
  return restants > 0 ? null : total;
}

@@ predict bfs-chemin
Quand le parcours en largeur donne-t-il le plus court chemin ?
@answer Quand toutes les arêtes ont le même poids
@wrong Toujours
@wrong Jamais
@wrong Seulement dans un arbre
@why Avec des poids différents (positifs), il faut Dijkstra.

@@ predict cycle-topo
Un tri topologique est impossible quand :
@answer Il y a un cycle
@wrong Le graphe est dirigé
@wrong Un sommet n'a pas de voisin
@wrong Il y a plusieurs départs
@why Dans un cycle, chaque sommet attend un autre.

@@ card adjacence
Représentation courante d'un graphe ?
@back
Une liste d'adjacence : `Map<sommet, voisins[]>`

@@ card dijkstra-limite
La limite de Dijkstra ?
@back
Les poids doivent être positifs ou nuls.
