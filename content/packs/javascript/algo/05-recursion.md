# Récursion et retour sur trace
> Explorer toutes les possibilités, intelligemment.

@@ lesson backtracking | Le retour sur trace

Une fonction récursive a un **cas d'arrêt**, et se rapproche de lui. Fais-lui **confiance** : suppose qu'elle marche pour plus petit, et construis avec.

Pour explorer des combinaisons : **choisir**, explorer, **annuler**.

```ts-run
function sousEnsembles<T>(liste: T[]): T[][] {
  const resultat: T[][] = [];
  const choix: T[] = [];
  const explorer = (i: number): void => {
    if (i === liste.length) {
      resultat.push([...choix]); // une COPIE
      return;
    }
    explorer(i + 1);             // sans liste[i]
    choix.push(liste[i]);        // avec : choisir
    explorer(i + 1);
    choix.pop();                 // annuler
  };
  explorer(0);
  return resultat;
}
console.log(sousEnsembles(['a', 'b', 'c']));
```

**Élaguer** : abandonner une branche dès qu'elle ne peut plus réussir. C'est ce qui rend ces algorithmes utilisables.

### Combien ?

| | Nombre |
|---|---|
| Sous-ensembles de n | 2ⁿ |
| Permutations de n | n! |
| Combinaisons de k parmi n | n! / (k!(n−k)!) |

### La pile d'appels

Chaque appel occupe la pile : au-delà de ~10 000 niveaux, `RangeError: Maximum call stack size exceeded`. On remplace alors la récursion par une boucle et une pile explicite.

