# Recherche et fenêtres
> Dichotomie, deux pointeurs, fenêtre glissante.

@@ lesson recherche | Chercher sans tout regarder

### La recherche dichotomique

Dans des données **triées**, regarder au milieu élimine la moitié : O(log n).

```ts-run
function chercher(liste: number[], x: number): number {
  let bas = 0;
  let haut = liste.length - 1;
  while (bas <= haut) {
    const milieu = Math.floor((bas + haut) / 2);
    if (liste[milieu] === x) return milieu;
    if (liste[milieu] < x) bas = milieu + 1;
    else haut = milieu - 1;
  }
  return -1;
}
console.log(chercher([1, 4, 9, 16, 25], 16));
```

La variante la plus utile trouve la **première position** où une condition devient vraie (faux, faux, vrai, vrai…) :

```ts-run
function premierVrai(n: number, test: (i: number) => boolean): number {
  let bas = 0;
  let haut = n; // la réponse est dans [bas, haut]
  while (bas < haut) {
    const milieu = Math.floor((bas + haut) / 2);
    if (test(milieu)) haut = milieu;
    else bas = milieu + 1;
  }
  return bas; // n si aucun
}
const l = [1, 3, 3, 3, 7];
console.log(premierVrai(l.length, (i) => l[i] >= 3), premierVrai(l.length, (i) => l[i] > 3));
```

On peut même chercher dans un **intervalle de réponses** : « la plus petite capacité qui suffit ».

### Deux pointeurs

Deux indices qui avancent dans un tableau trié, plutôt que deux boucles :

```ts-run
function paireDeSomme(l: number[], cible: number): [number, number] | null {
  let i = 0;
  let j = l.length - 1;
  while (i < j) {
    const s = l[i] + l[j];
    if (s === cible) return [l[i], l[j]];
    if (s < cible) i++;
    else j--;
  }
  return null;
}
console.log(paireDeSomme([1, 3, 5, 8, 11], 13));
```

### Fenêtre glissante

Pour les questions sur une suite **contiguë** : on agrandit à droite, on rétrécit à gauche. Chaque élément entre et sort une fois : O(n).

```ts-run
// La plus longue suite dont la somme est <= max (nombres positifs)
function plusLongue(l: number[], max: number): number {
  let debut = 0, somme = 0, meilleure = 0;
  for (let fin = 0; fin < l.length; fin++) {
    somme += l[fin];
    while (somme > max) somme -= l[debut++];
    meilleure = Math.max(meilleure, fin - debut + 1);
  }
  return meilleure;
}
console.log(plusLongue([2, 1, 5, 1, 1, 1, 4], 5));
```

### Sommes cumulées

Préparer `cumul[i]` (somme des `i` premiers) donne toute somme d'intervalle en O(1) : `cumul[b] - cumul[a]`.

@@ code position | Où insérer ? | ts
`position(triee, x)` renvoie l'indice où insérer `x` pour que le tableau reste trié (avant les éléments égaux). En O(log n) : le test compte les lectures.
@starter
function position(triee: readonly number[], x: number): number {
  return 0;
}
@test Au milieu, au début, à la fin
expect([position([1, 3, 5], 4), position([1, 3, 5], 0), position([1, 3, 5], 9)]).toEqual([2, 0, 3]);
@test Avant les égaux
expect(position([1, 3, 3, 3, 5], 3)).toBe(1); expect(position([], 3)).toBe(0);
@test Peu de lectures
let n = 0; const l = new Proxy(Array.from({ length: 100_000 }, (_, i) => i * 2), { get(t, k, r) { if (/^\d+$/.test(String(k))) n++; return Reflect.get(t, k, r); } }); expect(position(l, 77_777)).toBe(38_889); expect(n).toBeLessThan(60);
@solution
function position(triee: readonly number[], x: number): number {
  let bas = 0;
  let haut = triee.length;
  while (bas < haut) {
    const milieu = Math.floor((bas + haut) / 2);
    if (triee[milieu] >= x) haut = milieu;
    else bas = milieu + 1;
  }
  return bas;
}

@@ code sans-repetition | Sans répétition | ts
`plusLongue(texte)` renvoie la longueur de la plus longue partie **contiguë** sans caractère répété. En O(n).
@starter
function plusLongue(texte: string): number {
  return 0;
}
@test Cas simples
expect([plusLongue('abcabcbb'), plusLongue('bbbb'), plusLongue('pwwkew'), plusLongue('')]).toEqual([3, 1, 3, 0]);
@test Le début recule jamais
expect(plusLongue('abba')).toBe(2); expect(plusLongue('tmmzuxt')).toBe(5);
@test Rapide
const t = performance.now(); plusLongue('abcdefghij'.repeat(30_000)); expect(performance.now() - t).toBeLessThan(500);
@hint
Retiens, pour chaque caractère, sa dernière position. S'il est déjà dans la fenêtre, le début saute juste après.
@solution
function plusLongue(texte: string): number {
  const derniere = new Map<string, number>();
  let debut = 0;
  let meilleure = 0;
  for (let fin = 0; fin < texte.length; fin++) {
    const avant = derniere.get(texte[fin]);
    if (avant !== undefined && avant >= debut) debut = avant + 1;
    derniere.set(texte[fin], fin);
    meilleure = Math.max(meilleure, fin - debut + 1);
  }
  return meilleure;
}

@@ code livraison-capacite | Chercher la réponse | ts
Des colis doivent partir **dans l'ordre**, en au plus `jours` jours. `capacite(poids, jours)` renvoie la plus petite capacité quotidienne du camion qui suffit. Cherche la réponse par dichotomie.
@starter
function capacite(poids: number[], jours: number): number {
  return 0;
}
@test Exemple
expect(capacite([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)).toBe(15);
@test Un seul jour, ou un jour par colis
expect([capacite([3, 2, 4], 1), capacite([3, 2, 4], 3), capacite([3, 2, 4], 10)]).toEqual([9, 4, 4]);
@test Grand
const t = performance.now(); expect(capacite(new Array(50_000).fill(1000), 50)).toBe(1_000_000); expect(performance.now() - t).toBeLessThan(1000);
@hint
La réponse est entre le plus gros colis et le total. Écris d'abord `joursNecessaires(capacite)`.
@solution
function capacite(poids: number[], jours: number): number {
  const suffit = (limite: number): boolean => {
    let utilises = 1;
    let charge = 0;
    for (const p of poids) {
      if (charge + p > limite) {
        utilises++;
        charge = 0;
      }
      charge += p;
    }
    return utilises <= jours;
  };

  let bas = 0;
  let haut = 0;
  for (const p of poids) {
    bas = Math.max(bas, p);
    haut += p;
  }
  while (bas < haut) {
    const milieu = Math.floor((bas + haut) / 2);
    if (suffit(milieu)) haut = milieu;
    else bas = milieu + 1;
  }
  return bas;
}

@@ defi fenetre-min | La plus petite fenêtre | ts
`fenetre(texte, lettres)` renvoie la plus courte partie contiguë de `texte` qui contient **toutes** les lettres demandées (avec leurs répétitions), ou `''`. En cas d'égalité, la première. En O(n).
@starter
function fenetre(texte: string, lettres: string): string {
  return '';
}
@test Exemples
expect([fenetre('ADOBECODEBANC', 'ABC'), fenetre('a', 'a'), fenetre('a', 'b')]).toEqual(['BANC', 'a', '']);
@test Avec répétitions
expect([fenetre('aabca', 'aa'), fenetre('a', 'aa'), fenetre('abcab', 'ab')]).toEqual(['aa', '', 'ab']);
@test Rapide
const t = performance.now(); expect(fenetre(`${'x'.repeat(100_000)}abc${'y'.repeat(100_000)}`, 'abc')).toBe('abc'); expect(performance.now() - t).toBeLessThan(800);
@solution
function fenetre(texte: string, lettres: string): string {
  const besoin = new Map<string, number>();
  for (const c of lettres) besoin.set(c, (besoin.get(c) ?? 0) + 1);
  let manque = lettres.length;
  let debut = 0;
  let meilleure: [number, number] | null = null;

  for (let fin = 0; fin < texte.length; fin++) {
    const n = besoin.get(texte[fin]);
    if (n !== undefined) {
      if (n > 0) manque--;
      besoin.set(texte[fin], n - 1);
    }
    while (manque === 0) {
      if (!meilleure || fin - debut < meilleure[1] - meilleure[0]) meilleure = [debut, fin];
      const sortie = besoin.get(texte[debut]);
      if (sortie !== undefined) {
        besoin.set(texte[debut], sortie + 1);
        if (sortie + 1 > 0) manque++;
      }
      debut++;
    }
  }
  return meilleure ? texte.slice(meilleure[0], meilleure[1] + 1) : '';
}

@@ predict dicho-tours
Combien de comparaisons, au plus, pour chercher dans 1 000 éléments triés ?
@answer Environ 10
@wrong Environ 500
@wrong 1 000
@wrong Environ 32
@why 2¹⁰ = 1024 : dix divisions par deux suffisent.

@@ predict dicho-trie
Que faut-il pour utiliser la recherche dichotomique ?
@answer Des données triées
@wrong Des nombres
@wrong Des valeurs uniques
@wrong Une puissance de 2 d'éléments
@why Plus généralement, une condition qui passe une seule fois de faux à vrai.

@@ card fenetre-quoi
Quand penser à une fenêtre glissante ?
@back
Pour la plus longue ou plus courte partie **contiguë** qui respecte une condition.

@@ card cumul
Somme d'un intervalle en O(1) ?
@back
Avec des sommes cumulées : `cumul[b] - cumul[a]`