@@ code permutations | Permutations | ts
`permutations(liste)` renvoie toutes les permutations, dans cet ordre : celles qui commencent par le premier élément, puis par le deuxième…
@starter
function permutations<T>(liste: T[]): T[][] {
  return [];
}
@test Trois éléments
expect(permutations([1, 2, 3])).toEqual([[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]);
@test Cas limites
expect([permutations([]), permutations(['a'])]).toEqual([[[]], [['a']]]);
@test Le bon nombre
expect(permutations([1, 2, 3, 4, 5, 6])).toHaveLength(720);
@hint
Pour chaque élément : le mettre devant chaque permutation des **autres**.
@solution
function permutations<T>(liste: T[]): T[][] {
  if (liste.length === 0) return [[]];
  return liste.flatMap((x, i) =>
    permutations([...liste.slice(0, i), ...liste.slice(i + 1)]).map((suite) => [x, ...suite]));
}

@@ code monnaie | Atteindre une somme | ts
`combinaisons(pieces, cible)` renvoie toutes les façons d'obtenir `cible` avec ces pièces (chacune utilisable **plusieurs fois**). `pieces` est triée et sans doublon ; chaque façon est en ordre croissant, et il n'y a pas de doublon.
@starter
function combinaisons(pieces: number[], cible: number): number[][] {
  return [];
}
@test Exemple
expect(combinaisons([2, 3, 5], 8)).toEqual([[2, 2, 2, 2], [2, 3, 3], [3, 5]]);
@test Impossible, et zéro
expect([combinaisons([4], 6), combinaisons([2], 0)]).toEqual([[], [[]]]);
@test Élague
const t = performance.now(); expect(combinaisons([30, 40, 50], 1000).length).toBeGreaterThan(10); expect(performance.now() - t).toBeLessThan(1500);
@hint
`explorer(i, reste)` : on ne reprend que des pièces d'indice `>= i`, ce qui évite les doublons.
@solution
function combinaisons(pieces: number[], cible: number): number[][] {
  const resultat: number[][] = [];
  const choix: number[] = [];
  const explorer = (debut: number, reste: number): void => {
    if (reste === 0) {
      resultat.push([...choix]);
      return;
    }
    for (let i = debut; i < pieces.length && pieces[i] <= reste; i++) {
      choix.push(pieces[i]);
      explorer(i, reste - pieces[i]);
      choix.pop();
    }
  };
  explorer(0, cible);
  return resultat;
}

@@ code labyrinthe | Sortir d'un labyrinthe | ts
Une grille de textes : `#` mur, `.` passage, `D` départ, `A` arrivée. `chemin(grille)` renvoie **un** chemin de `D` à `A` (liste de `[ligne, colonne]`, départ et arrivée compris), ou `null`. Déplacements : haut, bas, gauche, droite.
@starter
type Case = [ligne: number, colonne: number];

function chemin(grille: string[]): Case[] | null {
  return null;
}
@test Chemin simple
expect(chemin(['D.A'])).toEqual([[0, 0], [0, 1], [0, 2]]);
@test Le chemin est valable
const g = ['D.#.', '#..#', '##.A', '....']; const c = chemin(g); expect(c[0]).toEqual([0, 0]); expect(c.at(-1)).toEqual([2, 3]); for (let i = 1; i < c.length; i++) expect(Math.abs(c[i][0] - c[i - 1][0]) + Math.abs(c[i][1] - c[i - 1][1])).toBe(1); expect(c.every(([l, k]) => g[l][k] !== '#')).toBe(true); expect(new Set(c.map(String)).size).toBe(c.length);
@test Impossible
expect(chemin(['D#A'])).toBe(null);
@test Une grande pièce vide
const g = Array.from({ length: 40 }, (_, i) => (i === 0 ? 'D' + '.'.repeat(39) : i === 39 ? '.'.repeat(39) + 'A' : '.'.repeat(40))); expect(chemin(g)).not.toBe(null);
@hint
Marque les cases visitées et ne les démarque **jamais** : si on n'a pas trouvé en passant par là, inutile d'y revenir.
@solution
type Case = [ligne: number, colonne: number];

function chemin(grille: string[]): Case[] | null {
  const visitees = new Set<string>();
  const explorer = (l: number, c: number): Case[] | null => {
    const contenu = grille[l]?.[c];
    const cle = `${l},${c}`;
    if (contenu === undefined || contenu === '#' || visitees.has(cle)) return null;
    visitees.add(cle);
    if (contenu === 'A') return [[l, c]];
    for (const [dl, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const suite = explorer(l + dl, c + dc);
      if (suite) return [[l, c], ...suite];
    }
    return null;
  };
  const ligne = grille.findIndex((texte) => texte.includes('D'));
  return explorer(ligne, grille[ligne].indexOf('D'));
}

@@ defi sudoku | Un solveur de sudoku | ts
`resoudre(grille)` reçoit 9 textes de 9 caractères (`.` pour une case vide) et renvoie la grille complète, ou `null` si c'est impossible. Les grilles difficiles doivent rester rapides : commence par la case qui a le **moins de possibilités**.
@starter
function resoudre(grille: string[]): string[] | null {
  return null;
}
@test Une grille
expect(resoudre(['53..7....', '6..195...', '.98....6.', '8...6...3', '4..8.3..1', '7...2...6', '.6....28.', '...419..5', '....8..79'])).toEqual(['534678912', '672195348', '198342567', '859761423', '426853791', '713924856', '961537284', '287419635', '345286179']);
@test Une grille difficile, vite
const t = performance.now(); const r = resoudre(['8........', '..36.....', '.7..9.2..', '.5...7...', '....457..', '...1...3.', '..1....68', '..85...1.', '.9....4..']); expect(r[0]).toBe('812753649'); expect(performance.now() - t).toBeLessThan(4000);
@test Impossible
expect(resoudre(['11.......', ...new Array(8).fill('.........')])).toBe(null);
@hint
Garde, pour chaque ligne, colonne et carré, l'ensemble des chiffres déjà présents.
@hint
À chaque étape, parcours les cases vides, calcule leurs possibilités, et choisis celle qui en a le moins (0 : impasse).
@solution
function resoudre(grille: string[]): string[] | null {
  const cases = grille.map((ligne) => [...ligne]);
  const groupes = (l: number, c: number) => [`l${l}`, `c${c}`, `b${Math.floor(l / 3)}${Math.floor(c / 3)}`];
  const pris = new Map<string, Set<string>>();
  const occupe = (groupe: string): Set<string> => {
    let s = pris.get(groupe);
    if (!s) pris.set(groupe, (s = new Set()));
    return s;
  };

  const vides: [number, number][] = [];
  for (let l = 0; l < 9; l++) {
    for (let c = 0; c < 9; c++) {
      const chiffre = cases[l][c];
      if (chiffre === '.') {
        vides.push([l, c]);
        continue;
      }
      for (const g of groupes(l, c)) {
        if (occupe(g).has(chiffre)) return null;
        occupe(g).add(chiffre);
      }
    }
  }

  const possibles = (l: number, c: number): string[] => {
    const ensembles = groupes(l, c).map(occupe);
    return [...'123456789'].filter((x) => !ensembles.some((e) => e.has(x)));
  };

  const explorer = (): boolean => {
    if (vides.length === 0) return true;
    let meilleur = 0;
    let choix: string[] | null = null;
    for (const [i, [l, c]] of vides.entries()) {
      const p = possibles(l, c);
      if (choix === null || p.length < choix.length) {
        meilleur = i;
        choix = p;
      }
      if (p.length < 2) break;
    }
    const [position] = vides.splice(meilleur, 1);
    const [l, c] = position;
    for (const chiffre of choix ?? []) {
      cases[l][c] = chiffre;
      for (const g of groupes(l, c)) occupe(g).add(chiffre);
      if (explorer()) return true;
      for (const g of groupes(l, c)) occupe(g).delete(chiffre);
      cases[l][c] = '.';
    }
    vides.splice(meilleur, 0, position);
    return false;
  };

  return explorer() ? cases.map((ligne) => ligne.join('')) : null;
}

@@ predict copie-choix
Pourquoi `resultat.push([...choix])` et non `resultat.push(choix)` ?
@answer `choix` continue d'être modifié ensuite
@wrong Pour trier
@wrong Pour aller plus vite
@wrong `push` n'accepte pas un tableau
@why On rangerait plusieurs fois le **même** tableau, vide à la fin.

@@ predict nombre-sous-ensembles
Combien de sous-ensembles a un ensemble de 10 éléments ?
@answer `1024`
@wrong `100`
@wrong `10`
@wrong `3628800`
@why 2¹⁰ : chaque élément est pris ou non.

@@ card backtracking-etapes
Les trois temps du retour sur trace ?
@back
Choisir, explorer, annuler.

@@ card pile-debordee
Que faire si une récursion est trop profonde ?
@back
La remplacer par une boucle avec une pile explicite.
